// Plugin test harness.
//
// Stubs the OpenRCT2 plugin API (network, map, context, registerPlugin), loads
// the real ridecreation-api.js, and drives JSON requests through its TCP
// listener to assert on the request/response contract.
//
// Run with: node src/tests/plugin_test.js

const fs = require("fs");
const path = require("path");

let failures = 0;
function assert(cond, msg) {
    if (cond) {
        console.log("ok:   " + msg);
    } else {
        failures++;
        console.log("FAIL: " + msg);
    }
}

// ---------------------------------------------------------------------------
// Fake track element / tile map
// ---------------------------------------------------------------------------
const tiles = new Map(); // "x,y" -> array of elements

function makeTrack(tileX, tileY, trackType, direction, baseZ, opts) {
    opts = opts || {};
    return {
        type: "track",
        trackType,
        sequence: 0,
        isGhost: false,
        direction,
        baseZ,
        // The iterator reports the piece's ORIGIN z, which for downward pieces
        // differs from baseZ (baseZ is the low/exit height). We model that here.
        originZ: opts.originZ !== undefined ? opts.originZ : baseZ,
        tileX,
        tileY,
    };
}

function place(ride, el) {
    el.ride = ride;
    const key = el.tileX + "," + el.tileY;
    if (!tiles.has(key)) tiles.set(key, []);
    const arr = tiles.get(key);
    arr.push(el);
    return arr.length - 1; // element index
}

function clearTiles() {
    tiles.clear();
}

function linkSeq(elements, closed) {
    for (let i = 0; i < elements.length; i++) {
        elements[i].prev = i > 0 ? elements[i - 1] : closed ? elements[elements.length - 1] : null;
        elements[i].next = i < elements.length - 1 ? elements[i + 1] : closed ? elements[0] : null;
    }
}

const map = {
    size: { x: 128, y: 128 },
    getTile(x, y) {
        const arr = tiles.get(x + "," + y);
        return arr ? { numElements: arr.length, elements: arr } : null;
    },
    getTrackIterator(pos, index) {
        const tile = map.getTile(Math.round(pos.x / 32), Math.round(pos.y / 32));
        const el = tile ? tile.elements[index] : null;
        if (!el) return null;
        return makeIterator(el);
    },
    getRide: () => null,
    rides: { forEach: () => {} },
};

// Fake track iterator that follows the map's linked next/prev pointers.
function makeIterator(startEl) {
    let node = startEl;
    const posOf = (n) => ({ x: n.tileX * 32, y: n.tileY * 32, z: n.originZ, direction: n.direction });
    return {
        get position() {
            return posOf(node);
        },
        get segment() {
            return {
                type: node.trackType,
                beginDirection: node.direction,
                endDirection: node.next ? node.next.direction : node.direction,
                endZ: (node.next ? node.next.originZ : node.originZ) - node.originZ,
            };
        },
        get nextPosition() {
            if (node.next) return posOf(node.next);
            // Open end: virtual exit one tile in the current direction.
            const dx = node.direction === 0 ? -1 : node.direction === 2 ? 1 : 0;
            const dy = node.direction === 1 ? 1 : node.direction === 3 ? -1 : 0;
            return { x: (node.tileX + dx) * 32, y: (node.tileY + dy) * 32, z: node.originZ, direction: node.direction };
        },
        get previousPosition() {
            return node.prev ? posOf(node.prev) : null;
        },
        next() {
            if (!node.next) return false;
            node = node.next;
            return true;
        },
        previous() {
            if (!node.prev) return false;
            node = node.prev;
            return true;
        },
    };
}

// ---------------------------------------------------------------------------
// Fake plugin API + request driver
// ---------------------------------------------------------------------------
const actionHandlers = {};

// Track segment geometry from the game's own catalog (real descriptor values).
function seg(type, endX, endY, endZ, endDirection, beginSlope = 0, endSlope = 0, beginBank = 0, endBank = 0) {
    const group = type === 5 ? 68 : type >= 1 && type <= 3 ? 2 : type === 99 ? 28 :
        type === 16 || type === 17 || type === 22 || type === 23 ? 16 :
        type === 42 || type === 43 || type === 44 || type === 45 ? 15 :
        type >= 18 && type <= 33 ? 6 : type >= 4 && type <= 15 ? 8 : 1;
    return { type, trackGroup: group, allowsChainLift: true, endX, endY, endZ, beginDirection: 0, endDirection, beginSlope, endSlope, beginBank, endBank,
        elements: [{ x: 0, y: 0, z: 0 }] };
}
const TEST_SEGMENTS = [
    seg(0, 0, 0, 0, 0), seg(1, 0, 0, 0, 0), seg(2, 0, 0, 0, 0), seg(3, 0, 0, 0, 0),
    seg(4, 0, 0, 16, 0, 2, 2), seg(5, 0, 0, 64, 0, 4, 4),
    seg(6, 0, 0, 8, 0, 0, 2), seg(7, 0, 0, 32, 0, 2, 4),
    seg(8, 0, 0, 32, 0, 4, 2), seg(9, 0, 0, 8, 0, 2, 0),
    seg(10, 0, 0, 0, 0, 6, 6), seg(11, 0, 0, 0, 0, 8, 8),
    seg(12, 0, 0, 0, 0, 0, 6), seg(13, 0, 0, 0, 0, 6, 8),
    seg(14, 0, 0, 0, 0, 8, 6), seg(15, 0, 0, 0, 0, 6, 0),
    seg(16, -64, -64, 0, 3), seg(17, -64, 64, 0, 1),
    seg(18, 0, 0, 0, 0, 0, 0, 0, 2), seg(19, 0, 0, 0, 0, 0, 0, 0, 4),
    seg(20, 0, 0, 0, 0, 0, 0, 2, 0), seg(21, 0, 0, 0, 0, 0, 0, 4, 0),
    seg(22, -64, -64, 0, 3, 0, 0, 2, 2), seg(23, -64, 64, 0, 1, 0, 0, 4, 4),
    seg(32, 0, 0, 0, 0, 0, 0, 2, 2), seg(33, 0, 0, 0, 0, 0, 0, 4, 4),
    seg(42, -32, -32, 0, 3), seg(43, -32, 32, 0, 1),
    seg(44, -32, -32, 0, 3, 0, 0, 2, 2), seg(45, -32, 32, 0, 1, 0, 0, 4, 4),
    seg(99, 0, 0, 0, 0), seg(200, 0, 0, 0, 4), seg(201, 0, 0, 0, 0),
];

global.registerPlugin = (p) => {
    global.__plugin = p;
};
global.network = {
    createListener: () => listener,
};
global.map = map;
global.context = {
    mode: "normal",
    getAllTrackSegments: () => TEST_SEGMENTS,
    executeAction: (name, args, cb) => {
        const h = actionHandlers[name];
        if (h) h(args, cb);
        else cb({});
    },
};

let listener = {
    on: (evt, fn) => {
        if (evt === "connection") listener.connectionHandler = fn;
    },
    listen: (port, host) => { listener.boundHost = host; },
};

function rawRequest(data) {
    const writes = [];
    const conn = {
        on: (evt, fn) => {
            if (!conn.handlers) conn.handlers = {};
            conn.handlers[evt] = fn;
        },
        write: (s) => writes.push(s),
        end: () => { conn.ended = true; },
    };
    listener.connectionHandler(conn);
    for (const chunk of Array.isArray(data) ? data : [data]) conn.handlers.data(chunk);
    return { responses: writes.map((line) => JSON.parse(line)), ended: conn.ended };
}

function request(endpoint, params) {
    return rawRequest(JSON.stringify({ endpoint, params: params || {} }) + "\n").responses[0];
}

// Load the real plugin and start it.
const pluginPath = path.join(__dirname, "..", "..", "ridecreation-api.js");
eval(fs.readFileSync(pluginPath, "utf8"));
global.__plugin.main();
const connHandler = listener.connectionHandler;
assert(connHandler != null, "plugin starts and listens");
assert(listener.boundHost === "127.0.0.1", "plugin only binds loopback");
for (const data of ["null\n", "[]\n", "{}\n", '{"endpoint":"getPluginInfo","params":[]}\n', "bad json\n"]) {
    assert(rawRequest(data).responses[0].success === false, "invalid envelope returns a controlled error");
}
const framed = rawRequest(['{"endpoint":"getPlugin', 'Info"}\n{"endpoint":"getPluginInfo"}\n']);
assert(framed.responses.length === 2 && framed.responses.every(r => r.success), "fragmented and coalesced requests are framed");
const oversized = rawRequest("x".repeat(1024 * 1024 + 1));
assert(oversized.ended && !oversized.responses[0].success, "oversized requests close the connection");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Vehicle settings use the game's ride action and surface its errors.
let vehicleArgs = null;
actionHandlers["ridesetvehicle"] = (args, cb) => { vehicleArgs = args; cb({}); };
let vehicleResult = request("setRideVehicles", { rideId: 4, setting: "cars_per_train", value: 3 });
assert(vehicleResult.success && vehicleArgs.ride === 4 && vehicleArgs.type === 1 && vehicleArgs.value === 3,
    "sets the requested cars per train");
actionHandlers["ridesetvehicle"] = (args, cb) => cb({ error: 1, errorMessage: "Ride must be closed" });
vehicleResult = request("setRideVehicles", { rideId: 4, setting: "trains", value: 2 });
assert(vehicleResult.error === "Failed to set ride vehicles: Ride must be closed", "vehicle action reports game errors");
assert(!request("setRideVehicles", { rideId: 4, setting: "trains", value: 256 }).success,
    "vehicle setting rejects out-of-range values");

// Version and targeted ride demolition.
assert(request("getPluginInfo").payload.version === global.__plugin.version, "plugin reports its registered version");
let demolished = null;
actionHandlers["ridedemolish"] = (args, cb) => { demolished = args; cb({}); };
assert(request("deleteRide", { rideId: 10 }).payload.rideId === 10 && demolished.ride === 10,
    "deleteRide demolishes only the requested ride");
