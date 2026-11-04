// Integration test server.
//
// Loads the real ridecreation-api.js with a stubbed game API and exposes the
// plugin's TCP listener over this process's stdio instead of a real socket:
//   - plugin sends responses via  process.stdout.write  (JSON lines)
//   - requests arrive on   process.stdin                (raw bytes)
// The pytest side bridges these to a real TCP socket that the Python MCP
// client connects to, so the full request/response wire contract is tested.
//
// Run with: node src/tests/plugin_server.js   (stdio bridge, no args)

// Route the plugin's console.log to stderr so stdout stays protocol-only.
console.log = (...args) => {
    process.stderr.write(args.join(" ") + "\n");
};
console.warn = console.log;

// ---------------------------------------------------------------------------
// Fake game world: tiles hold track elements, elements are linked in
// placement order so the plugin's track walk works.
// ---------------------------------------------------------------------------
const tiles = new Map(); // "x,y" -> array of elements
const rideTracks = {}; // ride id -> ordered array of elements
const ridesList = []; // simulated rides for listAllRides

function makeTrack(tileX, tileY, trackType, direction, baseZ) {
    return {
        type: "track",
        trackType,
        sequence: 0, isGhost: false,
        station: [1, 2, 3].includes(trackType) ? 0 : null,
        direction,
        baseZ,
        originZ: baseZ,
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

function removeElement(el) {
    const key = el.tileX + "," + el.tileY;
    const arr = tiles.get(key);
    if (arr) {
        const idx = arr.indexOf(el);
        if (idx !== -1) arr.splice(idx, 1);
    }
    if (el.prev) el.prev.next = null;
    if (el.next) el.next.prev = null;
}

const map = {
    size: { x: 128, y: 128 },
    getTile(x, y) {
        const arr = tiles.get(x + "," + y);
        return arr ? { numElements: arr.length, elements: arr } : { numElements: 1, elements: [
            { type: "surface", baseZ: 112, clearanceZ: 112, isGhost: false, slope: 0, waterHeight: 0 }
        ] };
    },
    getTrackIterator(pos, index) {
        const tile = map.getTile(Math.round(pos.x / 32), Math.round(pos.y / 32));
        const el = tile ? tile.elements[index] : null;
        if (!el) return null;
        return makeIterator(el);
    },
    getRide: id => ridesList.find(ride => ride.id === id) || null,
    getEntity: () => null,
    rides: {
        forEach: (fn) => {
            ridesList.forEach(fn);
        },
    },
};

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
            const dx = node.direction === 0 ? -1 : node.direction === 2 ? 1 : 0;
            const dy = node.direction === 1 ? -1 : node.direction === 3 ? 1 : 0;
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
// Fake plugin API: game actions mutate the fake world.
// ---------------------------------------------------------------------------
const actionHandlers = {};
let nextRideId = 0;

actionHandlers["ridecreate"] = (args, cb) => {
    nextRideId++;
    rideTracks[nextRideId] = [];
    ridesList.push({ id: nextRideId, name: "Ride " + nextRideId, type: args.rideType, status: "closed",
        stations: [], vehicles: [], excitement: -1, totalCustomers: 0, guestCount: 0,
        classification: "ride", object: { shopItem: 255 }, price: [10], runningCost: 4,
        incomePerHour: 0, profit: -64, totalProfit: 0,
        inspectionInterval: 2, minimumWaitingTime: 10, maximumWaitingTime: 60,
        flags: 0, mode: 1, departFlags: 0, liftHillSpeed: 5, minLiftHillSpeed: 3, maxLiftHillSpeed: 20,
        music: 0, reliability: 100, downtime: 0, age: 0 });
    cb({ ride: nextRideId });
};

// The real game (TrackAddStationElement) reassigns begin/middle/end to the
// ride's station pieces based on the station's shape: a lone piece becomes an
// EndStation; otherwise the back-most is the BeginStation and the front-most
// the EndStation, with middles in between.
function reclassifyStation(ride) {
    const list = rideTracks[ride];
    const stationIndices = [];
    for (let i = 0; i < list.length; i++) {
        const t = list[i].trackType;
        if (t === 1 || t === 2 || t === 3) stationIndices.push(i);
    }
    if (stationIndices.length === 1) {
        list[stationIndices[0]].trackType = 1;
    } else if (stationIndices.length > 1) {
        for (let i = 0; i < stationIndices.length; i++) {
            const idx = stationIndices[i];
            list[idx].trackType = i === 0 ? 2 : (i === stationIndices.length - 1 ? 1 : 3);
        }
    }
    const rideInfo = map.getRide(ride);
    const previous = rideInfo.stations[0];
    if (stationIndices.length) {
        const start = list[stationIndices[0]];
        rideInfo.stations = [{ start: { x: start.tileX * 32, y: start.tileY * 32, z: start.originZ },
            length: stationIndices.length, entrance: previous ? previous.entrance : null,
            exit: previous ? previous.exit : null }];
    } else {
        rideInfo.stations = [];
    }
}

actionHandlers["trackplace"] = (args, cb) => {
    const ride = args.ride;
    const tileX = Math.floor(args.x / 32);
    const tileY = Math.floor(args.y / 32);
    // The installed-server TCP fixture has one obstruction to exercise partial outcomes.
    if (process.argv.includes("--obstruction") && tileX === 64 && tileY === 66) {
        cb({ error: 9, errorTitle: "Cannot build", errorMessage: "Stub obstruction" });
        return;
    }
    const el = makeTrack(tileX, tileY, args.trackType, args.direction, args.z);
    place(ride, el);
    const list = rideTracks[ride];
    if (list.length > 0) {
        const prev = list[list.length - 1];
        prev.next = el;
        el.prev = prev;
    }
    list.push(el);
    reclassifyStation(ride);
    cb({ position: { x: args.x, y: args.y, z: args.z } });
};

actionHandlers["trackremove"] = (args, cb) => {
    const key = Math.round(args.x / 32) + "," + Math.round(args.y / 32);
    const arr = tiles.get(key);
    let removed = null;
    if (arr) {
        for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i].trackType === args.trackType &&
                arr[i].direction === args.direction &&
                arr[i].baseZ === args.z) {
                removed = arr[i];
                break;
            }
        }
    }
    if (removed) {
        removeElement(removed);
        const list = rideTracks[removed.ride];
        if (list) {
            const idx = list.indexOf(removed);
            if (idx !== -1) list.splice(idx, 1);
        }
    }
    cb({});
};

