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
        return arr ? { numElements: arr.length, elements: arr } : null;
    },
    getTrackIterator(pos, index) {
        const tile = map.getTile(Math.round(pos.x / 32), Math.round(pos.y / 32));
        const el = tile ? tile.elements[index] : null;
        if (!el) return null;
        return makeIterator(el);
    },
    getRide: () => null,
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
    ridesList.push({ id: nextRideId, name: "Ride " + nextRideId, type: args.rideType });
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
}

actionHandlers["trackplace"] = (args, cb) => {
    const ride = args.ride;
    const tileX = Math.floor(args.x / 32);
    const tileY = Math.floor(args.y / 32);
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
        const list = rideTracks[args.ride];
        if (list) {
            const idx = list.indexOf(removed);
            if (idx !== -1) list.splice(idx, 1);
        }
    }
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
    cb({});
};
actionHandlers["rideentranceexitplace"] = (args, cb) => {
    cb({});
};

global.registerPlugin = (p) => {
    global.__plugin = p;
};
global.map = map;
global.context = {
    getAllTrackSegments: () => [
        { type: 0, endX: 0, endY: 0, endZ: 0, endDirection: 0, elements: [{ x: 0, y: 0, z: 0 }] },
        { type: 1, endX: 0, endY: 0, endZ: 0, endDirection: 0, elements: [{ x: 0, y: 0, z: 0 }] },
        { type: 2, endX: 0, endY: 0, endZ: 0, endDirection: 0, elements: [{ x: 0, y: 0, z: 0 }] },
        { type: 3, endX: 0, endY: 0, endZ: 0, endDirection: 0, elements: [{ x: 0, y: 0, z: 0 }] },
    ],
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