actionHandlers["ridedemolish"] = (args, cb) => cb({ error: 1, errorMessage: "Ride not found" });
assert(request("deleteRide", { rideId: 99 }).error === "Failed to delete ride: Ride not found",
    "deleteRide returns game errors");
assert(request("deleteRide", {}).success === false, "deleteRide requires a ride ID");

// Test-mode errors expose the game's message, with a numeric fallback.
actionHandlers["ridesetstatus"] = (args, cb) => {
    assert(args.ride === 10 && args.status === 2, "startRideTest requests testing mode");
    cb({ error: 65535, errorTitle: "Can't test ride", errorMessage: "Track is not complete" });
};
let testResult = request("startRideTest", { rideId: 10 });
assert(testResult.error === "Failed to start ride test: Can't test ride: Track is not complete",
    "startRideTest returns the game's error details");
actionHandlers["ridesetstatus"] = (args, cb) => cb({ error: 65535 });
testResult = request("startRideTest", { rideId: 10 });
assert(testResult.error === "Failed to start ride test: 65535", "startRideTest falls back to the error code");
actionHandlers["ridesetstatus"] = (args, cb) => cb({});
assert(request("startRideTest", { rideId: 10 }).success === true, "startRideTest reports success");

// Querying track uses the same arguments without executing a placement.
let queried = null;
context.queryAction = (name, args, cb) => { queried = { name, args }; cb({ error: 1, errorTitle: "Can't build", errorMessage: "Obstructed" }); };
const trackArgs = { ride: 1, tileCoordinateX: 10, tileCoordinateY: 11, tileCoordinateZ: 14,
    direction: 0, trackType: 6, rideType: 52, colour: 0, brakeSpeed: 0, seatRotation: 0,
    trackPlaceFlags: 0, isFromTrackDesign: true, hasChainLift: true };
let query = request("queryTrackPiece", trackArgs);
assert(query.success && !query.payload.placeable && query.payload.error_message === "Obstructed",
    "track query returns the game's rejection");
assert(queried.name === "trackplace" && queried.args.x === 320 && queried.args.trackPlaceFlags === 1,
    "track query uses the track placement coordinates and flags");
context.queryAction = (name, args, cb) => cb({ cost: 123 });
query = request("queryTrackPiece", trackArgs);
assert(query.payload.placeable && query.payload.cost === 123, "track query reports a permitted piece and cost");

// Bounded map data includes terrain, paths and other rides.
clearTiles();
tiles.set("10,11", [{ type: "surface", baseZ: 112, clearanceZ: 120, isGhost: false, slope: 1, waterHeight: 0 },
    { type: "track", baseZ: 128, clearanceZ: 144, isGhost: false, ride: 5 }]);
let area = request("getMapArea", { x: 10, y: 11, radius: 0 });
assert(area.payload.tiles[0].elements[0].base_z === 14 && area.payload.tiles[0].elements[0].slope === 1 &&
    area.payload.tiles[0].elements[1].ride_id === 5, "map area reports element heights and ride IDs");
assert(request("getMapArea", { x: 10, y: 11, radius: 9 }).success === false, "map area limits radius");

// Ride statistics distinguish uncalculated ratings from real zero values.
map.getRide = (id) => id === 10 ? {
    status: "testing", excitement: -1, intensity: 0, nausea: 0, vehicles: [42, 43, 65535],
} : null;
map.getEntity = (id) => ({
    42: { id: 42, velocity: 1234, nextCarOnTrain: 44, x: 320, y: 352, z: 120, status: "travelling",
        trackLocation: { x: 320, y: 352, z: 112, direction: 0, trackType: 4 },
        trackProgress: 6, gForces: { lateralG: -80, verticalG: 250 } },
    44: { id: 44, nextCarOnTrain: null },
})[id] || null;
context.paused = true;
let stats = request("getRideStats", { rideId: 10 });
assert(JSON.stringify(stats.payload) === JSON.stringify({
    ride_status: "testing", game_paused: true, observed_game_tick: null, total_customers: null, guest_count: null,
    ratings_available: false,
    excitement: null, intensity: null, nausea: null,
    vehicles: [{ id: 42, velocity: 1234, cars: 2, status: "travelling", position: { x: 10, y: 11, z: 15 },
        track_location: { x: 10, y: 11, z: 14, direction: 0, track_type: 4 }, track_progress: 6,
        g_forces_raw: { lateral: -80, vertical: 250 } }],
    max_speed_mph: null, average_speed_mph: null, ride_time_seconds: null, ride_length_metres: null,
    max_positive_vertical_g: null, max_negative_vertical_g: null, max_lateral_g: null, drops: null, lift_hills: null,
}), "uncalculated ratings include test diagnostics and vehicle velocities");
map.getRide = () => ({ status: "open", excitement: 652, intensity: 430, nausea: 0, vehicles: [],
    maxSpeed: 45, averageSpeed: 20, rideTime: 60, rideLength: 300,
    maxPositiveVerticalGs: 3.2, maxNegativeVerticalGs: -0.5, maxLateralGs: 1.1, numDrops: 2, numLiftHills: 1 });
context.paused = false;
stats = request("getRideStats", { rideId: 10 });
assert(JSON.stringify(stats.payload) === JSON.stringify({
    ride_status: "open", game_paused: false, observed_game_tick: null, total_customers: null, guest_count: null,
    ratings_available: true,
    excitement: 6.52, intensity: 4.3, nausea: 0, vehicles: [],
    max_speed_mph: 45, average_speed_mph: 20, ride_time_seconds: 60, ride_length_metres: 300,
    max_positive_vertical_g: 3.2, max_negative_vertical_g: -0.5, max_lateral_g: 1.1, drops: 2, lift_hills: 1,
}), "calculated ratings use game-scale values and preserve zero");
map.getRide = () => null;
assert(request("getRideStats", { rideId: 10 }).error === "Ride not found", "missing ride reports an error");

// 1. Linear track is reconstructed in order.
clearTiles();
const ride1 = 1;
const els1 = [
    makeTrack(67, 66, 2, 0, 112), // BeginStation
    makeTrack(66, 66, 3, 0, 112), // MiddleStation
    makeTrack(65, 66, 1, 0, 112), // EndStation
    makeTrack(64, 66, 0, 0, 112), // Flat
    makeTrack(63, 66, 0, 0, 112), // Flat
];
linkSeq(els1);
for (const el of els1) place(ride1, el);

let r = request("getTrackHistory", { rideId: ride1 });
assert(r.success === true, "getTrackHistory succeeds");
assert(r.payload.history.length === 5, "linear track history has 5 pieces (got " + r.payload.history.length + ")");
assert(r.payload.trackElements.some(e => e.x === 67 && e.y === 66 && e.z === 14),
    "track history includes actual element tiles and base heights");
assert(r.payload.history[0].trackType === 2 && r.payload.history[0].x === 67, "first piece is BeginStation at x=67");
assert(r.payload.history[2].trackType === 1 && r.payload.history[2].x === 65, "third piece is EndStation at x=65");
assert(r.payload.history[0].nextX === 66 && r.payload.history[0].nextDirection === 0, "next fields point at the following piece");

// 2. Valid next pieces reflect the last piece's state category.
let r2 = request("getValidNextPieces", { rideId: ride1 });
assert(r2.success === true && r2.payload.stateCategory === "flat", "last piece (Flat) maps to 'flat' category");
assert(JSON.stringify(r2.payload.validPieces) === JSON.stringify([0, 6, 12, 16, 17, 42, 43, 18, 19, 99]),
    "flat category exposes the expected valid pieces");

// Descriptor end slope and bank determine supported cardinal connection candidates.
for (const [type, expected] of [
    [6, [4, 9, 7]], [7, [5, 8]], [12, [10, 15, 13]],
    [18, [32, 20, 22, 44]], [19, [33, 21, 23, 45]],
]) {
    clearTiles();
    const piece = makeTrack(20, 20, type, 0, 112);
    place(8, piece);
    const candidates = request("getValidNextPieces", { rideId: 8 }).payload.validPieces;
    assert(JSON.stringify(candidates) === JSON.stringify(expected),
        "descriptor-matched candidates after piece " + type + " (got " + JSON.stringify(candidates) + ")");
}
clearTiles();
const inverted = makeTrack(20, 20, 0, 0, 112);
inverted.isInverted = true;
place(8, inverted);
let blockedState = request("getValidNextPieces", { rideId: 8 }).payload;
assert(blockedState.validPieces.length === 0 && blockedState.candidateStatus === "unsupported_inverted_track",
    "inverted track reports why cardinal candidates are unavailable");
clearTiles();
place(8, makeTrack(20, 20, 0, 4, 112));
blockedState = request("getValidNextPieces", { rideId: 8 }).payload;
assert(blockedState.validPieces.length === 0 && blockedState.candidateStatus === "unsupported_diagonal_endpoint",
    "diagonal endpoints report why cardinal candidates are unavailable");
clearTiles();
place(8, makeTrack(20, 20, 200, 0, 112));
blockedState = request("getValidNextPieces", { rideId: 8 }).payload;
assert(blockedState.candidateStatus === "unsupported_diagonal_endpoint",
    "diagonal descriptors are identified even outside the supported piece set");
clearTiles();
place(8, makeTrack(20, 20, 201, 0, 112));
blockedState = request("getValidNextPieces", { rideId: 8 }).payload;
assert(blockedState.candidateStatus === "unsupported_previous_piece",
    "unsupported cardinal pieces report the support boundary");
clearTiles();
place(8, makeTrack(20, 20, 999, 0, 112));
blockedState = request("getValidNextPieces", { rideId: 8 }).payload;
assert(blockedState.validPieces.length === 0 && blockedState.candidateStatus === "missing_previous_descriptor",
    "missing descriptors report why candidates are unavailable");