actionHandlers["ridesetprice"] = (args, cb) => {
    map.getRide(args.ride).price[args.isPrimaryPrice ? 0 : 1] = args.price;
    cb({});
};

actionHandlers["ridesetname"] = (args, cb) => {
    for (const r of ridesList) {
        if (r.id === args.ride) {
            r.name = args.name;
            break;
        }
    }
    cb({});
};

actionHandlers["ridesetsetting"] = (args, cb) => {
    const ride = map.getRide(args.ride);
    if (args.setting === 0) { ride.mode = args.value; ride.vehicles = []; }
    if (args.setting === 5) ride.inspectionInterval = args.value;
    if (args.setting === 6) ride.flags = args.value ? ride.flags | 8192 : ride.flags & ~8192;
    if (args.setting === 7) ride.music = args.value;
    if (args.setting === 8) ride.liftHillSpeed = args.value;
    if (args.setting === 2) {
        ride.minimumWaitingTime = args.value;
        ride.maximumWaitingTime = Math.max(ride.maximumWaitingTime, args.value);
    }
    if (args.setting === 3) {
        ride.maximumWaitingTime = args.value;
        ride.minimumWaitingTime = Math.min(ride.minimumWaitingTime, args.value);
    }
    cb({});
};
actionHandlers["ridesetvehicle"] = (args, cb) => cb({});

actionHandlers["ridedemolish"] = (args, cb) => {
    for (let i = ridesList.length - 1; i >= 0; i--) {
        if (ridesList[i].id === args.ride) {
            ridesList.splice(i, 1);
            break;
        }
    }
    delete rideTracks[args.ride];
    cb({});
};
actionHandlers["ridesetstatus"] = (args, cb) => {
    const ride = map.getRide(args.ride);
    if (ride.status === "closed" && args.status === 0) ride.vehicles = [];
    ride.status = ["closed", "open", "testing"][args.status];
    cb({});
};
actionHandlers["rideentranceexitplace"] = (args, cb) => {
    const station = map.getRide(args.ride).stations[args.station];
    station[args.isExit ? "exit" : "entrance"] = { x: args.x, y: args.y, z: station.start.z, direction: args.direction };
    cb({});
};

actionHandlers["footpathplace"] = (args, cb) => {
    const x = args.x / 32, y = args.y / 32;
    const arr = map.getTile(x, y).elements;
    const el = { type: "footpath", baseZ: args.z, clearanceZ: args.z + 32, edges: 0,
        slopeDirection: null, isQueue: !!args.constructFlags, isGhost: false,
        surfaceObject: args.object, railingsObject: args.railingsObject, object: null, ride: null, station: null };
    arr.push(el); tiles.set(x + "," + y, arr); cb({ cost: 100 });
};
actionHandlers["footpathremove"] = (args, cb) => {
    const key = args.x / 32 + "," + args.y / 32;
    tiles.set(key, tiles.get(key).filter(el => el.type !== "footpath" || el.baseZ !== args.z));
    cb({ cost: -50 });
};

