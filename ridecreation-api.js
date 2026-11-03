var PLUGIN_VERSION = "0.15.0";

function main() {
    "use strict";

    var checkpointNames = Object.create(null);

    // Configuration flags - Edit these to change behavior
    var RANDOM_PORT = false;  // Set to true to use a random port instead of 8080
    var RANDOM_PORT_MIN = 20000;  // Minimum port when using random selection
    var RANDOM_PORT_MAX = 30000;  // Maximum port when using random selection

    // Select port based on configuration
    var port = 8080;
    if (RANDOM_PORT) {
        port = Math.floor(Math.random() * (RANDOM_PORT_MAX - RANDOM_PORT_MIN + 1)) + RANDOM_PORT_MIN;
        console.log("Random port mode enabled - selected port " + port);
    }

    // Create TCP listener
    var server = network.createListener();

    server.on("connection", function (conn) {
        var buffer = "";

        // Handle incoming data on this connection.
        conn.on("data", function (data) {
            buffer += data;
            if (buffer.length > 1024 * 1024) {
                buffer = "";
                conn.write(JSON.stringify({ success: false, error: "Request exceeds 1 MiB" }) + "\n");
                conn.end();
                return;
            }
            // Split messages on newline; we assume one JSON blob per line.
            var lines = buffer.split("\n");
            // If the last element is not empty, it means the last line is incomplete.
            if (lines[lines.length - 1] !== "") {
                buffer = lines.pop();
            } else {
                // All lines complete; clear the buffer.
                buffer = "";
                // Remove the empty string after the trailing newline.
                lines.pop();
            }

            // Process each complete JSON message.
            for (var i = 0; i < lines.length; i++) {
                (function(line) {
                    var request;
                    try {
                        request = JSON.parse(line);
                    } catch (e) {
                        conn.write(JSON.stringify({
                            success: false,
                            error: "Invalid JSON"
                        }) + "\n");
                        return;
                    }

                    try {
                        processRequest(request, function (response) {
                            conn.write(JSON.stringify(response) + "\n");
                        });
                    } catch (e) {
                        conn.write(JSON.stringify({ success: false, outcome: "unknown", error: "Request failed: " + String(e) }) + "\n");
                    }
                })(lines[i]);
            }
        });
    });

    // Bind to the selected port
    server.listen(port, "127.0.0.1");
    console.log("Ride API server listening on port " + port + ".");

    // Only pieces with an existing server-side name and cardinal geometry.
    // Slope/bank compatibility comes from the game's descriptors below; ride
    // support and placement clearance are separate questions.
    var supportedCardinalPieces = [
        0, 6, 12, 16, 17, 42, 43, 18, 19, 99,
        4, 9, 7, 5, 8, 10, 15, 13, 11, 14,
        32, 20, 22, 44, 33, 21, 23, 45, 1, 3
    ];

    /**
     * Get the track state category for validation rules
     * Based on actual TrackElemType values from OpenRCT2
     */
    function getTrackStateCategory(trackType, isStation) {
        // Map track types to state categories based on OpenRCT2 TrackElemType
        switch(trackType) {
            // Flat pieces
            case 0:  // Flat
            case 99: // Brakes
                return "flat";

            // Station pieces - the game decides begin/middle/end, so treat them all
            // the same for validation purposes.
            case 1:  // EndStation
            case 2:  // BeginStation
            case 3:  // MiddleStation
                return "station";

            // Up slopes
            case 4:  // Up25
                return "up25";
            case 5:  // Up60
                return "up60";

            // Down slopes
            case 10: // Down25
                return "down25";
            case 11: // Down60
                return "down60";

            // Transitions
            case 6:  // FlatToUp25 - ends at up25 angle
                return "up25"; // After this transition, we're at 25° up
            case 12: // FlatToDown25 - ends at down25 angle
                return "down25"; // After this transition, we're at 25° down
            case 9:  // Up25ToFlat
            case 15: // Down25ToFlat
                return "flat"; // These end flat

            case 7:  // Up25ToUp60 - ends in steep up
                return "up60"; // This ends in Up60, not Up25!

            case 8:  // Up60ToUp25 - ends in gentle up
                return "up25"; // This ends in Up25

            case 13: // Down25ToDown60 - ends in steep down
                return "down60"; // This ends in Down60, not Down25!

            case 14: // Down60ToDown25 - ends in gentle down
                return "down25"; // This ends in Down25

            // Turns
            case 16: // LeftQuarterTurn5Tiles
            case 17: // RightQuarterTurn5Tiles
            case 42: // LeftQuarterTurn3Tiles
            case 43: // RightQuarterTurn3Tiles
                return "turn";

            // Banking pieces
            case 18: // FlatToLeftBank
                return "flat_to_left_bank";
            case 19: // FlatToRightBank
                return "flat_to_right_bank";
            case 20: // LeftBankToFlat
            case 21: // RightBankToFlat
                return "flat"; // These end flat
            case 32: // LeftBank
                return "left_bank";
            case 33: // RightBank
                return "right_bank";
            case 22: // BankedLeftQuarterTurn5Tiles
            case 44: // LeftBankedQuarterTurn3Tiles
                return "left_bank"; // Banked left turns maintain left bank
            case 23: // BankedRightQuarterTurn5Tiles
            case 45: // RightBankedQuarterTurn3Tiles
                return "right_bank"; // Banked right turns maintain right bank

            default:
                return "unknown";
        }
    }

    /**
     * Collect all track elements belonging to a ride by scanning the map.
     */
    function getRideTrackElements(rideId) {
        var elements = [];
        for (var x = 0; x < map.size.x; x++) {
            for (var y = 0; y < map.size.y; y++) {
                var tile = map.getTile(x, y);
                if (!tile) continue;
                for (var i = 0; i < tile.numElements; i++) {
                    var elem = tile.elements[i];
                    if (elem.type === 'track' && elem.ride === rideId) {
                        elements.push({ tileX: x, tileY: y, elementIndex: i, element: elem });
                    }
                }
            }
        }
        return elements;
    }

    /**
     * Reconstruct a ride's track state from the game itself, which is the source
     * of truth. Walks the track with the track iterator from the station start,
     * so it works for any station length or position, and stays correct across
     * scenario reloads or if the track is edited in-game.
     *
     * Returns { history, isComplete, elements } or null if the ride has no track.
     * Each history entry has the same shape the MCP server expects (x, y, z,
     * direction, trackType, nextX, nextY, nextZ, nextDirection), plus an exact
     * pixelZ used for removal.
     */
    function getRideTrackState(rideId) {
        var elements = getRideTrackElements(rideId);
        if (elements.length === 0) {
            return { history: [], isComplete: false, elements: [], layoutStatus: "empty" };
        }

        // Start the walk at the BeginStation if there is one, else the first element.
        var start = elements[0];
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].element.trackType === 2) { // BeginStation
                start = elements[i];
                break;
            }
        }

        var iterator = map.getTrackIterator({ x: start.tileX * 32, y: start.tileY * 32 }, start.elementIndex);
        if (!iterator) {
            return null;
        }

        // Walk backwards to the true start of the track (handles tracks without
        // a BeginStation, e.g. built manually in-game). For a closed circuit this
        // walks a full loop and lands back on the start element.
        var originalKey = trackPositionKey(iterator.position);
        var backGuard = 0;
        while (backGuard++ < elements.length) {
            if (!iterator.previous()) break;
            if (trackPositionKey(iterator.position) === originalKey) break;
        }

        var startTileX = Math.round(iterator.position.x / 32);
        var startTileY = Math.round(iterator.position.y / 32);
        var startTileZ = Math.round(iterator.position.z / 8);
        var startDirection = iterator.position.direction;

        var history = [];
        var isComplete = false;
        var guard = 0;
        var visited = {};
        var traversalStatus = "truncated";

        while (guard++ < elements.length) {
            var key = trackPositionKey(iterator.position);
            if (visited[key]) {
                traversalStatus = "ambiguous";
                break;
            }
            visited[key] = true;
            var pos = iterator.position;
            var seg = iterator.segment;

            var entry = {
                x: Math.round(pos.x / 32),
                y: Math.round(pos.y / 32),
                z: Math.round(pos.z / 8),
                pixelZ: Math.round(pos.z),
                direction: pos.direction,
                trackType: seg ? seg.type : 0
            };

            var originTile = map.getTile(Math.round(pos.x / 32), Math.round(pos.y / 32));
            var originElement = null;
            if (originTile) {
                for (var oi = 0; oi < originTile.numElements; oi++) {
                    var candidateElement = originTile.elements[oi];
                    if (candidateElement.type !== "track" || candidateElement.ride !== rideId ||
                        candidateElement.trackType !== entry.trackType || candidateElement.direction !== entry.direction ||
                        candidateElement.sequence > 0) continue;
                    var originIterator = map.getTrackIterator({ x: pos.x, y: pos.y }, oi);
                    if (originIterator && originIterator.position.z === pos.z) {
                        originElement = candidateElement;
                        break;
                    }
                }
            }
            entry.options = originElement ? {
                has_chain_lift: typeof originElement.hasChainLift === "boolean" ? originElement.hasChainLift : null,
                // Only Brakes is validated for speed-setting readback. Reading
                // this getter on other pieces emits an engine error.
                brake_speed: entry.trackType === 99 ? numberOrNull(originElement.brakeBoosterSpeed) : null,
                seat_rotation: typeof originElement.seatRotation === "number" ? originElement.seatRotation : null,
                colour_scheme: typeof originElement.colourScheme === "number" ? originElement.colourScheme : null,
                is_inverted: typeof originElement.isInverted === "boolean" ? originElement.isInverted : null,
                has_cable_lift: typeof originElement.hasCableLift === "boolean" ? originElement.hasCableLift : null
            } : null;

            var nextPos = iterator.nextPosition;
            if (nextPos) {
                entry.nextX = Math.round(nextPos.x / 32);
                entry.nextY = Math.round(nextPos.y / 32);
                entry.nextZ = Math.round(nextPos.z / 8);
                entry.nextDirection = nextPos.direction;
            }

            history.push(entry);

            // Advance to the next piece.
            if (!iterator.next()) {
                traversalStatus = "complete";
                break; // Open end: the track is not a closed circuit.
            }

            // If we came back to the start element, the circuit is closed.
            if (Math.round(iterator.position.x / 32) === startTileX &&
                Math.round(iterator.position.y / 32) === startTileY &&
                Math.round(iterator.position.z / 8) === startTileZ &&
                iterator.position.direction === startDirection) {
                isComplete = true;
                traversalStatus = "complete";
                break;
            }
        }

        // Check every segment origin, not just the component selected above.
        // Iterators normalise multi-tile segments to the same origin.
        var disconnected = false;
        for (var ei = 0; ei < elements.length; ei++) {
            var elementEntry = elements[ei];
            if (elementEntry.element.sequence > 0) continue;
            var elementIterator = map.getTrackIterator(
                { x: elementEntry.tileX * 32, y: elementEntry.tileY * 32 }, elementEntry.elementIndex);
            if (!elementIterator || !visited[trackPositionKey(elementIterator.position)]) {
                disconnected = true;
                break;
            }
        }
        if (disconnected) traversalStatus = "disconnected";
        return { history: history, isComplete: isComplete && traversalStatus === "complete", elements: elements, layoutStatus: traversalStatus };
    }

    function trackPositionKey(position) {
        return position.x + "," + position.y + "," + position.z + "," + position.direction;
    }

    /**
     * Build a lookup of track segment geometry from the game's own catalog.
     * This is static game configuration (not ride state), so it's cached.
     */
    var segmentGeometryCache = null;
    function getSegmentGeometry() {
        if (segmentGeometryCache === null) {
            segmentGeometryCache = {};
            var segs = context.getAllTrackSegments();
            for (var si = 0; si < segs.length; si++) {
                var s = segs[si];
                if (!s || typeof s.type !== "number") continue;
                var clearX = 0, clearY = 0, clearZ = 0;
                if (s.elements && s.elements.length > 0) {
                    clearX = s.elements[0].x || 0;
                    clearY = s.elements[0].y || 0;
                    clearZ = s.elements[0].z || 0;
                }
                segmentGeometryCache[s.type] = {
                    endX: s.endX || 0,
                    endY: s.endY || 0,
                    endZ: s.endZ || 0,
                    beginDirection: s.beginDirection,
                    endDirection: s.endDirection,
                    beginSlope: s.beginSlope,
                    endSlope: s.endSlope,
                    beginBank: s.beginBank,
                    endBank: s.endBank,
                    clearX: clearX,
                    clearY: clearY,
                    clearZ: clearZ
                };
            }
        }
        return segmentGeometryCache;
    }

    // The game's cardinal direction deltas (32 px per tile).
    // 0 = west, 1 = +y, 2 = east, 3 = -y.
    var DIRECTION_DELTAS = [
        { x: -32, y: 0 },
        { x: 0, y: 32 },
        { x: 32, y: 0 },
        { x: 0, y: -32 }
    ];

    // Rotate an (x, y) offset by a cardinal direction, matching the game's CoordsXY.rotate.
    function rotateOffset(x, y, dir) {
        switch (dir & 3) {
            case 0: return { x: x, y: y };
            case 1: return { x: y, y: -x };
            case 2: return { x: -x, y: -y };
            default: return { x: -y, y: x };
        }
    }

    /**
     * Predict where a track piece of the given type lands when placed at tile p
     * heading in direction d. Mirrors the game's own trackBlockGetNext math
     * using the game's per-piece descriptors, so no hardcoded geometry is needed.
     * p.z is in tile height units; the result is tile coordinates.
     */
    function predictEndpoint(p, d, trackType) {
        var geo = getSegmentGeometry()[trackType];
        if (!geo) return null;

        var end = rotateOffset(geo.endX, geo.endY, d);
        var clear = rotateOffset(geo.clearX, geo.clearY, (d + 2) & 3);

        var endBlockX = p.x * 32 + end.x + clear.x;
        var endBlockY = p.y * 32 + end.y + clear.y;

        // Placement applies the z adjustment (down pieces), so the piece's baseZ
        // is not p.z*8; the game then computes the exit z as baseZ - clearZ + endZ.
        var baseZ = p.z * 8 + getZAdjustment(trackType);
        var exitZ = baseZ - geo.clearZ + geo.endZ;

        var newDir = (d + geo.endDirection) & 3;
        var delta = DIRECTION_DELTAS[newDir];

        return {
            x: Math.round((endBlockX + delta.x) / 32),
            y: Math.round((endBlockY + delta.y) / 32),
            z: Math.round(exitZ / 8),
            direction: newDir
        };
    }

    /**
     * Predict the landing tile for every valid piece from a given position.
     * Returns a map keyed by track type.
     */
    function buildValidPieceEndpoints(position, validPieces) {
        var endpoints = {};
        if (!position) return endpoints;
        for (var vi = 0; vi < validPieces.length; vi++) {
            var ep = predictEndpoint(position, position.direction, validPieces[vi]);
            if (ep) endpoints[validPieces[vi]] = ep;
        }
        return endpoints;
    }

    /**
     * Calculate Z adjustment for track placement.
     * In OpenRCT2, 'z' for trackplace refers to the baseZ (lowest point).
     * For downward pieces, this is the exit height.
     */
    function getZAdjustment(trackType) {
        switch (trackType) {
            case 10: // Down25 (Gentle down)
                return -16; // Drops 2 units
            case 11: // Down60 (Steep down)
                return -32; // Drops 4 units
            case 12: // FlatToDown25
            case 13: // Down25ToDown60
            case 15: // Down25ToFlat
                return -8; // Drops 1 unit
            default:
                return 0;
        }
    }

    function gameErrorDetails(result) {
        return { code: result && result.error !== undefined ? result.error : null,
            title: result && result.errorTitle || null, message: result && result.errorMessage || null };
    }

    function gameError(result) {
        if (!result) return "No result from game";
        var details = [];
        if (result.errorTitle) details.push(result.errorTitle);
        if (result.errorMessage) details.push(result.errorMessage);
        if (!details.length && result.error) details.push(String(result.error));
        return details.join(": ") || "Unknown game error";
    }

    function numberOrNull(value) {
        return typeof value === "number" && Number.isFinite(value) ? value : null;
    }

    function readPosition(value) {
        if (!value || numberOrNull(value.x) === null || numberOrNull(value.y) === null ||
            numberOrNull(value.z) === null) return null;
        return { x: value.x / 32, y: value.y / 32, z: value.z / 8 };
    }

    function stationPosition(value) {
        if (value === null) return { status: "absent", position: null };
        var position = readPosition(value);
        if (!position) return { status: "unknown", position: null };
        // OpenRCT2 may expose a null coordinate sentinel instead of JS null.
        if (position.x < 0 || position.y < 0 || position.x >= map.size.x || position.y >= map.size.y) {
            return { status: "absent", position: null };
        }
        position.direction = numberOrNull(value.direction);
        return { status: "present", position: position };
    }

    function readRideStations(ride) {
        if (!Array.isArray(ride.stations)) return null;
        var stations = [];
        ride.stations.forEach(function (station, index) {
            var start = stationPosition(station.start);
            if (start.status === "absent") return;
            stations.push({ index: index, start: start, length: numberOrNull(station.length),
                entrance: stationPosition(station.entrance), exit: stationPosition(station.exit) });
        });
        return stations;
    }

    function rideObjectResearch(object, rideTypes) {
        var research = typeof park !== "undefined" ? park.research : null;
        return rideTypes.map(function (rideType) {
            function matches(item) {
                return item.type === "ride" && item.rideType === rideType && item.object === object.index;
            }
            var status = "unknown";
            if (research && Array.isArray(research.inventedItems) && research.inventedItems.some(matches)) {
                status = "invented";
            } else if (research && Array.isArray(research.uninventedItems) && research.uninventedItems.some(matches)) {
                status = "uninvented";
            }
            return { ride_type: rideType, status: status };
        });
    }

    function readParkStatus() {
        var research = park.research;
        var objective = scenario.objective;
        return {
            park_name: park.name, game_mode: context.mode, game_paused: context.paused,
            game_speed: context.gameSpeed, observed_game_tick: numberOrNull(date.ticksElapsed),
            date: { day: date.day, month: date.month, year: date.year, months_elapsed: date.monthsElapsed },
            park: {
                open: park.getFlag("open"), no_money: park.getFlag("noMoney"),
                free_park_entry: park.getFlag("freeParkEntry"), unlock_all_prices: park.getFlag("unlockAllPrices"),
                cash_raw: numberOrNull(park.cash), bank_loan_raw: numberOrNull(park.bankLoan),
                max_bank_loan_raw: numberOrNull(park.maxBankLoan), entrance_fee_raw: numberOrNull(park.entranceFee),
                rating: numberOrNull(park.rating), guests: numberOrNull(park.guests),
                value_raw: numberOrNull(park.value), company_value_raw: numberOrNull(park.companyValue)
            },
            scenario: { name: scenario.name, status: scenario.status, objective: {
                type: objective.type, guests: numberOrNull(objective.guests), year: numberOrNull(objective.year),
                length: numberOrNull(objective.length), excitement_raw: numberOrNull(objective.excitement),
                park_value_raw: numberOrNull(objective.parkValue), monthly_income_raw: numberOrNull(objective.monthlyIncome)
            } },
            research: research ? {
                funding: numberOrNull(research.funding), priorities: research.priorities,
                stage: research.stage, progress: numberOrNull(research.progress),
                invented_count: Array.isArray(research.inventedItems) ? research.inventedItems.length : null,
                uninvented_count: Array.isArray(research.uninventedItems) ? research.uninventedItems.length : null
            } : null,
            limitations: ["Financial and objective values with _raw retain scripting API units.",
                "Only fields relevant to the objective type should be interpreted as requirements.",
                "This observes the game status, not a forecast or independent proof of objective completion."]
        };
    }

    function readStationAccess(ride, radius) {
        var stations = readRideStations(ride);
        var areas = [];
        var paths = [];
        var visited = {};
        (stations || []).forEach(function (station) {
            [station.start, station.entrance, station.exit].forEach(function (entry) {
                if (entry.status !== "present") return;
                var centre = entry.position;
                var cx = Math.floor(centre.x), cy = Math.floor(centre.y);
                areas.push({ x: cx, y: cy, radius: radius });
                for (var x = Math.max(0, cx - radius); x <= Math.min(map.size.x - 1, cx + radius); x++) {
                    for (var y = Math.max(0, cy - radius); y <= Math.min(map.size.y - 1, cy + radius); y++) {
                        var key = x + "," + y;
                        if (visited[key]) continue;
                        visited[key] = true;
                        var tile = map.getTile(x, y);
                        if (!tile) continue;
                        for (var i = 0; i < tile.numElements; i++) {
                            var el = tile.elements[i];
                            if (el.type !== "footpath") continue;
                            paths.push(pathObservation(el, x, y));
                        }
                    }
                }
            });
        });
        return { ride_id: ride.id, stations: stations, observed_areas: areas, paths: paths,
            guest_access: "unknown", limitations: [
                "Path observations are bounded and retain all heights and ghosts.",
                "Nearby paths do not establish entrance, queue, exit or public-network connectivity.",
                "No pathfinding or guest access guarantee is provided."] };
    }

    function moneyOrNull(value) {
        // money64 undefined is outside JS's safe range. Also exclude the legacy
        // money32 sentinel; neither is an actual negative operating result.
        return Number.isSafeInteger(value) && value !== -2147483648 ? value : null;
    }

    function readRideFinances(rideId) {
        if (context.mode !== "normal" || !Number.isInteger(rideId) || rideId < 0) {
            throw new Error("Expected a normal park and nonnegative ride ID");
        }
        var ride = map.getRide(rideId);
        if (!ride) throw new Error("Ride not found");
        var noMoney = park.getFlag("noMoney");
        var freeEntry = park.getFlag("freeParkEntry");
        var unlockAll = park.getFlag("unlockAllPrices");
        var classification = typeof ride.classification === "string" ? ride.classification : null;
        var admissionUnlocked = freeEntry || unlockAll;
        var object = ride.object;
        var prices = Array.isArray(ride.price) ? ride.price.map(function (price, index) {
            var allowed = classification === "ride" || classification === "stall" || classification === "facility"
                ? !noMoney && (index !== 0 || classification !== "ride" || admissionUnlocked) : null;
            return { index: index,
                kind: classification === "ride" ? (index === 0 ? "admission" : "on_ride_photo") : "item_or_facility",
                price_raw: moneyOrNull(price), charging_allowed: allowed,
                effective_price_raw: allowed === false ? 0 : allowed === true ? moneyOrNull(price) : null,
                // Common-price flags are not exposed by the scripting API.
                // Ordinary ride admission has no shop item and cannot propagate.
                shared_price_status: classification === "ride" && index === 0 && object && object.shopItem === 255
                    ? "not_applicable" : "unknown" };
        }) : null;
        var cost = moneyOrNull(ride.runningCost);
        var result = { ride_id: rideId, name: ride.name, ride_type: ride.type, classification: classification,
            ride_status: ride.status, game_paused: context.paused, observed_game_tick: numberOrNull(date.ticksElapsed),
            money_units: { raw_per_base_currency_unit: 10, base_currency: "GBP", display_currency_conversion: "not_applied" },
            charging: { no_money: noMoney, free_park_entry: freeEntry, unlock_all_prices: unlockAll,
                ride_admission_prices_unlocked: admissionUnlocked, park_entrance_fee_raw: moneyOrNull(park.entranceFee) },
            prices: prices, total_customers: numberOrNull(ride.totalCustomers),
            running_cost_per_fortnight_raw: cost, running_cost_per_hour_raw: cost === null ? null : moneyOrNull(cost * 16),
            income_per_hour_estimate_raw: moneyOrNull(ride.incomePerHour),
            profit_per_hour_estimate_raw: moneyOrNull(ride.profit), total_profit_raw: moneyOrNull(ride.totalProfit),
            total_revenue_raw: null,
            limitations: [
                "Raw money uses 10 units per GBP, not cents. Display currencies may apply conversion.",
                "Income/profit per hour are game estimates from recent customers, updated about every 960 game ticks. Income subtracts merchandise costs, not upkeep; profit also subtracts upkeep.",
                "Running cost is billed fortnightly; the game's hourly estimate multiplies it by 16. These are game accounting periods, not wall-clock billing guarantees.",
                "Total profit is the engine's lifetime counter, not gross revenue. Lifetime gross revenue is not exposed. Null values are unavailable, not zero.",
                "Effective prices describe park rules, not every guest payment: vouchers, free rides and purchases can differ.",
                "Common-price flags are unavailable. Item/photo prices may propagate to other rides; unchanged values do not establish that sharing is disabled."
            ] };
        result.unavailable_fields = ["running_cost_per_fortnight_raw", "running_cost_per_hour_raw",
            "income_per_hour_estimate_raw", "profit_per_hour_estimate_raw", "total_profit_raw", "total_revenue_raw"
        ].filter(function (key) { return result[key] === null; });
        return result;
    }

    function observeRidePrices() {
        var prices = {};
        map.rides.forEach(function (ride) {
            prices[ride.id] = Array.isArray(ride.price) ? ride.price.map(moneyOrNull) : null;
        });
        return prices;
    }

    function observedPriceChanges(before, after) {
        var changes = [];
        var complete = Object.keys(before).length === Object.keys(after).length;
        Object.keys(before).forEach(function (id) {
            if (!before[id] || !after[id] || before[id].length !== after[id].length) { complete = false; return; }
            before[id].forEach(function (price, index) {
                if (price === null || after[id][index] === null) { complete = false; return; }
                if (price !== after[id][index]) changes.push({ ride_id: Number(id), price_index: index,
                    before_raw: price, after_raw: after[id][index] });
            });
        });
        return { changes: changes, complete: complete };
    }

    function setRidePrice(params, callback) {
        var before, allPrices;
        try {
            if (!Number.isInteger(params.price_raw) || params.price_raw < 0 || params.price_raw > 200 ||
                !Number.isInteger(params.expected_price_raw) || params.expected_price_raw < 0 ||
                (params.price_index !== 0 && params.price_index !== 1) ||
                typeof params.allow_shared_price_changes !== "boolean") {
                throw new Error("Expected raw price 0-200, current expected_price_raw, price_index 0/1 and boolean shared-price consent");
            }
            before = readRideFinances(params.rideId);
            var selected = before.prices && before.prices[params.price_index];
            if (!selected || selected.price_raw === null) throw new Error("Selected price is unavailable or not active for this ride");
            if (selected.price_raw !== params.expected_price_raw) throw new Error("Stale expected_price_raw; inspect current finances");
            if (selected.charging_allowed !== true) throw new Error("Charging is disabled by park money/admission rules or is unknown");
            if (selected.shared_price_status !== "not_applicable" && !params.allow_shared_price_changes) {
                throw new Error("Item/photo/facility prices may affect other rides; explicit allow_shared_price_changes is required");
            }
            allPrices = observeRidePrices();
        } catch (error) {
            callback({ success: false, error: String(error) }); return;
        }
        context.executeAction("ridesetprice", { ride: params.rideId, price: params.price_raw,
            isPrimaryPrice: params.price_index === 0 }, function (result) {
            if (!result || result.error) {
                callback({ success: false, outcome: result ? "rejected" : "unknown",
                    error: gameError(result), error_details: gameErrorDetails(result) }); return;
            }
            var payload = { ride_id: params.rideId, price_index: params.price_index, requested_price_raw: params.price_raw,
                observed_before: before, observed_after: null, stored_price_matches_request: null,
                observed_price_changes: null, price_change_observations_complete: false,
                limitations: ["Price differences are before/after observations, not attribution against concurrent edits.",
                    "Only active, scripting-visible price slots are observed. The engine may also update hidden photo-price slots."] };
            try {
                payload.observed_after = readRideFinances(params.rideId);
                var price = payload.observed_after.prices && payload.observed_after.prices[params.price_index];
                payload.stored_price_matches_request = price && price.price_raw !== null ? price.price_raw === params.price_raw : null;
                var observed = observedPriceChanges(allPrices, observeRidePrices());
                payload.observed_price_changes = observed.changes;
                payload.price_change_observations_complete = observed.complete;
            } catch (error) { payload.state_error = String(error); }
            callback({ success: true, payload: payload });
        });
    }

    function pathObservation(el, x, y) {
        return { x: x, y: y, base_z: el.baseZ / 8, clearance_z: el.clearanceZ / 8,
            edges: numberOrNull(el.edges), slope_direction: numberOrNull(el.slopeDirection),
            addition_object: numberOrNull(el.addition),
            is_queue: typeof el.isQueue === "boolean" ? el.isQueue : null,
            ride_id: el.isQueue === true ? numberOrNull(el.ride) : null,
            station: el.isQueue === true ? numberOrNull(el.station) : null,
            is_ghost: typeof el.isGhost === "boolean" ? el.isGhost : null,
            surface_object: numberOrNull(el.surfaceObject), railings_object: numberOrNull(el.railingsObject),
            legacy_object: numberOrNull(el.object) };
    }

    function validMapPoint(x, y) {
        return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < map.size.x && y < map.size.y;
    }

    function readPathArea(x, y, radius) {
        var paths = [];
        for (var mx = Math.max(0, x - radius); mx <= Math.min(map.size.x - 1, x + radius); mx++) {
            for (var my = Math.max(0, y - radius); my <= Math.min(map.size.y - 1, y + radius); my++) {
                var tile = map.getTile(mx, my);
                if (!tile) continue;
                tile.elements.forEach(function (el) {
                    if (el.type === "footpath") paths.push(pathObservation(el, mx, my));
                });
            }
        }
        return { x: x, y: y, radius: radius, paths: paths, guest_access: "unknown",
            limitations: "Bounded path observations at all heights, including ghosts. Adjacency is not public-network or guest-access proof." };
    }

    function pathActionResponse(params, before, result, callback) {
        if (!result || result.error) {
            callback({ success: false, outcome: result ? "rejected" : "unknown",
                error: gameError(result), error_details: gameErrorDetails(result) });
            return;
        }
        var payload = { cost_raw: numberOrNull(result.cost), observed_before: before, observed_after: null };
        try { payload.observed_after = readPathArea(params.x, params.y, 1); }
        catch (error) { payload.state_error = String(error); }
        callback({ success: true, payload: payload });
    }

    function stationBuildingContext(rideId) {
        if (context.mode !== "normal" || !Number.isInteger(rideId) || rideId < 0) {
            throw new Error("Expected a normal park and nonnegative ride ID");
        }
        var ride = map.getRide(rideId);
        if (!ride) throw new Error("Ride not found");
        if (ride.status !== "closed" || ride.guestCount !== 0) {
            throw new Error("Station building edits require a closed ride with known zero guests");
        }
        var stations = readRideStations(ride);
        if (!stations || stations.length !== 1 || stations[0].index !== 0 ||
            stations[0].start.status !== "present") {
            throw new Error("Exactly one known station (index 0) is supported");
        }
        return { ride: ride, station: stations[0] };
    }

    function placeStationBuilding(params, callback) {
        var selected, before;
        try {
            selected = stationBuildingContext(params.rideId);
            if ((params.building !== "entrance" && params.building !== "exit") ||
                !validMapPoint(params.x, params.y) || !Number.isInteger(params.direction) ||
                params.direction < 0 || params.direction > 3) {
                throw new Error("Expected entrance or exit, a map tile and direction 0-3");
            }
            var previous = selected.station[params.building];
            if (previous.status === "unknown") throw new Error("Current building position is unknown");
            var expected = params.expected_position;
            if (previous.status === "present") {
                if (!expected || ["x", "y", "z", "direction"].some(function (key) {
                    return expected[key] !== previous.position[key];
                })) throw new Error("Moving an existing building requires its exact current expected_position");
            } else if (expected != null) {
                throw new Error("Expected building no longer exists");
            }
            // The game action does not validate adjacency to station track. Do not
            // create a building which is assigned to the station but cannot board guests.
            var delta = DIRECTION_DELTAS[params.direction];
            var sx = params.x + delta.x / 32, sy = params.y + delta.y / 32;
            var tile = validMapPoint(sx, sy) ? map.getTile(sx, sy) : null;
            var stationZ = selected.station.start.position.z * 8;
            if (!tile || !tile.elements.some(function (el) {
                return el.type === "track" && el.ride === params.rideId &&
                    (el.trackType === 1 || el.trackType === 2 || el.trackType === 3) &&
                    el.station === 0 && el.baseZ === stationZ && !el.isGhost &&
                    el.direction % 2 !== params.direction % 2;
            })) throw new Error("Building must face adjacent station-0 track at station height");
            var target = map.getTile(params.x, params.y);
            if (!target || target.elements.some(function (el) {
                return el.type !== "surface" && el.type !== "track";
            })) throw new Error("Target must not replace paths, buildings or scenery");
            before = readStationAccess(selected.ride, 1);
        } catch (error) {
            callback({ success: false, error: String(error) }); return;
        }
        context.executeAction("rideentranceexitplace", { x: params.x * 32, y: params.y * 32,
            direction: params.direction, ride: params.rideId, station: 0, isExit: params.building === "exit"
        }, function (result) {
            if (!result || result.error) {
                callback({ success: false, outcome: result ? "rejected" : "unknown",
                    error: gameError(result), error_details: gameErrorDetails(result) }); return;
            }
            var payload = { ride_id: params.rideId, building: params.building, cost_raw: numberOrNull(result.cost),
                observed_before: before, observed_after: null };
            try { payload.observed_after = readStationAccess(selected.ride, 1); }
            catch (error) { payload.state_error = String(error); }
            callback({ success: true, payload: payload });
        });
    }

    function placeEntranceExit(params, callback) {
        var selected;
        try { selected = stationBuildingContext(params.rideId); }
        catch (error) { callback({ success: false, error: String(error) }); return; }
        var placed = { entrance: null, exit: null };
        var confirmed = 0;
        var pieces = [];
        for (var x = 0; x < map.size.x; x++) {
            for (var y = 0; y < map.size.y; y++) {
                var tile = map.getTile(x, y);
                if (!tile) continue;
                tile.elements.forEach(function (el) {
                    if (el.type === "track" && el.ride === params.rideId && el.station === 0 &&
                        (el.trackType === 1 || el.trackType === 2 || el.trackType === 3) && !el.isGhost) {
                        pieces.push({ x: x, y: y, direction: el.direction });
                    }
                });
            }
        }
        function next(buildingIndex, pieceIndex) {
            if (buildingIndex === 2) {
                if (placed.entrance && placed.exit) {
                    callback({ success: true, payload: placed });
                } else if (placed.entrance || placed.exit) {
                    placed.warning = "Only partially successful - could not place both station buildings";
                    callback({ success: true, payload: placed });
                } else {
                    callback({ success: false, error: "No valid positions found near station pieces" });
                }
                return;
            }
            var building = buildingIndex === 0 ? "entrance" : "exit";
            var current = selected.station[building];
            if (current.status === "unknown") {
                callback({ success: false, outcome: "rejected", error: "Current building position is unknown",
                    error_details: { confirmed_steps: confirmed, entrance_exit: placed } }); return;
            }
            if (current.status === "present") {
                placed[building] = current.position;
                next(buildingIndex + 1, 0); return;
            }
            if (pieceIndex === pieces.length) { next(buildingIndex + 1, 0); return; }
            var piece = pieces[pieceIndex];
            var direction = piece.direction % 2 === 0 ? (buildingIndex === 0 ? 1 : 3) : (buildingIndex === 0 ? 2 : 0);
            var delta = DIRECTION_DELTAS[direction];
            var target = { rideId: params.rideId, building: building, direction: direction,
                x: piece.x - delta.x / 32, y: piece.y - delta.y / 32 };
            placeStationBuilding(target, function (response) {
                if (!response.success) {
                    if (response.outcome === "unknown") {
                        response.error_details = Object.assign({}, response.error_details,
                            { confirmed_steps: confirmed, entrance_exit: placed });
                        callback(response); return;
                    }
                    next(buildingIndex, pieceIndex + 1); return;
                }
                confirmed++;
                placed[building] = { x: target.x, y: target.y, direction: direction };
                next(buildingIndex + 1, 0);
            });
        }
        next(0, 0);
    }

    /**
     * Processes a request object and calls the callback with the response.
     *
     * Supported endpoints include:
     * - listAllRides
     * - deleteAllRides
     * - startRideTest
     * - getRideStats
     * - createRide
     * - placeTrackPiece
     * - placeEntranceExit (place entrance and exit for a ride's station)
     * - deleteLastTrackPiece (remove the most recently placed track piece)
     * - getValidNextPieces (new endpoint for track validation)
     * - getTrackCircuit (new endpoint that takes a rideId)
     *
     * @param {Object} request - The parsed JSON request.
     * @param {Function} callback - The function to call with the response.
     */
    function processRequest(request, callback, snapshot) {
        if (!request || typeof request !== "object" || Array.isArray(request) ||
            typeof request.endpoint !== "string" ||
            (request.params !== undefined && (!request.params || typeof request.params !== "object" || Array.isArray(request.params)))) {
            callback({ success: false, error: "Invalid request envelope" });
            return;
        }
        request.params = request.params || {};
        if (!request.endpoint) {
            callback({
                success: false,
                error: "Missing endpoint"
            });
            return;
        }

        switch (request.endpoint) {
            case "listAllRides":
                var ridesArray = [];
                map.rides.forEach(function (ride) {
                    ridesArray.push({
                        id: ride.id,
                        name: ride.name,
                        type: ride.type
                    });
                });
                callback({
                    success: true,
                    payload: ridesArray
                });
                break;

            case "getRideFinances":
                try { callback({ success: true, payload: readRideFinances(request.params.rideId) }); }
                catch (error) { callback({ success: false, error: String(error) }); }
                break;

            case "setRidePrice":
                setRidePrice(request.params, callback);
                break;

            case "getAllTrackSegments":
                // Retrieve all available track segments.
                var segments = context.getAllTrackSegments();
                var result = segments.map(function(seg) {
                    return {
                        type: seg.type,
                        description: seg.description,
                        trackGroup: seg.trackGroup,
                        length: seg.length,
                        // Add more properties to understand track types
                        beginZ: seg.beginZ,
                        endZ: seg.endZ,
                        beginDirection: seg.beginDirection,
                        endDirection: seg.endDirection,
                        beginSlope: seg.beginSlope,
                        endSlope: seg.endSlope,
                        endX: seg.endX,
                        endY: seg.endY,
                        beginBank: seg.beginBank,
                        endBank: seg.endBank
                    };
                });
                callback({
                    success: true,
                    payload: result
                });
                break;

            case "getMapArea":
                var params = request.params || {};
                if (!Number.isInteger(params.x) || !Number.isInteger(params.y) ||
                    !Number.isInteger(params.radius) || params.radius < 0 || params.radius > 8 ||
                    params.x < 0 || params.y < 0 || params.x >= map.size.x || params.y >= map.size.y) {
                    callback({ success: false, error: "Invalid map centre or radius (0–8)" });
                    return;
                }
                var tiles = [];
                for (var mx = Math.max(0, params.x - params.radius); mx <= Math.min(map.size.x - 1, params.x + params.radius); mx++) {
                    for (var my = Math.max(0, params.y - params.radius); my <= Math.min(map.size.y - 1, params.y + params.radius); my++) {
                        var mapTile = map.getTile(mx, my);
                        if (!mapTile) continue;
                        var mapElements = [];
                        for (var mi = 0; mi < mapTile.numElements; mi++) {
                            var mapElement = mapTile.elements[mi];
                            var entry = {
                                type: mapElement.type,
                                base_z: mapElement.baseZ / 8,
                                clearance_z: mapElement.clearanceZ / 8,
                                is_ghost: mapElement.isGhost
                            };
                            if (mapElement.type === "surface") {
                                entry.slope = mapElement.slope;
                                entry.water_height_raw = mapElement.waterHeight;
                            }
                            if (mapElement.type === "track") entry.ride_id = mapElement.ride;
                            mapElements.push(entry);
                        }
                        tiles.push({ x: mx, y: my, elements: mapElements });
                    }
                }
                callback({ success: true, payload: { x: params.x, y: params.y, radius: params.radius, tiles: tiles } });
                break;

            case "setRideVehicles":
                var vehicleParams = request.params || {};
                if (!Number.isInteger(vehicleParams.rideId) ||
                    (vehicleParams.setting !== "trains" && vehicleParams.setting !== "cars_per_train") ||
                    !Number.isInteger(vehicleParams.value) || vehicleParams.value < 1 || vehicleParams.value > 255) {
                    callback({ success: false, error: "Invalid ride ID, vehicle setting, or value (1–255)" });
                    return;
                }
                context.executeAction("ridesetvehicle", {
                    ride: vehicleParams.rideId,
                    type: vehicleParams.setting === "trains" ? 0 : 1,
                    value: vehicleParams.value,
                    colour: 0
                }, function (result) {
                    if (!result || result.error) {
                        var detail = result && (result.errorMessage || result.errorTitle || result.error);
                        callback({ success: false, outcome: result ? "rejected" : "unknown", error_details: gameErrorDetails(result),
                            error: "Failed to set ride vehicles: " + (detail || "Unknown error") });
                    } else {
                        callback({ success: true, payload: {
                            ride_id: vehicleParams.rideId, setting: vehicleParams.setting, value: vehicleParams.value
                        } });
                    }
                });
                break;

            case "getLoadedRideObjects":
                if (typeof context.getAllObjects !== "function") {
                    callback({ success: false, error: "Loaded ride object discovery is unavailable in this scripting API" });
                    return;
                }
                callback({ success: true, payload: context.getAllObjects("ride").map(function (object) {
                    var rideTypes = object.rideType.filter(function (type, index, all) {
                        return Number.isInteger(type) && type >= 0 && type < 255 && all.indexOf(type) === index;
                    });
                    return { index: object.index, identifier: object.identifier, name: object.name,
                        ride_types: rideTypes, min_cars_in_train: object.minCarsInTrain,
                        max_cars_in_train: object.maxCarsInTrain, track_support: "unknown",
                        research: rideObjectResearch(object, rideTypes) };
                }) });
                break;

            case "getParkStatus":
                if (context.mode !== "normal" || typeof park === "undefined" ||
                    typeof scenario === "undefined" || typeof date === "undefined") {
                    callback({ success: false, error: "Load a park in normal game mode before reading park status" });
                    return;
                }
                callback({ success: true, payload: readParkStatus() });
                break;

            case "getRideStationAccess":
                var accessParams = request.params;
                if (!Number.isInteger(accessParams.rideId) || accessParams.rideId < 0 ||
                    !Number.isInteger(accessParams.radius) || accessParams.radius < 0 || accessParams.radius > 4) {
                    callback({ success: false, error: "Expected a nonnegative rideId and radius 0-4" });
                    return;
                }
                var accessRide = map.getRide(accessParams.rideId);
                if (!accessRide) {
                    callback({ success: false, error: "Ride not found" });
                    return;
                }
                callback({ success: true, payload: readStationAccess(accessRide, accessParams.radius) });
                break;

            case "getPathObjects":
                callback({ success: true, payload: {
                    surfaces: context.getAllObjects("footpath_surface").map(function (obj) {
                        return { index: obj.index, identifier: obj.identifier, name: obj.name, flags_raw: obj.flags };
                    }),
                    railings: context.getAllObjects("footpath_railings").map(function (obj) {
                        return { index: obj.index, identifier: obj.identifier, name: obj.name };
                    })
                } });
                break;

            case "getPathArea":
                var pa = request.params;
                if (!validMapPoint(pa.x, pa.y) || !Number.isInteger(pa.radius) || pa.radius < 0 || pa.radius > 8) {
                    callback({ success: false, error: "Expected a map tile and radius 0-8" }); return;
                }
                callback({ success: true, payload: readPathArea(pa.x, pa.y, pa.radius) });
                break;

            case "placePathTile":
            case "removePathTile":
                var pp = request.params;
                if (context.mode !== "normal" || !validMapPoint(pp.x, pp.y) ||
                    !Number.isInteger(pp.z) || pp.z < 0 || pp.z > 254 || pp.z % 2 !== 0) {
                    callback({ success: false, error: "Expected normal park mode, map tile and even Z height (units of 8)" }); return;
                }
                var targetTile = map.getTile(pp.x, pp.y);
                if (!targetTile) { callback({ success: false, error: "Tile unavailable" }); return; }
                var beforePaths = readPathArea(pp.x, pp.y, 1);
                if (request.endpoint === "removePathTile") {
                    var matching = beforePaths.paths.filter(function (p) {
                        return p.x === pp.x && p.y === pp.y && p.base_z === pp.z;
                    });
                    var selectedPath = matching.length === 1 ? matching[0] : null;
                    var expected = pp.expected_path;
                    if (!selectedPath || selectedPath.is_ghost !== false || selectedPath.slope_direction !== null ||
                        selectedPath.addition_object !== null ||
                        !expected || Object.keys(expected).length !== Object.keys(selectedPath).length ||
                        Object.keys(selectedPath).some(function (key) { return expected[key] !== selectedPath[key]; })) {
                        callback({ success: false, error: "Expected exact current observation of one flat, non-ghost path; target changed or unsupported" }); return;
                    }
                    context.executeAction("footpathremove", { x: pp.x * 32, y: pp.y * 32, z: pp.z * 8 }, function (result) {
                        pathActionResponse(pp, beforePaths, result, callback);
                    });
                    return;
                }
                var surfaces = targetTile.elements.filter(function (el) { return el.type === "surface"; });
                if (targetTile.elements.some(function (el) {
                        return el.type !== "surface" && (el.type !== "track" || el.baseZ < pp.z * 8 + 32);
                    }) || surfaces.length !== 1 ||
                    surfaces[0].isGhost || surfaces[0].slope !== 0 || surfaces[0].waterHeight !== 0 || surfaces[0].baseZ !== pp.z * 8) {
                    callback({ success: false, error: "Only flat, dry ground without existing paths or scenery is supported; overhead track must leave path clearance" }); return;
                }
                function loadedIndex(type, index) {
                    return Number.isInteger(index) && context.getAllObjects(type).some(function (obj) { return obj.index === index; });
                }
                if (typeof pp.is_queue !== "boolean" || !loadedIndex("footpath_surface", pp.surface_object) ||
                    !loadedIndex("footpath_railings", pp.railings_object)) {
                    callback({ success: false, error: "Choose loaded surface/railings indices and a boolean is_queue" }); return;
                }
                context.executeAction("footpathplace", { x: pp.x * 32, y: pp.y * 32, z: pp.z * 8,
                    direction: 255, object: pp.surface_object, railingsObject: pp.railings_object,
                    slopeType: 0, slopeDirection: 0, constructFlags: pp.is_queue ? 1 : 0 }, function (result) {
                    pathActionResponse(pp, beforePaths, result, callback);
                });
                break;

            case "savePark":
                var filename = request.params.filename;
                if (context.mode !== "normal" || typeof filename !== "string" ||
                    !/^mcp-[a-zA-Z0-9_-]{1,48}-[a-f0-9]{32}$/.test(filename)) {
                    callback({ success: false, error: "Expected a fresh MCP checkpoint basename; paths and existing save names are not accepted" }); return;
                }
                // saveGame returns void: acknowledgement is not proof of disk persistence.
                if (checkpointNames[filename]) {
                    callback({ success: false, error: "Checkpoint basename already requested in this session" }); return;
                }
                checkpointNames[filename] = true;
                context.saveGame({ filename: filename });
                callback({ success: true, payload: { filename: filename + ".park", save_requested: true,
                    file_written: "unknown", limitations: "The game save API returns no write result. Verify the file before relying on this checkpoint. Never blindly retry an unknown request." } });
                break;

            case "getPluginInfo":
                callback({ success: true, payload: {
                    version: PLUGIN_VERSION,
                    protocol_version: 1,
                    api_version: context.apiVersion,
                    map_size: { x: map.size.x, y: map.size.y },
                    game_paused: context.paused,
                    park_name: typeof park !== "undefined" ? park.name : null,
                    capabilities: ["coaster_snapshot", "close_ride", "endpoint_removal", "cardinal_geometry",
                        "guarded_append", "removal_preview", "track_options_readback", "loaded_ride_objects",
                        "park_status", "station_access_observations", "ride_object_research", "train_observations", "explicit_ride_reset",
                        "flat_paths", "open_ride", "checkpoint_request", "explicit_station_buildings", "ride_finances", "ride_prices"]
                } });
                break;

            case "deleteRide":
                if (!request.params || typeof request.params.rideId !== "number") {
                    callback({ success: false, error: "Missing or invalid parameter: rideId" });
                    return;
                }
                var deleteRideId = request.params.rideId;
                context.executeAction("ridedemolish", { ride: deleteRideId, modifyType: 0 }, function (result) {
                    if (!result || result.error) {
                        var detail = result && (result.errorMessage || result.errorTitle || result.error);
                        callback({ success: false, outcome: result ? "rejected" : "unknown", error_details: gameErrorDetails(result),
                            error: "Failed to delete ride: " + (detail || "Unknown error") });
                    } else {
                        callback({ success: true, payload: { rideId: deleteRideId } });
                    }
                });
                break;

            case "deleteAllRides":
                var ridesToDelete = [];
                map.rides.forEach(function (ride) {
                    ridesToDelete.push(ride);
                });
                if (ridesToDelete.length === 0) {
                    callback({
                        success: true,
                        payload: "No rides to delete."
                    });
                    return;
                }
                var failedDeletions = [];
                function deleteNext() {
                    if (ridesToDelete.length === 0) {
                        callback({
                            success: failedDeletions.length === 0,
                            outcome: failedDeletions.length ? "partial" : "confirmed",
                            error: failedDeletions.length ? "Failed to demolish rides: " + failedDeletions.join(", ") : undefined,
                            payload: "Deleted all rides."
                        });
                        return;
                    }
                    var ride = ridesToDelete.shift();
                    context.executeAction("ridedemolish", {
                        ride: ride.id,
                        modifyType: 0  // 0 means demolish.
                    }, function (result) {
                        if (!result || (result.error && result.error !== "")) {
                            failedDeletions.push(ride.id + " (" + gameError(result) + ")");
                            console.log("Error demolishing ride " + ride.id + ": " + (result && result.error ? result.error : "Unknown error"));
                        }
                        deleteNext();
                    });
                }
                deleteNext();
                break;

            case "resetRide":
                var resetId = request.params.rideId;
                if (!Number.isInteger(resetId) || resetId < 0) {
                    callback({ success: false, error: "Expected a nonnegative rideId" });
                    return;
                }
                var resetRide = map.getRide(resetId);
                if (!resetRide || resetRide.status !== "closed") {
                    callback({ success: false, error: "Reset requires an existing closed ride",
                        error_details: { category: "ride_not_closed" } });
                    return;
                }
                if (resetRide.guestCount !== 0) {
                    callback({ success: false, error: "Reset requires a ride with no guests (or guest count is unknown)",
                        error_details: { category: "ride_not_empty" } });
                    return;
                }
                // In OpenRCT2 a close action on an already closed ride clears
                // vehicles for construction. This is explicit, never a retry.
                context.executeAction("ridesetstatus", { ride: resetId, status: 0 }, function (result) {
                    if (!result || result.error) {
                        callback({ success: false, outcome: result ? "rejected" : "unknown",
                            error: "Ride reset failed: " + gameError(result), error_details: gameErrorDetails(result) });
                        return;
                    }
                    var payload = { ride_id: resetId, vehicles_cleared: null };
                    try {
                        var observedRide = map.getRide(resetId);
                        if (observedRide && Array.isArray(observedRide.vehicles)) {
                            payload.vehicles_cleared = !observedRide.vehicles.some(function (id) {
                                return typeof id === "number" && id !== 65535 && map.getEntity(id) !== null;
                            });
                        }
                    } catch (error) {
                        payload.state_error = String(error);
                    }
                    callback({ success: true, payload: payload });
                });
                break;

            case "closeRide":
            case "startRideTest":
            case "openRide":
                if (!request.params || typeof request.params.rideId !== "number") {
                    callback({
                        success: false,
                        error: "Missing or invalid parameter: rideId"
                    });
                    return;
                }
                var rideId = request.params.rideId;
                context.executeAction("ridesetstatus", {
                    ride: rideId,
                    status: request.endpoint === "closeRide" ? 0 : (request.endpoint === "openRide" ? 1 : 2)
                }, function (result) {
                    if (!result || (result.error && result.error !== "")) {
                        var details = [];
                        if (result && result.errorTitle) details.push(result.errorTitle);
                        if (result && result.errorMessage) details.push(result.errorMessage);
                        if (details.length === 0 && result && result.error) details.push(String(result.error));
                        callback({
                            success: false,
                            outcome: result ? "rejected" : "unknown", error_details: gameErrorDetails(result),
                            error: "Failed to " + (request.endpoint === "closeRide" ? "close ride" : (request.endpoint === "openRide" ? "open ride" : "start ride test")) + ": " +
                                (details.length ? details.join(": ") : "Unknown error")
                        });
                    } else {
                        callback({
                            success: true,
                            payload: "Ride " + rideId + (request.endpoint === "closeRide" ? " closed." : (request.endpoint === "openRide" ? " opened." : " started in test mode."))
                        });
                    }
                });
                break;

            case "getRideStats":
                if (!request.params || typeof request.params.rideId !== "number") {
                    callback({
                        success: false,
                        error: "Missing or invalid parameter: rideId"
                    });
                    return;
                }
                var rideId = request.params.rideId;
                var ride = map.getRide(rideId);
                if (!ride) {
                    callback({
                        success: false,
                        error: "Ride not found"
                    });
                    return;
                }
                // OpenRCT2 uses -1 for an uncalculated excitement rating.
                var ratingsAvailable = ride.excitement >= 0;
                var vehicles = ride.vehicles.filter(function (id) {
                    return typeof id === "number" && id !== 65535 && map.getEntity(id) !== null;
                }).map(function (id) {
                    var vehicle = map.getEntity(id);
                    var car = vehicle;
                    var cars = 0;
                    var visited = {};
                    while (car && !visited[car.id]) {
                        visited[car.id] = true;
                        cars++;
                        if (car.nextCarOnTrain === null) break;
                        if (typeof car.nextCarOnTrain !== "number") { car = null; break; }
                        car = map.getEntity(car.nextCarOnTrain);
                    }
                    var location = vehicle.trackLocation;
                    var forces = vehicle.gForces;
                    return {
                        id: id, velocity: numberOrNull(vehicle.velocity),
                        cars: car && car.nextCarOnTrain === null ? cars : null,
                        status: typeof vehicle.status === "string" ? vehicle.status : null,
                        position: readPosition(vehicle),
                        track_location: location ? {
                            x: numberOrNull(location.x / 32), y: numberOrNull(location.y / 32),
                            z: numberOrNull(location.z / 8), direction: numberOrNull(location.direction),
                            track_type: numberOrNull(location.trackType)
                        } : null,
                        track_progress: numberOrNull(vehicle.trackProgress),
                        g_forces_raw: forces ? { lateral: numberOrNull(forces.lateralG),
                            vertical: numberOrNull(forces.verticalG) } : null
                    };
                });
                var stats = {
                    ride_status: ride.status,
                    game_paused: context.paused,
                    observed_game_tick: typeof date !== "undefined" ? numberOrNull(date.ticksElapsed) : null,
                    total_customers: numberOrNull(ride.totalCustomers),
                    guest_count: numberOrNull(ride.guestCount),
                    ratings_available: ratingsAvailable,
                    excitement: ratingsAvailable ? ride.excitement / 100 : null,
                    intensity: ratingsAvailable ? ride.intensity / 100 : null,
                    nausea: ratingsAvailable ? ride.nausea / 100 : null,
                    vehicles: vehicles,
                    max_speed_mph: ratingsAvailable ? ride.maxSpeed : null,
                    average_speed_mph: ratingsAvailable ? ride.averageSpeed : null,
                    ride_time_seconds: ratingsAvailable ? ride.rideTime : null,
                    ride_length_metres: ratingsAvailable ? ride.rideLength : null,
                    max_positive_vertical_g: ratingsAvailable ? ride.maxPositiveVerticalGs : null,
                    max_negative_vertical_g: ratingsAvailable ? ride.maxNegativeVerticalGs : null,
                    max_lateral_g: ratingsAvailable ? ride.maxLateralGs : null,
                    drops: ratingsAvailable ? ride.numDrops : null,
                    lift_hills: ratingsAvailable ? ride.numLiftHills : null
                };
                callback({
                    success: true,
                    payload: stats
                });
                break;

            case "appendTrackPiece":
                var appendParams = request.params;
                if (!Number.isInteger(appendParams.ride)) {
                    callback({ success: false, error: "Missing or invalid ride ID" });
                    return;
                }
                processRequest({ endpoint: "getCoasterState", params: { rideId: appendParams.ride } }, function (result) {
                    if (!result.success) { callback(result); return; }
                    var current = result.payload;
                    var position = current.position;
                    if (current.layoutStatus !== "complete" || current.isCircuitComplete || !position ||
                        current.validPieces.indexOf(appendParams.trackType) === -1) {
                        callback({ success: false, error: "Track is not an available connection candidate at the current endpoint" });
                        return;
                    }
                    var expected = appendParams.expectedEndpoint;
                    if (!expected || ["x", "y", "z", "direction"].some(function (axis) {
                        return expected[axis] !== position[axis];
                    }) || (appendParams.expectedPieceCount !== undefined &&
                        appendParams.expectedPieceCount !== current.history.length)) {
                        callback({ success: false, error: "Construction endpoint changed; inspect before retrying",
                            error_details: { category: "stale_endpoint", expected: expected, actual: position } });
                        return;
                    }
                    var resolved = {};
                    Object.keys(appendParams).forEach(function (key) { resolved[key] = appendParams[key]; });
                    resolved.tileCoordinateX = position.x;
                    resolved.tileCoordinateY = position.y;
                    resolved.tileCoordinateZ = position.z;
                    resolved.direction = position.direction;
                    resolved.rideType = current.rideType;
                    resolved.isFromTrackDesign = false;
                    processRequest({ endpoint: "placeTrackPiece", params: resolved }, callback);
                });
                return;

            case "queryTrackPiece":
            case "placeTrackPiece":
                // Required parameters:
                // tileCoordinateX, tileCoordinateY, tileCoordinateZ, direction, ride,
                // trackType, rideType, brakeSpeed, colour, seatRotation, trackPlaceFlags, isFromTrackDesign
                // Optional: hasChainLift (boolean) - adds chain lift to slope pieces
                var requiredParams = [
                    "tileCoordinateX", "tileCoordinateY", "tileCoordinateZ", "direction", "ride",
                    "trackType", "rideType", "brakeSpeed", "colour",
                    "seatRotation", "trackPlaceFlags", "isFromTrackDesign"
                ];
                if (!request.params) {
                    callback({ success: false, error: "Missing parameters for placeTrackPiece" });
                    return;
                }
                for (var i = 0; i < requiredParams.length; i++) {
                    var key = requiredParams[i];
                    if (typeof request.params[key] === "undefined") {
                        callback({ success: false, error: "Missing parameter: " + key });
                        return;
                    }
                }
                // Convert tile-based input coordinates to game (pixel) units.
                var pixelCoordinateX = request.params.tileCoordinateX * 32;
                var pixelCoordinateY = request.params.tileCoordinateY * 32;
                var pixelCoordinateZ = request.params.tileCoordinateZ * 8 + getZAdjustment(request.params.trackType);
                // Check if chain lift flag should be added
                var flags = request.params.trackPlaceFlags;
                if (request.params.hasChainLift === true) {
                    // Add chain lift flag (bit 0)
                    flags = flags | 1;
                }

                // Log station piece placement for debugging
                // Station types: 1=EndStation, 2=BeginStation, 3=MiddleStation
                var isStationPiece = (request.params.trackType === 1 ||
                                     request.params.trackType === 2 ||
                                     request.params.trackType === 3);

                if (isStationPiece) {
                    console.log("Station piece placed - Type:", request.params.trackType, "for ride", request.params.ride);
                    console.log("Note: Use placeEntranceExit endpoint to add entrance/exit after station is complete");
                }

                var trackPlaceArgs = {
                    x: pixelCoordinateX,
                    y: pixelCoordinateY,
                    z: pixelCoordinateZ,
                    direction: request.params.direction,
                    ride: request.params.ride,
                    trackType: request.params.trackType,
                    rideType: request.params.rideType,
                    brakeSpeed: request.params.brakeSpeed,
                    colour: request.params.colour,
                    seatRotation: request.params.seatRotation,
                    trackPlaceFlags: flags,
                    isFromTrackDesign: request.params.isFromTrackDesign
                };
                if (request.endpoint === "queryTrackPiece") {
                    context.queryAction("trackplace", trackPlaceArgs, function (result) {
                        if (!result) {
                            callback({ success: false, error: "Track query returned no result" });
                            return;
                        }
                        callback({
                            success: true,
                            payload: {
                                placeable: !result.error,
                                error: result.error || null,
                                error_title: result.errorTitle || null,
                                error_message: result.errorMessage || null,
                                cost: typeof result.cost === "number" ? result.cost : null
                            }
                        });
                    });
                    return;
                }
                context.executeAction("trackplace", trackPlaceArgs, function(result) {
                    if (!result || (result.error && result.error !== "")) {
                        var errMsg = "Failed to place track piece";
                        if (result && result.error) {
                            errMsg += ": " + gameError(result);
                        }
                        callback({
                            success: false,
                            outcome: result ? "rejected" : "unknown",
                            error_details: gameErrorDetails(result),
                            error: errMsg
                        });
                    } else {
                        console.log("Track placed successfully at result position:", result.position);

                        // Get the tile where the track was actually placed (using result position)
                        var placedTileX = Math.floor(result.position.x / 32);
                        var placedTileY = Math.floor(result.position.y / 32);
                        var placedTileZ = result.position.z;

                        console.log("Looking for track on tile:", placedTileX, placedTileY, "at height:", placedTileZ);

                        var tile = map.getTile(placedTileX, placedTileY);
                        if (!tile) {
                            callback({ success: false, outcome: "confirmed", error: "Tile not found at placed position" });
                            return;
                        }

                        // Find the track element that was just placed
                        var elem_index = -1;
                        var targetRide = request.params.ride;
                        var trackElement = null;

                        console.log("Searching for track element for ride:", targetRide);
                        for (var i = 0; i < tile.numElements; i++) {
                            var elem = tile.elements[i];
                            if (elem.type === 'track' && elem.ride === targetRide &&
                                elem.direction === request.params.direction &&
                                (elem.trackType === request.params.trackType ||
                                    (isStationPiece && elem.trackType >= 1 && elem.trackType <= 3))) {
                                console.log("Found track element at index", i, "with baseZ:", elem.baseZ, "vs placedZ:", placedTileZ);
                                // Check if this element is at the right height (with some tolerance)
                                if (elem.baseZ === pixelCoordinateZ) {
                                    elem_index = i;
                                    trackElement = elem;
                                    break;
                                }
                            }
                        }

                        if (elem_index === -1) {
                            console.log("ERROR: Could not find track element on tile. Checking all tiles around...");

                            // Try to find the track element on neighboring tiles
                            var searchOffsets = [
                                [0, 0], [-1, 0], [1, 0], [0, -1], [0, 1],
                                [-1, -1], [-1, 1], [1, -1], [1, 1]
                            ];

                            for (var j = 0; j < searchOffsets.length; j++) {
                                var searchX = placedTileX + searchOffsets[j][0];
                                var searchY = placedTileY + searchOffsets[j][1];
                                var searchTile = map.getTile(searchX, searchY);

                                if (searchTile) {
                                    for (var k = 0; k < searchTile.numElements; k++) {
                                        var searchElem = searchTile.elements[k];
                                        if (searchElem.type === 'track' && searchElem.ride === targetRide &&
                                            searchElem.direction === request.params.direction &&
                                            (searchElem.trackType === request.params.trackType ||
                                                (isStationPiece && searchElem.trackType >= 1 && searchElem.trackType <= 3))) {
                                            if (searchElem.baseZ === pixelCoordinateZ) {
                                                console.log("Found track on neighboring tile at offset", searchOffsets[j], "tile:", searchX, searchY);
                                                placedTileX = searchX;
                                                placedTileY = searchY;
                                                tile = searchTile;
                                                elem_index = k;
                                                trackElement = searchElem;
                                                break;
                                            }
                                        }
                                    }
                                    if (elem_index !== -1) break;
                                }
                            }

                            if (elem_index === -1) {
                                callback({ success: false, outcome: "confirmed", error: "Could not find track element on any nearby tile" });
                                return;
                            }
                        }

                        console.log("Found track element at index:", elem_index, "on tile:", placedTileX, placedTileY);
                        console.log("Track element details - direction:", trackElement.direction, "trackType:", trackElement.trackType);

                        // Create track iterator at the track element's position
                        var iteratorPos = { x: placedTileX * 32, y: placedTileY * 32 };
                        var iterator = map.getTrackIterator(iteratorPos, elem_index);

                        if (!iterator) {
                            console.log("ERROR: Could not create track iterator at position:", iteratorPos, "index:", elem_index);
                            callback({ success: false, outcome: "confirmed", error: "Track iterator not available" });
                            return;
                        }

                        if (!iterator.nextPosition) {
                            console.log("WARNING: Iterator exists but nextPosition is null. Track type:", trackElement.trackType);
                            console.log("Iterator details:", JSON.stringify({
                                position: iterator.position,
                                previousPosition: iterator.previousPosition,
                                segment: iterator.segment
                            }));

                            // For some track pieces, we might need to advance the iterator
                            if (iterator.next && typeof iterator.next === 'function') {
                                var advanced = iterator.next();
                                if (advanced && iterator.nextPosition) {
                                    console.log("Advanced iterator, now have nextPosition:", iterator.nextPosition);
                                } else {
                                    callback({ success: false, outcome: "confirmed", error: "Track has no valid next position" });
                                    return;
                                }
                            } else {
                                callback({ success: false, outcome: "confirmed", error: "Track has no next position available" });
                                return;
                            }
                        }

                        console.log("Iterator nextPosition (game coords):", iterator.nextPosition);

                        // The iterator's nextPosition seems to point to the tile center (16 pixels from corner)
                        // We need the tile coordinates for placement
                        // Simply round to nearest tile
                        var nextTileX = Math.round(iterator.nextPosition.x / 32);
                        var nextTileY = Math.round(iterator.nextPosition.y / 32);
                        var nextTileZ = Math.round(iterator.nextPosition.z / 8);
                        var nextDirection = iterator.nextPosition.direction;

                        console.log("Converted to tile coords - X:", nextTileX, "Y:", nextTileY, "Z:", nextTileZ, "Dir:", nextDirection);

                        // Self-verify the endpoint prediction against the game's actual
                        // result, so a geometry error surfaces immediately in-game.
                        var predictedEnd = predictEndpoint(
                            { x: request.params.tileCoordinateX, y: request.params.tileCoordinateY, z: request.params.tileCoordinateZ },
                            request.params.direction,
                            request.params.trackType
                        );
                        var endpointMismatch = predictedEnd && (predictedEnd.x !== nextTileX || predictedEnd.y !== nextTileY ||
                            predictedEnd.z !== nextTileZ || predictedEnd.direction !== nextDirection);
                        if (endpointMismatch) {
                            console.log("WARNING: endpoint prediction mismatch for trackType", request.params.trackType,
                                "- predicted (" + predictedEnd.x + "," + predictedEnd.y + "," + predictedEnd.z + ",dir " + predictedEnd.direction +
                                ") actual (" + nextTileX + "," + nextTileY + "," + nextTileZ + ",dir " + nextDirection + ")");
                        }

                        // Check if circuit is complete by reading the track back from
                        // the game. The loop is closed when the track returns to its
                        // start element; this works for any station length or position.
                        var placedState = getRideTrackState(request.params.ride);
                        var isCircuitComplete = placedState !== null && placedState.isComplete;

                        var circuitMessage = isCircuitComplete ?
                            "Circuit complete! Track connects back to station - ready for testing!" :
                            "Continue building...";

                        if (isCircuitComplete) {
                            console.log("CIRCUIT COMPLETE! Track successfully connects back to station.");
                        }

                        var responsePayload = {
                            message: "Track piece placed for ride " + request.params.ride,
                            nextEndpoint: {
                                x: nextTileX,
                                y: nextTileY,
                                z: nextTileZ,
                                direction: nextDirection
                            },
                            isCircuitComplete: isCircuitComplete,
                            circuitMessage: circuitMessage,
                            debug: {
                                placedAt: { x: placedTileX, y: placedTileY, z: placedTileZ },
                                trackType: request.params.trackType,
                                elemDirection: trackElement.direction
                            }
                        };

                        if (endpointMismatch) {
                            responsePayload.endpointPredictionMismatch = {
                                predicted: predictedEnd,
                                actual: responsePayload.nextEndpoint
                            };
                        }

                        // Add station detection to response if applicable
                        if (isStationPiece) {
                            responsePayload.stationDetected = true;
                        }

                        callback({ success: true, payload: responsePayload });
                    }
                });
                break;

            case "getCoasterState":
                var snapshotRide = null;
                map.rides.forEach(function (r) { if (r.id === request.params.rideId) snapshotRide = r; });
                if (!snapshotRide) {
                    callback({ success: false, error: "Ride " + request.params.rideId + " not found" });
                    return;
                }
                var snapshotState = getRideTrackState(request.params.rideId);
                if (!snapshotState) {
                    callback({ success: false, error: "Could not reconstruct ride track" });
                    return;
                }
                processRequest({ endpoint: "getValidNextPieces", params: request.params }, function (candidates) {
                    if (!candidates.success) { callback(candidates); return; }
                    processRequest({ endpoint: "getTrackHistory", params: request.params }, function (historyResult) {
                        if (!historyResult.success) { callback(historyResult); return; }
                        var payload = candidates.payload;
                        payload.history = historyResult.payload.history;
                        payload.trackElements = historyResult.payload.trackElements;
                        payload.rideType = snapshotRide.type;
                        payload.rideName = snapshotRide.name || null;
                        payload.stations = readRideStations(snapshotRide);
                        payload.rideObject = snapshotRide.object ? { index: snapshotRide.object.index,
                            identifier: snapshotRide.object.identifier, name: snapshotRide.object.name } : null;
                        payload.layoutStatus = snapshotState ? snapshotState.layoutStatus : "empty";
                        callback({ success: true, payload: payload });
                    }, snapshotState);
                }, snapshotState);
                break;

            case "getValidNextPieces":
                if (!request.params || typeof request.params.rideId !== "number") {
                    callback({
                        success: false,
                        error: "Missing or invalid parameter: rideId"
                    });
                    return;
                }

                var rideId = request.params.rideId;
                var state = snapshot !== undefined ? snapshot : getRideTrackState(rideId);

                if (!state || state.history.length === 0) {
                    // No track placed yet - allow only station and flat pieces to start
                    callback({
                        success: true,
                        payload: {
                            validPieces: [0, 1, 2, 3], // Only flat and station pieces to start
                            lastTrackType: null,
                            stateCategory: "initial",
                            candidateStatus: "initial",
                            isCircuitComplete: false
                        }
                    });
                    return;
                }

                // Get the last placed track piece from history
                var lastPiece = state.history[state.history.length - 1];

                // Descriptor shape is only a connection candidate, not proof of
                // ride support or clearance. Inverted and diagonal track need
                // additional geometry and bank handling, so fail closed for now.
                var stateCategory = getTrackStateCategory(lastPiece.trackType, false);
                var geometry = getSegmentGeometry();
                var previous = geometry[lastPiece.trackType];
                var hasInverted = state.elements.some(function (entry) {
                    return entry.element.isInverted === true;
                });
                var isStation = lastPiece.trackType === 1 || lastPiece.trackType === 2 || lastPiece.trackType === 3;
                var validPieces = [];
                var candidateStatus = "available";
                if (state.layoutStatus !== "complete") {
                    candidateStatus = "unsupported_" + state.layoutStatus + "_layout";
                } else if (state.isComplete) {
                    candidateStatus = "circuit_complete";
                } else if (hasInverted) {
                    candidateStatus = "unsupported_inverted_track";
                } else if (!previous) {
                    candidateStatus = "missing_previous_descriptor";
                } else if (typeof previous.endDirection !== "number" ||
                    typeof previous.endSlope !== "number" || typeof previous.endBank !== "number" ||
                    typeof lastPiece.nextDirection !== "number") {
                    candidateStatus = "incomplete_previous_geometry";
                } else if (previous.endDirection < 0 || previous.endDirection >= 4 ||
                    lastPiece.nextDirection < 0 || lastPiece.nextDirection >= 4) {
                    candidateStatus = "unsupported_diagonal_endpoint";
                } else if (supportedCardinalPieces.indexOf(lastPiece.trackType) === -1 && lastPiece.trackType !== 2) {
                    candidateStatus = "unsupported_previous_piece";
                } else {
                    supportedCardinalPieces.forEach(function (type) {
                        var candidate = geometry[type];
                        if (!candidate || ((type === 1 || type === 3) && !isStation)) return;
                        if (candidate.beginDirection !== 0 || typeof candidate.endDirection !== "number" ||
                            candidate.endDirection < 0 || candidate.endDirection >= 4) return;
                        if (typeof candidate.beginSlope !== "number" || typeof candidate.beginBank !== "number") return;
                        if (candidate.beginSlope === previous.endSlope && candidate.beginBank === previous.endBank) {
                            validPieces.push(type);
                        }
                    });
                    if (validPieces.length === 0) candidateStatus = "no_matching_supported_pieces";
                }

                var buildPosition = {
                    x: lastPiece.nextX,
                    y: lastPiece.nextY,
                    z: lastPiece.nextZ,
                    direction: lastPiece.nextDirection
                };

                callback({
                    success: true,
                    payload: {
                        validPieces: validPieces,
                        candidateStatus: candidateStatus,
                        pieceCount: state.history.length,
                        validPieceEndpoints: buildValidPieceEndpoints(buildPosition, validPieces),
                        lastTrackType: lastPiece.trackType,
                        stateCategory: stateCategory,
                        isCircuitComplete: state.isComplete === true,
                        position: buildPosition
                    }
                });
                break;

            case "placeStationBuilding":
                placeStationBuilding(request.params, callback);
                break;

            case "placeEntranceExit":
                placeEntranceExit(request.params, callback);
                break;

            case "previewTrackRemoval":
            case "deleteLastTrackPiece":
                // This endpoint only removes track pieces, not entrances/exits
                // Entrances/exits must be managed separately
                if (!request.params || typeof request.params.rideId !== "number") {
                    callback({
                        success: false,
                        error: "Missing or invalid parameter: rideId"
                    });
                    return;
                }

                var rideId = request.params.rideId;
                var state = getRideTrackState(rideId);

                if (!state || state.history.length === 0) {
                    callback({
                        success: false,
                        error: "No track pieces to delete for ride " + rideId
                    });
                    return;
                }

                if (state.layoutStatus !== "complete") {
                    callback({ success: false, error: "Cannot remove endpoint from " + state.layoutStatus + " layout" });
                    return;
                }
                // Remove the selected component's terminal piece, not chronological undo.
                var lastPiece = state.history[state.history.length - 1];

                // Find the actual tile element so we can remove it by its exact baseZ
                // (the game matches on baseZ, which differs from the tile z for downward
                // pieces).
                var removeElement = null;
                for (var ri = 0; ri < state.elements.length; ri++) {
                    var cand = state.elements[ri];
                    if (cand.tileX === lastPiece.x &&
                        cand.tileY === lastPiece.y &&
                        cand.element.trackType === lastPiece.trackType &&
                        cand.element.direction === lastPiece.direction &&
                        !(cand.element.sequence > 0)) {
                        var removalIterator = map.getTrackIterator(
                            { x: cand.tileX * 32, y: cand.tileY * 32 }, cand.elementIndex);
                        if (!removalIterator || removalIterator.position.z !== lastPiece.pixelZ) continue;
                        removeElement = cand.element;
                        break;
                    }
                }
                if (!removeElement) {
                    callback({ success: false, error: "Could not identify exact endpoint element for removal" });
                    return;
                }
                var removeZ = removeElement.baseZ;

                var removalTarget = { x: lastPiece.x, y: lastPiece.y, z: lastPiece.z,
                    direction: lastPiece.direction, track_type: lastPiece.trackType, base_z_game: removeZ,
                    piece_count: state.history.length };
                if (request.params.expectedTarget) {
                    // Compare fields, not incoming JSON key order.
                    var expectedTarget = request.params.expectedTarget;
                    if (Object.keys(removalTarget).some(function (key) { return expectedTarget[key] !== removalTarget[key]; })) {
                        callback({ success: false, error: "Removal target changed; inspect before removing",
                            error_details: { category: "stale_removal_target", actual: removalTarget } });
                        return;
                    }
                }
                if (request.endpoint === "previewTrackRemoval") {
                    callback({ success: true, payload: { target: removalTarget,
                        pieces_remaining: state.history.length - 1,
                        was_circuit_complete: state.isComplete,
                        limitations: "Selection preview only, not a game permission/clearance query or reservation" } });
                    return;
                }

                console.log("Attempting to remove track piece at tile:", lastPiece.x, lastPiece.y,
                            "trackType:", lastPiece.trackType, "z:", removeZ);

                // Use trackremove action to delete the track piece
                context.executeAction("trackremove", {
                    x: lastPiece.x * 32,  // Convert tile to pixel coordinates
                    y: lastPiece.y * 32,
                    z: removeZ,  // Exact baseZ of the element (pixel units)
                    direction: lastPiece.direction,
                    trackType: lastPiece.trackType,
                    sequence: 0  // Sequence number for multi-tile pieces (0 for single tile)
                }, function(result) {
                    if (!result || (result.error && result.error !== "")) {
                        console.log("Failed to remove track piece:", result ? result.error : "Unknown error");
                        callback({
                            success: false,
                            outcome: result ? "rejected" : "unknown",
                            error_details: gameErrorDetails(result),
                            error: "Failed to remove track piece: " + gameError(result)
                        });
                    } else {
                        console.log("Successfully removed track piece");

                        // Re-derive state from the game for the response.
                        var newState = getRideTrackState(rideId);

                        var responsePayload = {
                            message: "Track piece removed from ride " + rideId,
                            piecesRemaining: newState ? newState.history.length : 0
                        };

                        // If there are still pieces, provide the new endpoint for building
                        if (newState && newState.history.length > 0) {
                            var newLastPiece = newState.history[newState.history.length - 1];
                            responsePayload.nextEndpoint = {
                                x: newLastPiece.nextX,
                                y: newLastPiece.nextY,
                                z: newLastPiece.nextZ,
                                direction: newLastPiece.nextDirection
                            };
                            responsePayload.lastTrackType = newLastPiece.trackType;
                        } else {
                            // No pieces left, ready to start fresh
                            responsePayload.nextEndpoint = null;
                            responsePayload.lastTrackType = null;
                        }

                        callback({
                            success: true,
                            payload: responsePayload
                        });
                    }
                });
                break;

            case "createRide":
                if (!request.params ||
                    typeof request.params.rideType !== "number" ||
                    typeof request.params.rideObject !== "number" ||
                    typeof request.params.entranceObject !== "number" ||
                    typeof request.params.colour1 !== "number" ||
                    typeof request.params.colour2 !== "number" ||
                    typeof request.params.inspectionInterval !== "number") {
                    callback({
                        success: false,
                        error: "Missing or invalid parameters for createRide"
                    });
                    return;
                }
                var rideCreateArgs = {
                    rideType: request.params.rideType,
                    rideObject: request.params.rideObject,
                    entranceObject: request.params.entranceObject,
                    colour1: request.params.colour1,
                    colour2: request.params.colour2,
                    inspectionInterval: request.params.inspectionInterval,
                };
                context.executeAction("ridecreate", rideCreateArgs, function (result) {
                    if (result && !result.error && Number.isInteger(result.ride) && result.ride >= 0 && result.ride < 65535) {
                        var rideId = result.ride;
                        var requestedName = request.params.name;
                        if (typeof requestedName === "string" && requestedName.trim() !== "") {
                            // ridecreate always assigns a default name; apply the
                            // requested one separately.
                            context.executeAction("ridesetname", { ride: rideId, name: requestedName }, function (nameResult) {
                                var createdPayload = { rideId: rideId };
                                if (!nameResult || nameResult.error) {
                                    createdPayload.nameWarning = "Ride created, but naming was not confirmed: " + gameError(nameResult);
                                    createdPayload.nameOutcome = nameResult ? "rejected" : "unknown";
                                }
                                callback({ success: true, payload: createdPayload });
                            });
                        } else {
                            callback({
                                success: true,
                                payload: { rideId: rideId }
                            });
                        }
                    } else {
                        callback({
                            success: false,
                            outcome: result && result.error ? "rejected" : "unknown",
                            error_details: gameErrorDetails(result),
                            error: "Failed to create ride: " + gameError(result)
                        });
                    }
                });
                break;

            case "getTrackHistory":
                var state = snapshot !== undefined ? snapshot : getRideTrackState(request.params.rideId);
                if (!state) {
                    callback({ success: false, error: "Could not reconstruct ride track" });
                    return;
                }
                callback({
                    success: true,
                    payload: {
                        history: state ? state.history : [],
                        trackElements: state ? state.elements.map(function (entry) {
                            return {
                                x: entry.tileX,
                                y: entry.tileY,
                                z: entry.element.baseZ / 8
                            };
                        }) : []
                    }
                });
                break;

            default:
                callback({
                    success: false,
                    error: "Unknown endpoint: " + request.endpoint
                });
                break;
        }
    }
}

// Register the plugin
registerPlugin({
    name: "Ride Creation API Plugin - modified",
    version: PLUGIN_VERSION,
    authors: ["Markus", "Milan Boers"],
    type: "intransient",
    licence: "MIT",
    minApiVersion: 124,
    targetApiVersion: 103,
    main: main
});