// Report when the game's actual endpoint disagrees with the prediction.
clearTiles();
actionHandlers["trackplace"] = (args, cb) => {
    const placed = makeTrack(10, 11, 0, 0, args.z);
    placed.next = makeTrack(11, 11, 0, 0, args.z);
    place(args.ride, placed);
    cb({ position: { x: args.x, y: args.y, z: args.z } });
};
const mismatchResult = request("placeTrackPiece", { ...trackArgs, trackType: 0, hasChainLift: false });
assert(mismatchResult.success && mismatchResult.payload.endpointPredictionMismatch.predicted.x === 9 &&
    mismatchResult.payload.endpointPredictionMismatch.actual.x === 11,
    "placement returns predicted and actual endpoints when they disagree");

// 3. A station-only track keeps offering station pieces alongside normal track.
clearTiles();
const ride3 = 3;
const els3 = [
    makeTrack(67, 66, 2, 0, 112), // BeginStation
    makeTrack(66, 66, 3, 0, 112), // MiddleStation
    makeTrack(65, 66, 1, 0, 112), // EndStation
];
linkSeq(els3);
for (const el of els3) place(ride3, el);
r2 = request("getValidNextPieces", { rideId: ride3 });
assert(r2.payload.stateCategory === "station", "any station piece last -> 'station' category");
// The game auto-reclassifies station pieces (a lone piece becomes an EndStation),
// so while the last piece is a station piece the agent may keep extending the
// station OR start laying normal track.
for (const expected of [1, 3, 0, 6, 12, 16, 17, 18, 19, 42, 43, 99]) {
    assert(r2.payload.validPieces.indexOf(expected) !== -1,
        "valid pieces include " + expected + " while the station is still being built");
}

// 4. A ride with no track gets the initial fallback, but a missing ID does not.
clearTiles();
assert(!request("getValidNextPieces", {}).success, "candidate reads require an explicit ride ID");
r2 = request("getValidNextPieces", { rideId: 99 });
assert(r2.payload.stateCategory === "initial", "no track -> 'initial' category");
assert(JSON.stringify(r2.payload.validPieces) === JSON.stringify([0, 1, 2, 3]), "initial allows station + flat pieces");

// 5. A closed loop is detected as a complete circuit, without duplication.
clearTiles();
const ride5 = 5;
const els5 = [
    makeTrack(67, 66, 2, 0, 112),
    makeTrack(66, 66, 3, 0, 112),
    makeTrack(65, 66, 1, 0, 112),
    makeTrack(64, 66, 0, 0, 112),
    makeTrack(63, 66, 0, 0, 112),
];
linkSeq(els5, true);
for (const el of els5) place(ride5, el);
r2 = request("getValidNextPieces", { rideId: ride5 });
assert(r2.payload.isCircuitComplete === true, "closed loop reported as circuit complete");
assert(r2.payload.candidateStatus === "circuit_complete" && r2.payload.validPieces.length === 0,
    "completed circuit reports why no further pieces are offered");
r = request("getTrackHistory", { rideId: ride5 });
assert(r.payload.history.length === 5, "closed loop history has 5 entries, no duplicates (got " + r.payload.history.length + ")");

// 6. Undo removes the last piece using its exact baseZ (not the tile z),
//    which matters for downward pieces whose baseZ differs from the origin z.
clearTiles();
const ride6 = 6;
let removeArgs = null;
actionHandlers["trackremove"] = (args, cb) => {
    removeArgs = args;
    const key = Math.round(args.x / 32) + "," + Math.round(args.y / 32);
    const arr = tiles.get(key);
    if (arr) {
        for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i].trackType === args.trackType &&
                arr[i].direction === args.direction &&
                arr[i].baseZ === args.z) {
                const removed = arr.splice(i, 1)[0];
                // Sever the linked-list pointers so the re-walk stops there.
                if (removed.prev) removed.prev.next = null;
                if (removed.next) removed.next.prev = null;
                break;
            }
        }
    }
    cb({});
};
const els6 = [
    makeTrack(67, 66, 2, 0, 112), // BeginStation
    makeTrack(66, 66, 10, 0, 96, { originZ: 112 }), // Down25: baseZ 96, origin z 112
];
linkSeq(els6);
for (const el of els6) place(ride6, el);

r = request("deleteLastTrackPiece", { rideId: ride6 });
assert(removeArgs !== null, "trackremove action was invoked");
assert(removeArgs.trackType === 10 && removeArgs.direction === 0, "removes the last (Down25) piece");
assert(removeArgs.z === 96, "trackremove uses exact baseZ 96, not tileZ*8=" + Math.round(els6[1].originZ / 8) * 8 + " (got " + removeArgs.z + ")");
assert(r.success === true && r.payload.piecesRemaining === 1, "one piece remains after undo");
assert(r.payload.nextEndpoint !== null && r.payload.nextEndpoint.x === 66,
    "next endpoint points back at the tile where the removed piece was (got " + (r.payload.nextEndpoint ? r.payload.nextEndpoint.x : "null") + ")");

// 7. Predicted landing endpoints for each valid piece.
// Track ends at (11, 10) heading west, so the next placement point is (10, 10, 14) dir 0.
clearTiles();
const ride7 = 7;
const els7 = [
    makeTrack(12, 10, 2, 0, 112), // BeginStation
    makeTrack(11, 10, 0, 0, 112), // Flat
];
linkSeq(els7);
for (const el of els7) place(ride7, el);
r2 = request("getValidNextPieces", { rideId: ride7 });
const eps = r2.payload.validPieceEndpoints;
assert(eps !== undefined, "validPieceEndpoints present");
assert(eps["0"] && eps["0"].x === 9 && eps["0"].y === 10 && eps["0"].z === 14 && eps["0"].direction === 0,
    "Flat predicts landing one tile west at same height (got " + JSON.stringify(eps["0"]) + ")");
assert(!eps["4"] && !eps["10"], "flat track does not offer direct slope pieces without transitions");
assert(eps["16"] && eps["16"].x === 8 && eps["16"].y === 7 && eps["16"].direction === 3,
    "LeftQuarterTurn5Tiles predicts a left turn ending facing direction 3 (got " + JSON.stringify(eps["16"]) + ")");
assert(eps["17"] && eps["17"].x === 8 && eps["17"].y === 13 && eps["17"].direction === 1,
    "RightQuarterTurn5Tiles predicts a right turn ending facing direction 1 (got " + JSON.stringify(eps["17"]) + ")");

// Predictions rotate with the current endpoint direction.
for (const [direction, flatX, flatY, turnX, turnY, turnDirection] of [
    [0, 18, 20, 17, 17, 3], [1, 20, 22, 17, 23, 0],
    [2, 22, 20, 23, 23, 1], [3, 20, 18, 23, 17, 2],
]) {
    clearTiles();
    place(7, makeTrack(20, 20, 0, direction, 112));
    const predicted = request("getValidNextPieces", { rideId: 7 }).payload.validPieceEndpoints;
    assert(predicted[0].x === flatX && predicted[0].y === flatY && predicted[0].direction === direction,
        "flat endpoint prediction at direction " + direction);
    assert(predicted[16].x === turnX && predicted[16].y === turnY && predicted[16].direction === turnDirection,
        "turn endpoint prediction at direction " + direction);
}

// One snapshot scans the map once, and rejects disconnected construction.
clearTiles();
const connected = [makeTrack(30, 30, 2, 0, 112), makeTrack(29, 30, 0, 0, 112)];
linkSeq(connected);
for (const el of connected) place(7, el);
map.rides.forEach = fn => fn({ id: 7, type: 52 });
const originalGetTile = map.getTile;
let tileReads = 0;
map.getTile = (...args) => { tileReads++; return originalGetTile(...args); };
const snapshot = request("getCoasterState", { rideId: 7 });
map.getTile = originalGetTile;
assert(snapshot.success && snapshot.payload.history.length === 2 && snapshot.payload.rideType === 52 &&
    snapshot.payload.layoutStatus === "complete", "snapshot contains candidates, history and ride metadata");
assert(tileReads < 128 * 128 + 20, "snapshot performs only one full map scan");
place(7, makeTrack(50, 50, 0, 0, 112));
const disconnected = request("getCoasterState", { rideId: 7 });
assert(disconnected.payload.layoutStatus === "disconnected" && disconnected.payload.validPieces.length === 0,
    "disconnected layouts do not silently offer a construction endpoint");
assert(!request("deleteLastTrackPiece", { rideId: 7 }).success, "disconnected layouts cannot be implicitly edited");
assert(!request("getCoasterState", { rideId: 999 }).success, "missing rides fail explicitly");

// Stacked matching pieces must be distinguished by their iterator height.
clearTiles();
const stacked = [makeTrack(31, 30, 2, 0, 112), makeTrack(30, 30, 0, 0, 112), makeTrack(30, 30, 0, 0, 144)];
linkSeq(stacked);
for (const el of stacked) place(7, el);
let exactRemove = null;
actionHandlers.trackremove = (args, cb) => { exactRemove = args; cb({}); };
assert(request("deleteLastTrackPiece", { rideId: 7 }).success && exactRemove.z === 144,
    "endpoint removal selects the correct height among stacked pieces");
let statusArgs = null;
actionHandlers.ridesetstatus = (args, cb) => { statusArgs = args; cb({}); };
assert(request("closeRide", { rideId: 7 }).success && statusArgs.status === 0,
    "closing a ride uses the game action");
actionHandlers.trackplace = (args, cb) => cb({ error: 9, errorTitle: "Cannot build", errorMessage: "Track is obstructed" });
assert(request("placeTrackPiece", trackArgs).error === "Failed to place track piece: Cannot build: Track is obstructed",
    "placement preserves the game's error title and message");
actionHandlers.ridedemolish = (args, cb) => cb({ error: 1, errorMessage: "Demolition refused" });
assert(request("deleteAllRides").outcome === "partial", "bulk demolition surfaces failures");

// Guarded append resolves the live endpoint, never the caller's placement coordinates.
clearTiles();
const guarded = [makeTrack(31, 30, 2, 0, 112), makeTrack(30, 30, 0, 0, 112)];
linkSeq(guarded);
for (const el of guarded) place(7, el);
guarded[1].hasChainLift = true;
Object.defineProperty(guarded[1], 'brakeBoosterSpeed', { get() {
    throw new Error('Speed getter is inapplicable to Flat');
} });
guarded[1].seatRotation = 3;
guarded[1].colourScheme = 0;
guarded[1].hasCableLift = false;
guarded[1].isInverted = false;
const guardedState = request("getCoasterState", { rideId: 7 }).payload;
assert(guardedState.history[1].options.has_chain_lift === true &&
    guardedState.history[1].options.brake_speed === null && guardedState.history[1].options.seat_rotation === 3,
    "snapshot reads actual construction options, not placement defaults");