global.registerPlugin = (p) => {
    global.__plugin = p;
};
global.map = map;
global.park = {
    name: process.argv.includes("--tcp") ? "mcp-install-" + require("crypto").randomUUID() : "MCP contract stub",
    cash: 10000, rating: 500, bankLoan: 0, maxBankLoan: 20000, entranceFee: 0,
    guests: 0, value: 0, companyValue: 10000, getFlag: flag => flag === "freeParkEntry",
    research: { inventedItems: [{ type: "ride", object: 0, rideType: 52 }], uninventedItems: [],
        funding: 0, priorities: [], stage: "finished_all", progress: 0 },
};
global.date = { ticksElapsed: 1234, day: 1, month: 0, year: 1, monthsElapsed: 0 };
global.scenario = { name: "Contract stub", status: "inProgress", objective: { type: "haveFun" } };
global.context = {
    mode: "normal", paused: false, gameSpeed: 0, apiVersion: 124,
    getAllObjects: type => type === "footpath_surface" ? [
        { index: 0, identifier: "test.surface", name: "Test path", flags: 0 }
    ] : type === "footpath_railings" ? [
        { index: 0, identifier: "test.railings", name: "Test railings" }
    ] : type === "music" ? [{ index: 0, identifier: "rct2.music.gentle", name: "Gentle" }] : [{ index: 0, identifier: "rct2.ride.ptct1", name: "Wooden", rideType: [52],
        minCarsInTrain: 1, maxCarsInTrain: 7 }],
    saveGame: () => {},
    getAllTrackSegments: () => [
        { type: 0, trackGroup: 1, allowsChainLift: false, endX: 0, endY: 0, endZ: 0, beginDirection: 0, endDirection: 0, beginSlope: 0, endSlope: 0, beginBank: 0, endBank: 0, elements: [{ x: 0, y: 0, z: 0 }] },
        { type: 1, trackGroup: 2, allowsChainLift: false, endX: 0, endY: 0, endZ: 0, beginDirection: 0, endDirection: 0, beginSlope: 0, endSlope: 0, beginBank: 0, endBank: 0, elements: [{ x: 0, y: 0, z: 0 }] },
        { type: 2, trackGroup: 2, allowsChainLift: false, endX: 0, endY: 0, endZ: 0, beginDirection: 0, endDirection: 0, beginSlope: 0, endSlope: 0, beginBank: 0, endBank: 0, elements: [{ x: 0, y: 0, z: 0 }] },
        { type: 3, trackGroup: 2, allowsChainLift: false, endX: 0, endY: 0, endZ: 0, beginDirection: 0, endDirection: 0, beginSlope: 0, endSlope: 0, beginBank: 0, endBank: 0, elements: [{ x: 0, y: 0, z: 0 }] },
    ],
    queryAction: (name, args, cb) => cb({ cost: 100 }),
    executeAction: (name, args, cb) => {
        const h = actionHandlers[name];
        if (h) h(args, cb);
        else cb({});
    },
};

// The plugin's "network listener" is bridged over stdio.
let connHandler = null;
const server = {
    on: (evt, fn) => {
        if (evt === "connection") connHandler = fn;
    },
    listen: (port) => {
        if (process.argv.includes("--tcp")) {
            const listener = require("net").createServer(socket => {
                socket.setEncoding("utf8");
                socket.on("error", () => {});
                connHandler(socket);
            });
            listener.listen(0, "127.0.0.1", () => {
                process.stdout.write(JSON.stringify({ port: listener.address().port, park_name: global.park.name }) + "\n");
            });
            return;
        }
        // A single connection is bridged: requests arrive on stdin, responses
        // go out on stdout.
        let conn = null;
        process.stdin.on("data", (chunk) => {
            if (!conn) {
                conn = {
                    on: (evt, fn) => {
                        if (evt === "data") conn.dataFn = fn;
                    },
                    write: (s) => {
                        // process.stdout is a network-style stream: write sends
                        // immediately, there is no flush().
                        process.stdout.write(s);
                    },
                };
                if (connHandler) connHandler(conn);
            }
            if (conn.dataFn) conn.dataFn(chunk);
        });
        process.stdin.resume();
    },
};
global.network = {
    createListener: () => server,
};

// ---------------------------------------------------------------------------
// Load the real plugin and start it.
// ---------------------------------------------------------------------------
const fs = require("fs");
const path = require("path");
const pluginPath = path.join(__dirname, "..", "..", "ridecreation-api.js");
eval(fs.readFileSync(pluginPath, "utf8"));
global.__plugin.main();

// Signal readiness so the Python side knows the handlers are installed.
process.stderr.write("READY\n");