let appendActions = 0;
let appendArgs = null;
actionHandlers.trackplace = (args, cb) => {
    appendActions++;
    appendArgs = args;
    cb({ error: 9, errorTitle: "Cannot build", errorMessage: "Track is obstructed" });
};
const appendRequest = { ...trackArgs, ride: 7, trackType: 0, expectedEndpoint: guardedState.position,
    expectedPieceCount: 2, isFromTrackDesign: true };
assert(request("appendTrackPiece", { ...appendRequest, expectedEndpoint: { ...guardedState.position, x: 99 } })
    .error_details.category === "stale_endpoint" && appendActions === 0, "stale append endpoint cannot mutate");
assert(!request("appendTrackPiece", { ...appendRequest, expectedPieceCount: 99 }).success && appendActions === 0,
    "stale append piece count cannot mutate");
assert(!request("appendTrackPiece", { ...appendRequest, trackType: 4 }).success && appendActions === 0,
    "append rejects unsupported connections before submitting an action");
const appendFailure = request("appendTrackPiece", appendRequest);
assert(appendActions === 1 && appendArgs.x === guardedState.position.x * 32 && !appendArgs.isFromTrackDesign,
    "append resolves placement from live state and always uses normal construction mode");
assert(appendFailure.error_details.code === 9 && appendFailure.error_details.message === "Track is obstructed",
    "append preserves structured game errors");

// Preview and guarded removal share exact element selection.
exactRemove = null;
const preview = request("previewTrackRemoval", { rideId: 7 });
assert(preview.success && preview.payload.target.piece_count === 2 &&
    preview.payload.target.base_z_game === 112 && exactRemove === null, "removal preview does not execute an action");
assert(!request("deleteLastTrackPiece", { rideId: 7,
    expectedTarget: { ...preview.payload.target, piece_count: 99 } }).success && exactRemove === null,
    "stale removal preview cannot mutate");
assert(request("deleteLastTrackPiece", { rideId: 7, expectedTarget: preview.payload.target }).success && exactRemove.z === 112,
    "matching removal guard selects the previewed element");

context.getAllObjects = type => [{ index: 3, identifier: "test.wooden", name: "Wooden trains", rideType: [52],
    minCarsInTrain: 2, maxCarsInTrain: 6 }];
const objects = request("getLoadedRideObjects").payload;
assert(objects[0].index === 3 && objects[0].ride_types[0] === 52 && objects[0].track_support === "unknown",
    "loaded ride object discovery keeps track support unknown");

global.park = { research: { inventedItems: [{ type: "ride", rideType: 52, object: 3 }], uninventedItems: [] } };

// A rejected create action must not be mistaken for a successful ride ID.
let namingCalls = 0;
actionHandlers.ridecreate = (args, cb) => cb({ ride: 0, error: 9, errorMessage: "Creation refused" });
actionHandlers.ridesetname = (args, cb) => { namingCalls++; cb({ error: 1, errorMessage: "Name refused" }); };
const createParams = { rideType: 52, rideObject: 65535, entranceObject: 0, colour1: 0, colour2: 0,
    inspectionInterval: 2, name: "Test name" };
const rejectedCreation = request("createRide", createParams);
assert(!rejectedCreation.success && rejectedCreation.outcome === "rejected" && namingCalls === 0,
    "failed creation with an incidental ride ID never renames that ride");
actionHandlers.ridecreate = (args, cb) => cb({ ride: 7 });
const namingFailure = request("createRide", createParams);
assert(namingFailure.payload.rideId === 7 && namingFailure.payload.nameOutcome === "rejected" &&
    namingFailure.payload.nameWarning.indexOf("Name refused") !== -1, "creation preserves partial naming failure");
actionHandlers.ridecreate = (args, cb) => cb(null);
assert(request("createRide", createParams).outcome === "unknown", "missing creation acknowledgement remains unknown");

// Reset is an explicit second-close action, not an implicit close/retry.
let resetActions = 0;
const resetFixture = { status: "testing", guestCount: 0, vehicles: [42] };
map.getRide = id => id === 7 ? resetFixture : null;
map.getEntity = id => id === 42 ? { id: 42 } : null;
actionHandlers.ridesetstatus = (args, cb) => { resetActions++; resetFixture.vehicles = []; cb({}); };
assert(!request("resetRide", { rideId: 7 }).success && resetActions === 0,
    "reset rejects a running ride without closing it");
resetFixture.status = "closed";
resetFixture.guestCount = 1;
assert(!request("resetRide", { rideId: 7 }).success && resetActions === 0,
    "reset refuses to remove guests");
resetFixture.guestCount = 0;
const resetResult = request("resetRide", { rideId: 7 });
assert(resetResult.success && resetResult.payload.vehicles_cleared && resetActions === 1,
    "reset on a closed empty ride submits one action and observes vehicle clearance");
actionHandlers.ridesetstatus = (args, cb) => cb(null);
assert(request("resetRide", { rideId: 7 }).outcome === "unknown", "reset preserves an unknown acknowledgement");
actionHandlers.ridesetstatus = (args, cb) => cb({});
// Allow the initial guard, then fail inspection after the acknowledged action.
map.getRide = () => resetFixture;
actionHandlers.ridesetstatus = (args, cb) => {
    map.getRide = () => { throw new Error("Post-reset inspection unavailable"); };
    cb({});
};
const resetReadFailure = request("resetRide", { rideId: 7 });
assert(resetReadFailure.success && resetReadFailure.payload.vehicles_cleared === null &&
    resetReadFailure.payload.state_error.indexOf("Post-reset") !== -1,
    "an acknowledged reset survives a subsequent inspection failure");

// Park, research and station observations never execute actions.
let readMutations = 0;
const executeBeforeReads = context.executeAction;
context.executeAction = (...args) => { readMutations++; executeBeforeReads(...args); };
global.park = { name: "Read-only park", cash: 1200, bankLoan: 500, maxBankLoan: 1000, entranceFee: 0,
    rating: 600, guests: 42, value: 2000, companyValue: 2700, getFlag: flag => flag === "open",
    research: { funding: 2, priorities: ["rollercoaster"], stage: "designing", progress: 123,
        inventedItems: [{ type: "ride", object: 3, rideType: 52 }],
        uninventedItems: [{ type: "ride", object: 3, rideType: 51 }] } };
global.scenario = { name: "Guest target", status: "inProgress", objective: { type: "guestsBy", guests: 500, year: 3 } };
global.date = { day: 1, month: 0, year: 1, monthsElapsed: 0, ticksElapsed: 1234 };
context.mode = "normal";
context.gameSpeed = 0;
const parkStatus = request("getParkStatus").payload;
assert(parkStatus.park.cash_raw === 1200 && parkStatus.park.guests === 42 && parkStatus.park.open &&
    parkStatus.scenario.objective.guests === 500 && parkStatus.scenario.status === "inProgress" &&
    parkStatus.research.invented_count === 1 && parkStatus.observed_game_tick === 1234,
    "park summary observes finances, objective, research and game tick without interpreting success");
context.mode = "title";
assert(!request("getParkStatus").success, "park summary requires normal game mode");
context.mode = "normal";
context.getAllObjects = () => [{ index: 3, identifier: "test.multi", name: "Multi", rideType: [52, 51, 17, 255, 52] }];
const researched = request("getLoadedRideObjects").payload[0];
assert(JSON.stringify(researched.research.map(r => r.status)) === JSON.stringify(["invented", "uninvented", "unknown"])
    && researched.track_support === "unknown", "research is per ride type/object pair, separate from track support");
clearTiles();
const stationRide = { id: 7, type: 52, stations: [
    { start: { x: 320, y: 352, z: 112 }, length: 3,
        entrance: { x: 320, y: 320, z: 112, direction: 1 },
        exit: { x: -32768, y: 0, z: 0, direction: 0 } },
    { start: null },
] };
map.getRide = id => id === 7 ? stationRide : null;
map.rides.forEach = fn => fn(stationRide);
tiles.set("10,10", [{ type: "footpath", baseZ: 112, clearanceZ: 128, edges: 5, slopeDirection: null,
    isQueue: true, ride: 7, station: 0, isGhost: false, surfaceObject: 2, railingsObject: 3, object: null },
    { type: "footpath", baseZ: 144, clearanceZ: 160, edges: 1, slopeDirection: 2, isQueue: false,
        ride: null, station: null, isGhost: true }]);
const ordinaryPath = tiles.get("10,10")[1];
Object.defineProperties(ordinaryPath, {
    ride: { get() { throw new Error("Non-queue paths have no ride assignment"); } },
    station: { get() { throw new Error("Non-queue paths have no station assignment"); } },
});
const access = request("getRideStationAccess", { rideId: 7, radius: 1 }).payload;
assert(access.stations.length === 1 && access.stations[0].entrance.position.y === 10 &&
    access.stations[0].exit.status === "absent" && access.stations[0].start.position.z === 14,
    "station coordinates are normalized and null station/entrance sentinels are not treated as present");
assert(access.paths.length === 2 && access.paths[0].edges === 5 && access.paths[0].ride_id === 7 &&
    access.paths[1].is_ghost && access.paths[1].base_z === 18 && access.guest_access === "unknown",
    "bounded paths preserve heights, queue edges and ghosts without claiming connectivity");
assert(request("getRideStationAccess", { rideId: 999, radius: 1 }).error === "Ride not found" &&
    !request("getRideStationAccess", { rideId: 7, radius: 5 }).success, "station inspection bounds inputs");
const stationState = request("getCoasterState", { rideId: 7 }).payload;
assert(stationState.stations[0].entrance.status === "present" && stationState.stations[0].exit.status === "absent",
    "coaster snapshots retain station building observations for acceptance checks");
clearTiles();
const brakeElement = makeTrack(10, 10, 99, 0, 112);
brakeElement.brakeBoosterSpeed = 12;
place(7, brakeElement);
assert(request("getCoasterState", { rideId: 7 }).payload.history[0].options.brake_speed === 12,
    "Brakes speed readback remains available without reading the getter on other types");
assert(researched.ride_types.length === 3, "ride object types omit null sentinels and duplicates");
assert(readMutations === 0, "park, research, station and state reads execute no game actions");

// Guest-operation regressions: building directions and conservative path edits.
context.executeAction = executeBeforeReads;
clearTiles();
const directionRide = { id: 7, type: 52, status: "closed", guestCount: 0, stations: [
    { start: { x: 320, y: 320, z: 112 }, length: 2, entrance: null, exit: null },
] };
map.rides.forEach = fn => fn(directionRide);
map.getRide = () => directionRide;
const buildingArgs = [];
actionHandlers.rideentranceexitplace = (args, cb) => {
    buildingArgs.push(args);
    directionRide.stations[0][args.isExit ? "exit" : "entrance"] = {
        x: args.x, y: args.y, z: 112, direction: args.direction,
    };
    cb({ cost: 0 });
};
function stationWorld(direction) {
    clearTiles();
    const el = makeTrack(10, 10, 1, direction, 112);
    el.station = 0;
    place(7, el);
    for (const [x, y] of [[9, 10], [11, 10], [10, 9], [10, 11], [11, 9]]) {
        tiles.set(x + "," + y, [{ type: "surface", baseZ: 112 }]);
    }
    directionRide.stations[0].entrance = directionRide.stations[0].exit = null;
    buildingArgs.length = 0;
}
for (let direction = 0; direction < 4; direction++) {
    stationWorld(direction);
    const auto = request("placeEntranceExit", { rideId: 7 });
    const expectedDirs = direction % 2 === 0 ? [1, 3] : [2, 0];
    assert(auto.success && buildingArgs.length === 2 &&
        buildingArgs.every((args, index) => args.direction === expectedDirs[index]),
        "automatic station buildings face toward station, heading " + direction);
    assert(request("placeEntranceExit", { rideId: 7 }).success && buildingArgs.length === 2,
        "automatic helper preserves existing buildings rather than relocating them");
}
stationWorld(0);
const anotherStation = makeTrack(11, 10, 1, 0, 112);
anotherStation.station = 0;
place(7, anotherStation);
const entranceTarget = { rideId: 7, building: "entrance", x: 10, y: 9, direction: 1 };
assert(request("placeStationBuilding", entranceTarget).success &&
    request("placeStationBuilding", { ...entranceTarget, building: "exit", x: 11 }).success &&
    buildingArgs.length === 2 && buildingArgs.every(args => args.y === 288),
    "explicit buildings may occupy adjacent tiles on the same side of a station");
assert(!request("placeStationBuilding", { ...entranceTarget, x: 11 }).success && buildingArgs.length === 2,
    "existing buildings cannot be relocated without an exact observation guard");
const existingEntrance = request("getRideStationAccess", { rideId: 7, radius: 0 }).payload.stations[0].entrance.position;
assert(!request("placeStationBuilding", { ...entranceTarget, y: 11,
    expected_position: { ...existingEntrance, z: 16 } }).success && buildingArgs.length === 2,
    "stale relocation guard rejects without executing an action");
assert(request("placeStationBuilding", { ...entranceTarget, y: 11, direction: 3,
    expected_position: existingEntrance }).success && buildingArgs.length === 3 &&
    directionRide.stations[0].entrance.y === 352,
    "guarded relocation uses the normal game action without a separate demolition");
stationWorld(0);
for (const invalid of [
    { ...entranceTarget, x: 9, direction: 2 }, // Faces along station track, not its side.
    { ...entranceTarget, direction: 3 }, // Faces away.
    { ...entranceTarget, y: 8 }, // Not adjacent.
    { ...entranceTarget, expected_position: existingEntrance }, // Building absent.
]) assert(!request("placeStationBuilding", invalid).success && buildingArgs.length === 0,
    "invalid station position or obsolete guard cannot mutate");
for (const value of [1, null, undefined]) {
    directionRide.guestCount = value;
    assert(!request("placeStationBuilding", entranceTarget).success && buildingArgs.length === 0,
        "station edits reject nonzero or unknown guests");
}
directionRide.guestCount = 0;
directionRide.status = "open";
assert(!request("placeStationBuilding", entranceTarget).success && buildingArgs.length === 0,
    "station edits require a closed ride");
directionRide.status = "closed";
tiles.get("10,9").push({ type: "wall", baseZ: 112 });
assert(!request("placeStationBuilding", entranceTarget).success && buildingArgs.length === 0,
    "station placement cannot clear existing scenery");
stationWorld(0);
const normalBuildingAction = actionHandlers.rideentranceexitplace;
for (const prefix of [0, 1]) {
    stationWorld(0);
    let attempts = 0;
    actionHandlers.rideentranceexitplace = (args, cb) => {
        attempts++;
        if (attempts <= prefix) normalBuildingAction(args, cb);
        else cb(null);
    };
    const unknown = request("placeEntranceExit", { rideId: 7 });
    assert(!unknown.success && unknown.outcome === "unknown" && attempts === prefix + 1 &&
        unknown.error_details.confirmed_steps === prefix,
        "automatic helper stops on unknown acknowledgement and retains confirmed prefix " + prefix);
}
actionHandlers.rideentranceexitplace = normalBuildingAction;
for (const prefix of [0, 1]) {
    stationWorld(0);
    directionRide.stations[0][prefix === 0 ? "entrance" : "exit"] = undefined;
    const unknownPosition = request("placeEntranceExit", { rideId: 7 });
    assert(!unknownPosition.success && unknownPosition.outcome === "rejected" &&
        unknownPosition.error_details.confirmed_steps === prefix && buildingArgs.length === prefix,
        "unknown position prevents a new action without claiming unknown acknowledgement, prefix " + prefix);
}
clearTiles();
context.getAllObjects = type => type === "footpath_surface" ? [{ index: 2, identifier: "surface", name: "Surface", flags: 0 }] :
    [{ index: 3, identifier: "railings", name: "Railings" }];
const ground = { type: "surface", baseZ: 112, clearanceZ: 112, slope: 0, waterHeight: 0, isGhost: false };
const overhead = { type: "track", baseZ: 160, clearanceZ: 192, ride: 7 };
tiles.set("30,30", [ground, overhead]);
let pathActions = 0;
actionHandlers.footpathplace = (args, cb) => {
    pathActions++;
    assert(args.x === 960 && args.y === 960 && args.z === 112 && args.direction === 255 && args.constructFlags === 1,
        "flat queue action converts units and avoids directed wall-clearing construction");
    tiles.get("30,30").push({ type: "footpath", baseZ: 112, clearanceZ: 144, isGhost: false,
        slopeDirection: null, edges: 0, isQueue: true, ride: 7, station: 0,
        surfaceObject: 2, railingsObject: 3, object: null, addition: null });
    cb({ cost: 100 });
};
actionHandlers.footpathremove = (args, cb) => {
    pathActions++; tiles.set("30,30", [ground, overhead]); cb({ cost: -50 });
};
const pathParams = { x: 30, y: 30, z: 14, surface_object: 2, railings_object: 3, is_queue: true };
assert(!request("placePathTile", { ...pathParams, z: 15 }).success && pathActions === 0,
    "odd path heights reject before game action");
const pathPlaced = request("placePathTile", pathParams);
assert(pathPlaced.success && pathPlaced.payload.observed_after.paths[0].ride_id === 7 && pathActions === 1,
    "ground paths may pass under sufficiently elevated track and retain queue assignment");
assert(!request("placePathTile", pathParams).success && pathActions === 1, "existing paths cannot be replaced");
const selectedPath = pathPlaced.payload.observed_after.paths[0];
const pathElement = tiles.get("30,30")[2];
pathElement.addition = 0;
const withAddition = request("getPathArea", { x: 30, y: 30, radius: 0 }).payload.paths[0];
assert(!request("removePathTile", { x: 30, y: 30, z: 14, expected_path: withAddition }).success && pathActions === 1,
    "even a matching observation cannot remove a path carrying an addition");
pathElement.addition = null;
assert(!request("removePathTile", { x: 30, y: 30, z: 14, expected_path: { ...selectedPath, edges: 1 } }).success && pathActions === 1,
    "stale path observation rejects removal");
assert(request("removePathTile", { x: 30, y: 30, z: 14, expected_path: selectedPath }).success && pathActions === 2 &&
    tiles.get("30,30")[1] === overhead, "guarded removal retains overhead track");
ground.slope = 1;
ground.waterHeight = 16;
actionHandlers.footpathplace = (args, cb) => {
    pathActions++;
    assert(args.z === 160 && args.slopeType === 1 && args.slopeDirection === 2 && args.direction === 255,
        "elevated sloped path uses the caller's lower height and uphill direction without directional wall clearing");
    cb({ cost: 150 });
};
assert(request("placePathTile", { ...pathParams, z: 20, slope_direction: 2 }).success && pathActions === 3,
    "bridge/sloped placement leaves terrain, water and support clearance to native action");
assert(!request("placePathTile", { ...pathParams, slope_direction: 4 }).success && pathActions === 3,
    "invalid slope directions reject before action");
ground.slope = 0; ground.waterHeight = 0;
tiles.get("30,30").push({ type: "small_scenery", baseZ: 112 });
assert(!request("placePathTile", pathParams).success && pathActions === 3, "path placement never clears local scenery");
const saves = [];
context.saveGame = options => saves.push(options.filename);
const saveName = "mcp-contract-0123456789abcdef0123456789abcdef";
assert(request("savePark", { filename: saveName }).payload.file_written === "unknown" && saves.length === 1,
    "checkpoint acknowledgement does not claim persistence");
assert(!request("savePark", { filename: saveName }).success && !request("savePark", { filename: "../existing" }).success && saves.length === 1,
    "checkpoint rejects reused names and path traversal");


// Financial readings preserve accounting periods and unavailable values. Pricing
// uses an engine action, not direct property assignment or altered park rules.
const financeRides = [
    { id: 0, name: "Paid coaster", type: 52, classification: "ride", status: "open",
        object: { shopItem: 255 }, price: [10, 15], runningCost: 4, incomePerHour: 96,
        profit: 32, totalProfit: -12, totalCustomers: 3 },
    { id: 1, name: "Other photo ride", type: 52, classification: "ride", status: "closed",
        object: { shopItem: 255 }, price: [0, 12] },
];
map.getRide = id => financeRides.find(ride => ride.id === id) || null;
map.rides.forEach = fn => financeRides.forEach(fn);
const financeFlags = new Set(["freeParkEntry"]);
park.getFlag = flag => financeFlags.has(flag);
let priceActions = 0;
actionHandlers.ridesetprice = (args, cb) => {
    priceActions++;
    assert(args.ride === 0 && Number.isInteger(args.price), "price action retains raw engine units and ride ID zero");
    const index = args.isPrimaryPrice ? 0 : 1;
    // Simulate the engine's common-photo-price cascade.
    const affected = index === 0 ? [financeRides[0]] : financeRides;
    affected.forEach(ride => { ride.price[index] = args.price; });
    cb({});
};
const finances = request("getRideFinances", { rideId: 0 }).payload;
assert(finances.prices[0].price_raw === 10 && finances.prices[0].effective_price_raw === 10 &&
    finances.money_units.raw_per_base_currency_unit === 10 && finances.running_cost_per_fortnight_raw === 4 &&
    finances.running_cost_per_hour_raw === 64 && finances.income_per_hour_estimate_raw === 96 &&
    finances.profit_per_hour_estimate_raw === 32 && finances.total_profit_raw === -12 &&
    finances.total_revenue_raw === null && priceActions === 0,
    "finance read preserves raw tenths, negative lifetime profit and game-estimated accounting periods without mutation");
assert(request("getRideFinances", { rideId: 1 }).payload.running_cost_per_fortnight_raw === null,
    "unavailable financial fields are not invented as zero");
financeRides[1].runningCost = -9223372036854775808;
financeRides[1].profit = -2147483648;
assert(request("getRideFinances", { rideId: 1 }).payload.running_cost_per_hour_raw === null &&
    request("getRideFinances", { rideId: 1 }).payload.profit_per_hour_estimate_raw === null,
    "undefined money sentinels are not presented as enormous negative finances");
const priceParams = { rideId: 0, price_raw: 20, expected_price_raw: 10, price_index: 0, allow_shared_price_changes: false };
for (const invalid of [
    { price_raw: -1 }, { price_raw: 201 }, { price_raw: 1.5 }, { price_raw: true },
    { price_index: 2 }, { expected_price_raw: undefined }, { expected_price_raw: 11 },
    { allow_shared_price_changes: 1 }, { rideId: 999 },
]) assert(!request("setRidePrice", { ...priceParams, ...invalid }).success && priceActions === 0,
    "invalid/stale financial input cannot submit a price action");
for (const noMoney of [false, true]) {
    financeFlags.clear();
    if (noMoney) financeFlags.add("noMoney");
    const restricted = request("getRideFinances", { rideId: 0 }).payload;
    assert(restricted.prices[0].effective_price_raw === 0 && !restricted.prices[0].charging_allowed &&
        !request("setRidePrice", priceParams).success && priceActions === 0,
        "locked admission or no-money mode rejects price actions, not just misleadingly storing a price");
}
financeFlags.clear(); financeFlags.add("unlockAllPrices");
const priced = request("setRidePrice", priceParams);
assert(priced.success && priced.payload.stored_price_matches_request &&
    priced.payload.observed_after.prices[0].effective_price_raw === 20 && priceActions === 1 &&
    financeRides[0].status === "open" && priced.payload.observed_price_changes.length === 1 &&
    priced.payload.observed_price_changes[0].before_raw === 10,
    "normal price setting reads back the effective price and changes no operating status");
const photoParams = { ...priceParams, price_index: 1, price_raw: 18, expected_price_raw: 15 };
assert(!request("setRidePrice", photoParams).success && priceActions === 1,
    "possibly shared prices require explicit consent before any engine action");
const shared = request("setRidePrice", { ...photoParams, allow_shared_price_changes: true });
assert(shared.success && shared.payload.observed_after.prices[1].price_raw === 18 && priceActions === 2 &&
    shared.payload.observed_price_changes.some(change => change.ride_id === 1 && change.before_raw === 12 && change.after_raw === 18),
    "shared-price consent permits the normal cascade and reports observed changes to other rides");
actionHandlers.ridesetprice = (args, cb) => { priceActions++; cb({ error: 9, errorTitle: "Cannot price", errorMessage: "Game refusal" }); };
const rejectedPrice = request("setRidePrice", { ...priceParams, expected_price_raw: 20 });
assert(!rejectedPrice.success && rejectedPrice.outcome === "rejected" && rejectedPrice.error_details.code === 9,
    "game price errors retain structured rejection details");
actionHandlers.ridesetprice = (args, cb) => { priceActions++; cb(null); };
const unknownPrice = request("setRidePrice", { ...priceParams, expected_price_raw: 20 });
assert(!unknownPrice.success && unknownPrice.outcome === "unknown" && priceActions === 4,
    "unknown price acknowledgement is not automatically retried");
actionHandlers.ridesetprice = (args, cb) => {
    map.getRide = () => { throw new Error("Finance readback unavailable"); };
    cb({});
};
const confirmedPrice = request("setRidePrice", { ...priceParams, expected_price_raw: 20 });
assert(confirmedPrice.success && confirmedPrice.payload.observed_after === null &&
    confirmedPrice.payload.state_error.includes("readback unavailable"),
    "acknowledged price change survives unavailable financial readback");

// ---------------------------------------------------------------------------

// Registry dispatch is an allowlist with per-endpoint validation, not an arbitrary action API.
const registryRide = { id: 0, inspectionInterval: 2, minimumWaitingTime: 10, maximumWaitingTime: 60 };
map.getRide = id => id === 0 ? registryRide : null;
let registryCalls = [];
actionHandlers.ridesetsetting = (args, cb) => {
    registryCalls.push(args);
    registryRide.inspectionInterval = args.value;
    cb({});
};
const inspection = request("setRideInspectionInterval", { rideId: 0, interval: "every_hour" });
assert(inspection.success && inspection.payload.observed_before.inspection_interval === 2 &&
    inspection.payload.observed_after.inspection_interval === 4 && inspection.payload.readback_matches_request &&
    JSON.stringify(registryCalls) === JSON.stringify([{setting: 5, ride: 0, value: 4}]),
    "registry maps named inspection intervals to the reviewed normal action and observes both states");
for (const params of [{rideId: -1, interval: "never"}, {rideId: 0, interval: 6},
    {rideId: 0, interval: "toString"}, {rideId: 0, interval: "never", action: "cheatset"},
    {rideId: 99, interval: "never"}]) {
    assert(!request("setRideInspectionInterval", params).success, "invalid registry inputs reject before mutation");
}
context.mode = "title";
assert(!request("setRideInspectionInterval", {rideId: 0, interval: "never"}).success,
    "registry actions reject outside normal game mode");
context.mode = "normal";
for (const endpoint of ["executeAction", "constructor", "__proto__", "cheatset"]) {
    assert(!request(endpoint, {rideId: 0}).success, "non-allowlisted action endpoints reject");
}
assert(registryCalls.length === 1, "validation does not execute game actions");
for (const result of [{error: 9, errorTitle: "Cannot set", errorMessage: "Game refusal"}, null]) {
    actionHandlers.ridesetsetting = (args, cb) => { registryCalls.push(args); cb(result); };
    const failed = request("setRideInspectionInterval", {rideId: 0, interval: "never"});
    assert(!failed.success && failed.outcome === (result ? "rejected" : "unknown") &&
        (!result || failed.error_details.code === 9), "registry preserves rejection versus unknown outcomes");
}
assert(registryCalls.length === 3, "unknown outcomes are never retried");
actionHandlers.ridesetsetting = (args, cb) => cb({});
const mismatch = request("setRideInspectionInterval", {rideId: 0, interval: "never"});
assert(mismatch.success && mismatch.payload.readback_matches_request === false,
    "successful acknowledgement does not imply matching readback");
actionHandlers.ridesetsetting = (args, cb) => {
    map.getRide = () => { throw new Error("Readback unavailable"); }; cb({});
};
const unreadable = request("setRideInspectionInterval", {rideId: 0, interval: "never"});
assert(unreadable.success && unreadable.payload.observed_after === null &&
    unreadable.payload.state_error.includes("Readback unavailable"),
    "registry retains acknowledged action when readback fails");

// Declarative observations never execute actions, and boolean setters use numeric engine values.
const projectedRide = { type: 52, name: "Observed", status: "closed", mode: 1, departFlags: 0,
    minimumWaitingTime: 10, maximumWaitingTime: 60, liftHillSpeed: 5, minLiftHillSpeed: 3,
    maxLiftHillSpeed: 20, music: 0, flags: 256, inspectionInterval: 2, reliability: 97.5, downtime: 0, age: 3 };
map.getRide = id => id === 0 ? projectedRide : null;
let projectedActions = 0;
actionHandlers.ridesetsetting = (args, cb) => {
    projectedActions++;
    assert(args.setting === 6 && args.value === 1, "boolean setting maps to a normal numeric engine argument");
    projectedRide.flags |= 8192; cb({});
};
const maintenanceProjection = request("getRideMaintenanceStatus", {rideId: 0});
assert(maintenanceProjection.success && maintenanceProjection.payload.reliability_percent === 97.5 &&
    maintenanceProjection.payload.due_inspection === true && maintenanceProjection.payload.broken_down === false,
    "read-only projection preserves decimal percentages and decodes reviewed flags");
const operatingProjection = request("getRideOperatingSettings", {rideId: 0});
assert(operatingProjection.success && operatingProjection.payload.minimum_lift_hill_speed_mph === 3 &&
    operatingProjection.payload.music_enabled === false, "operating observation exposes discovery and bounds");
context.getAllObjects = type => { assert(type === "music", "object type is fixed by the registry");
    return [{ index: 2, identifier: "test.music", name: "Music" }]; };
const loadedMusic = request("getLoadedMusicObjects", {});
assert(loadedMusic.success && loadedMusic.payload.objects[0].index === 2 && projectedActions === 0,
    "loaded-object observations are read-only and return park-local indices");
assert(!request("getLoadedMusicObjects", {object_type: "ride"}).success &&
    !request("getRideOperatingSettings", {rideId: 999}).success,
    "read projections reject client-selected sources and absent rides");
assert(!request("setRideMusicEnabled", {rideId: 0, enabled: 1}).success && projectedActions === 0,
    "raw boolean input must really be a boolean");
const enabledMusic = request("setRideMusicEnabled", {rideId: 0, enabled: true});
assert(enabledMusic.success && enabledMusic.payload.readback_matches_request && projectedActions === 1,
    "boolean action reads back its flag independently from playback");
projectedRide.reliability = NaN;
assert(!request("getRideMaintenanceStatus", {rideId: 0}).success && projectedActions === 1,
    "unavailable numeric observations fail without mutation or fabricated zero values");

// Every generated action reaches exactly the reviewed native visitor with typed mappings.
const fullRegistry = JSON.parse(fs.readFileSync(path.join(__dirname, "../openrct2_mcp/actions.json"), "utf8"));
function projectionFixture(fields, args) {
    const root = {};
    for (const field of fields || []) {
        let value = field.type === "boolean" ? false : field.type === "string" ? "Observed" : 0;
        if (field.type === "record") value = projectionFixture(field.fields, args);
        if (field.type === "array") value = [field.fields ? projectionFixture(field.fields, args) :
            field.item_type === "string" ? "observed" : 0];
        if (field.bit_mask) value = 0;
        if (field.index_arg) value = [field.member ? {[field.member]: value} : value];
        if (field.method) { root[field.method] = () => value; continue; }
        let object = root;
        const parts = field.property.split(".");
        for (const part of parts.slice(0, -1)) object = object[part] || (object[part] = {});
        object[parts[parts.length - 1]] = value;
    }
    return root;
}
let fullActionCount = 0;
for (const op of fullRegistry.operations.filter(op => op.action)) {
    const wire = {}, requested = {}, expected = {...op.constants};
    for (const arg of op.arguments || []) {
        const value = arg.values ? Object.keys(arg.values)[0] : arg.type === "string" ? "New name" :
            arg.type === "boolean" ? true : arg.minimum || 0;
        wire[arg.wire_name] = value; requested[arg.name] = value;
        expected[arg.action_field] = arg.boolean_as_integer ? Number(value) : arg.values ? arg.values[value] : value;
    }
    const target = projectionFixture(op.readback && op.readback.fields, requested);
    if (op.arguments.some(arg => arg.name === "ride_id")) Object.assign(target, {mode: 1, vehicles: [65535], stations: [], object: {flags: 0}});
    target.type = op.arguments.some(arg => arg.name === "ride_id") ? 52 : op.entity_type || "staff";
    map.getRide = () => target; map.getEntity = () => target;
    context.getAllObjects = () => [{index: 0, rideType: [0, 52]}];
    park.research.inventedItems = [{type: "ride", rideType: 0, object: 0}, {type: "ride", rideType: 52, object: 0}];
    context.mode = op.allowed_modes ? op.allowed_modes[0] : "normal";
    if (op.target === "park") Object.assign(park, target);
    if (op.target === "research") Object.assign(park.research, target);
    if (op.target === "context") Object.assign(context, target);
    let seen;
    actionHandlers[op.action] = (args, cb) => { fullActionCount++; seen = args;
        cb({cost: 5, ride: 0, peep: 0, bannerIndex: 0}); };
    const result = request(op.endpoint, wire);
    assert(result.success && JSON.stringify(seen) === JSON.stringify(expected),
        "reviewed native action binding: " + op.name + (result.error ? " " + result.error : ""));
    if (op.result_fields && op.result_fields.some(field => field.property === "peep")) {
        assert(result.payload.game_result.entity_id === 0, "native creation result preserves entity ID zero");
    }
}
assert(fullActionCount === fullRegistry.operations.filter(op => op.action).length,
    "generated actions submit once each, including boolean native args and fixed subtypes");
context.mode = "normal";
let editorSaved;
context.mode = "scenario_editor"; context.saveGame = options => { editorSaved = options.filename; };
const editorCheckpoint = request("savePark", {filename: "mcp-editor-1234567890abcdef1234567890abcdef"});
assert(editorCheckpoint.success && editorCheckpoint.payload.file_written === "unknown" &&
    editorSaved === "mcp-editor-1234567890abcdef1234567890abcdef",
    "editor park-data checkpoints retain UUID-only naming and unknown persistence");
context.mode = "normal";
const callsBeforeReads = fullActionCount;
map.getEntity = id => id === 0 ? {id: 0, type: "guest", thoughts: [
    {type: "lost", item: 0, freshness: 1, freshTimeout: 2},
    {type: "hungry", item: 3, freshness: 4, freshTimeout: 5}]} : null;
const thoughts = request("getGuestThoughts", {guest_id: 0, offset: 1, limit: 1});
assert(thoughts.success && thoughts.payload.guest_id === 0 && thoughts.payload.thoughts_total === 2 &&
    JSON.stringify(thoughts.payload.thoughts) === JSON.stringify([
        {type: "hungry", item: 3, freshness: 4, fresh_timeout: 5}]),
    "paged nested records preserve total, selected fields and entity ID zero");
assert(!request("getGuestThoughts", {guest_id: 0, offset: 0, limit: 257}).success &&
    !request("getGuestThoughts", {guest_id: 9, offset: 0, limit: 1}).success,
    "array page bounds and missing entity reject without actions");
map.getEntity = () => ({id: 0, type: "staff", patrolArea: {tiles: [{x: 12, y: 34}]}});
const patrol = request("getStaffPatrolTiles", {staff_id: 0, offset: 0, limit: 1});
assert(patrol.success && patrol.payload.tiles[0].x_tile === 12 && patrol.payload.tiles[0].y_tile === 34,
    "patrol reads retain tile indices rather than mislabeling them game coordinates");
park.getMonthlyExpenditure = category => { assert(category === "wages", "accounting enum reaches native reader"); return [0, -15]; };
const expenditure = request("getMonthlyExpenditure", {category: "wages"});
assert(expenditure.success && expenditure.payload.amounts_raw_total === 2 && expenditure.payload.amounts_raw[1] === -15,
    "reviewed read method projects a scalar array without mutation");
context.getAllObjects = () => [];
assert(!request("setStaffCostume", {staff_id: 0, costume_object: 99}).success &&
    !request("setRideStationStyle", {rideId: 0, station_object: 99}).success,
    "unloaded costume/station objects reject before unsafe native dereferences");
assert(!request("setEditorLandRights", {x1_game: 32, y1_game: 32, x2_game: 32, y2_game: 32,
    setting: "unown_land", ownership_mask: 0}).success, "editor ownership cannot grant land during normal play");
assert(!request("deleteRide", {rideId: 65536}).success &&
    !request("getCoasterState", {rideId: 65536}).success,
    "out-of-range ride IDs cannot wrap to a different ride in native uint16 conversion");
assert(!request("setTrackBrakeSpeed", {x_game: 32, y_game: 32, z_game: 112, track_type: "flat", speed: 10}).success,
    "brake speed cannot overwrite unrelated track/maze union data");
const surfaceForProjection = {type: "surface", baseHeight: 14, baseZ: 112, clearanceHeight: 14,
    clearanceZ: 112, occupiedQuadrants: 0, isGhost: false, isHidden: false,
    slope: 0, surfaceStyle: 0, edgeStyle: 0, waterHeight: 0, grassLength: 0,
    ownership: 128, parkFences: 0, hasOwnership: true, hasConstructionRights: false};
Object.defineProperty(surfaceForProjection, "trackType", {get() { throw new Error("Wrong element getter"); }});
map.getTile = () => ({numElements: 1, elements: [surfaceForProjection]});
const tileProjection = request("getMapTile", {x_tile: 1, y_tile: 2});
assert(tileProjection.success && tileProjection.payload.elements_total === 1 &&
    tileProjection.payload.elements[0].base_z_game === 112 && tileProjection.payload.elements[0].track_type === null &&
    tileProjection.payload.elements[0].brake_booster_speed === null,
    "conditional world projections never read an inapplicable native getter");
context.mode = "title"; context.paused = false; context.gameSpeed = 1; context.apiVersion = 124;
assert(request("getGameState").success && fullActionCount === callsBeforeReads,
    "read projections and rejected selections never submit mutations, and game-state discovery works outside a park");

// Acknowledgement survives a later track-inspection exception, for both mutations.
const tileReaderBeforeInspectionFailure = map.getTile;
const executorBeforeInspectionFailure = context.executeAction;
for (const endpoint of ["placeTrackPiece", "deleteLastTrackPiece"]) {
    clearTiles();
    map.getTile = (x, y) => {
        const entries = tiles.get(x + "," + y);
        return entries ? { numElements: entries.length, elements: entries } : null;
    };
    const piece = makeTrack(8, 8, 0, 0, 112);
    place(7, piece);
    linkSeq([piece], false);
    let acknowledgements = 0;
    context.executeAction = (name, args, cb) => {
        acknowledgements++;
        map.getTile = () => { throw new Error("Post-action tile inspection unavailable"); };
        cb(name === "trackplace" ? { position: { x: args.x, y: args.y, z: args.z } } : {});
    };
    const params = endpoint === "placeTrackPiece" ? { ...trackArgs, ride: 7, includeState: true } : { rideId: 7 };
    const response = request(endpoint, params);
    assert(acknowledgements === 1 && !response.success && response.outcome === "confirmed" &&
        response.error_details.category === "post_action_inspection" && response.error.includes("tile inspection"),
        endpoint + " retains acknowledgement when post-action inspection throws, without retry");
}
map.getTile = tileReaderBeforeInspectionFailure;
context.executeAction = executorBeforeInspectionFailure;

// Native scalar validation alone does not enforce availability of every UI control.
context.mode = "normal";
map.getRide = () => ({type: 33, object: {flags: 0}, mode: 1, vehicles: [65535], stations: []});
assert(!request("setRideTrainsReversed", {rideId: 0, reversed: true}).success &&
    !request("setRideCircuitCount", {rideId: 0, circuits: 2}).success,
    "flat rides cannot gain reversal/multiple-circuit controls through native setting gaps");
map.getRide = () => ({type: 52, object: {flags: 8388608}, mode: 1, vehicles: [65535], stations: []});
assert(!request("setRideTrainsReversed", {rideId: 0, reversed: true}).success,
    "a vehicle's native noReverseOption flag is respected independently of its ride type");

// Ordinary-player construction uses explicit selections, not the coaster iterator.
context.mode = "normal";
clearTiles();
map.getTile = (x, y) => ({numElements: (tiles.get(x + "," + y) || []).length,
    elements: tiles.get(x + "," + y) || []});
const buildObjects = [{index: 2, identifier: "test.carousel", name: "Carousel", rideType: [33]},
    {index: 3, identifier: "test.shop", name: "Shop", rideType: [28]},
    {index: 4, identifier: "test.wooden", name: "Wooden", rideType: [52]}];
context.getAllObjects = () => buildObjects;
park.research.inventedItems = buildObjects.map(obj => ({type: "ride", rideType: obj.rideType[0], object: obj.index}));
park.research.uninventedItems = [];
let buildingRide = {id: 0, type: 33, status: "closed", guestCount: 0, vehicles: [], stations: [], object: buildObjects[0]};
map.getRide = id => id === 0 ? buildingRide : null;
const options = request("getRideBuildOptions");
assert(options.success && options.payload.ride_types.filter(type => type.footprint_supported).length === 24 &&
    options.payload.ride_types.find(type => type.ride_type === 33).loaded_objects[0].research === "invented",
    "normal build options identify 24 native footprints and actual loaded/invented object choices");
let constructionCalls = 0;
actionHandlers.trackplace = (args, cb) => {
    constructionCalls++;
    assert(args.trackType === 266 && args.rideType === 33 && args.ride === 0 && args.x === 320 && args.z === 112 &&
        args.trackPlaceFlags === 0 && args.isFromTrackDesign === false, "flat ride uses exactly its native footprint and ordinary flags");
    place(0, makeTrack(10, 10, 266, 0, 112));
    cb({cost: 500});
};
const footprintParams = {rideId: 0, x: 10, y: 10, z: 14, direction: 0};
for (const change of [{status: "open"}, {guestCount: 1}, {vehicles: [3]}, {type: 52}]) {
    const original = {...buildingRide}; Object.assign(buildingRide, change);
    assert(!request("placeRideFootprint", footprintParams).success && constructionCalls === 0,
        "footprint requires an empty closed flat ride without guests or vehicles");
    buildingRide = original;
}
buildingRide.vehicles = [65535]; // Native null EntityId for an uninstantiated train.
const flatPlaced = request("placeRideFootprint", footprintParams);
assert(flatPlaced.success && flatPlaced.payload.observed_after.elements_total === 1 && constructionCalls === 1,
    "footprint action reads back physical elements without assuming a linear circuit");
assert(!request("placeRideFootprint", footprintParams).success && constructionCalls === 1,
    "a repeated footprint placement cannot duplicate an already-built ride");
const fragment = makeTrack(12, 10, 0, 0, 112); place(0, fragment);
const disconnectedLayout = request("getRideLayout", {rideId: 0, offset: 1, limit: 1});
assert(disconnectedLayout.success && disconnectedLayout.payload.elements_total === 2 &&
    disconnectedLayout.payload.elements[0].selection.x === 12, "layout inspection paginates even without a connected track iterator");
const selection = disconnectedLayout.payload.elements[0].selection;
actionHandlers.trackremove = (args, cb) => {
    constructionCalls++;
    assert(args.x === 384 && args.z === 112 && args.sequence === 0 && args.trackType === 0,
        "chosen removal submits the exact element height/sequence, not an endpoint or track origin height");
    tiles.delete("12,10"); cb({cost: -20});
};
assert(!request("removeSelectedTrackPiece", {rideId: 0, selection: {...selection, base_z_game: 128}}).success &&
    constructionCalls === 1, "stale selected track cannot mutate");
const wrongRide = makeTrack(12, 10, 0, 0, 112); place(9, wrongRide);
assert(!request("removeSelectedTrackPiece", {rideId: 0, selection}).success && constructionCalls === 1,
    "a coincident native selector from another ride is ambiguous and rejected");
tiles.get("12,10").pop();
assert(request("removeSelectedTrackPiece", {rideId: 0, selection}).payload.observed_after.elements_total === 1 &&
    constructionCalls === 2, "explicit interior/disconnected removal retains unrelated pieces");

// Footprint connection sides come from the native sequence flags, not a guessed rectangle.
const layoutBeforeBuildings = request("getRideLayout", {rideId: 0, offset: 0, limit: 256}).payload;
assert(JSON.stringify(layoutBeforeBuildings.elements[0].connection_directions) === "[]",
    "carousel center does not falsely advertise entrance connections");
const edgePiece = makeTrack(11, 10, 266, 0, 112); edgePiece.sequence = 1; edgePiece.station = null; place(0, edgePiece);
buildingRide.stations = [{start: {x: 320, y: 320, z: 112}, length: 1, entrance: null, exit: null}];
let buildingCalls = 0;
actionHandlers.rideentranceexitplace = (args, cb) => {
    buildingCalls++;
    buildingRide.stations[0].entrance = {x: args.x, y: args.y, z: 112, direction: args.direction}; cb({cost: 0});
};
const edgeDirections = request("getRideLayout", {rideId: 0, offset: 1, limit: 1}).payload.elements[0].connection_directions;
const outward = edgeDirections[0];
const deltas = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const entranceParams = {rideId: 0, building: "entrance", x: 11 + deltas[outward][0], y: 10 + deltas[outward][1],
    direction: (outward + 2) % 4, expected_position: null};
assert(request("placeStationBuilding", entranceParams).success && buildingCalls === 1,
    "a flat ride entrance accepts its source-reviewed sequence connection side");

// Research compatibility is checked before native creation, which does not enforce it itself.
let creationCalls = 0;
actionHandlers.ridecreate = (args, cb) => { creationCalls++; assert(args.rideObject === 4, "automatic creation selects an invented compatible object"); cb({ride: 0}); };
assert(!request("createRide", {...createParams, rideObject: 3}).success && creationCalls === 0,
    "creation rejects a loaded object for the wrong ride type before native action");
park.research.inventedItems = [];
assert(!request("createRide", createParams).success && creationCalls === 0,
    "unknown or unresearched objects are not build permissions");
park.research.inventedItems = [{type: "ride", object: 4, rideType: 52}];
assert(request("createRide", {...createParams, name: ""}).success && creationCalls === 1,
    "ordinary researched creation still preserves ride ID zero");
const forbiddenTrack = request("queryTrackPiece", {...trackArgs, rideType: 11, trackType: 5, hasChainLift: false});
assert(!forbiddenTrack.success, "track groups hidden behind cheats are not accepted merely because native trackplace would accept them");

// Maze callbacks never reach unsafe native code with an invalid ride/type or fill target.
clearTiles();
buildingRide = {id: 0, type: 20, status: "closed", guestCount: 0, vehicles: [], stations: []};
let mazeArgs;
actionHandlers.mazesettrack = (args, cb) => {
    constructionCalls++; mazeArgs = args;
    if (args.mode === 0) {
        const el = makeTrack(20, 20, 101, 0, 112); el.mazeEntry = 65527; place(0, el);
    } else tiles.delete("20,20");
    cb({cost: args.mode === 0 ? 100 : 0});
};
const mazeParams = {rideId: 0, x_game: 640, y_game: 640, z: 14, direction: 0, mode: "build", expected_maze_entry: null};
const beforeMazeCalls = constructionCalls;
assert(!request("editMazeCell", {...mazeParams, rideId: 9}).success &&
    !request("editMazeCell", {...mazeParams, x_game: 641}).success && constructionCalls === beforeMazeCalls,
    "missing maze and misaligned half-cell coordinates reject before native query/action");
const mazeBuilt = request("editMazeCell", mazeParams);
assert(mazeBuilt.success && mazeArgs.isInitialPlacement === true && mazeArgs.z === 112 &&
    mazeBuilt.payload.observed_after.elements[0].maze_entry === 65527, "first maze cell uses native initial placement and reads the maze mask");
assert(!request("editMazeCell", mazeParams).success && constructionCalls === beforeMazeCalls + 1,
    "stale maze tile mask rejects without retry");
assert(request("editMazeCell", {...mazeParams, x_game: 656, direction: 2, mode: "fill", expected_maze_entry: 65527}).success &&
    mazeArgs.mode === 2 && mazeArgs.isInitialPlacement === false && constructionCalls === beforeMazeCalls + 2,
    "fill validates the previous half-cell and submits the actual native fill enum, not stale SDK prose");
assert(!request("editMazeCell", {...mazeParams, mode: "fill"}).success,
    "maze fill cannot query an empty target or manufacture a cursor tile");

for (const endpoint of ["replaceGuestFlagsRaw", "resizeMap", "setEditorLandRights", "placeParkEntrance", "removeParkEntrance", "placeGuestSpawn"]) {
    assert(!request(endpoint, {}).success, "non-player mutation is not registered: " + endpoint);
}
assert(!request("setGameSpeed", {speed: 5}).success, "debug speeds remain unavailable even in normal mode");

if (failures > 0) {
    console.log(failures + " assertion(s) failed");
    process.exit(1);
}
console.log("all plugin tests passed");