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
// Fake plugin API + request driver
// ---------------------------------------------------------------------------
const actionHandlers = {};

// Track segment geometry from the game's own catalog (real descriptor values).
function seg(type, endX, endY, endZ, endDirection) {
    return { type: type, endX: endX, endY: endY, endZ: endZ, endDirection: endDirection, elements: [{ x: 0, y: 0, z: 0 }] };
}
const TEST_SEGMENTS = [
    seg(0, 0, 0, 0, 0), // Flat
    seg(1, 0, 0, 0, 0), // EndStation
    seg(2, 0, 0, 0, 0), // BeginStation
    seg(3, 0, 0, 0, 0), // MiddleStation
    seg(4, 0, 0, 16, 0), // Up25
    seg(5, 0, 0, 64, 0), // Up60
    seg(10, 0, 0, 0, 0), // Down25 (zBegin not exposed; the plugin's adjustment handles the drop)
    seg(16, -64, -64, 0, 3), // LeftQuarterTurn5Tiles
    seg(17, -64, 64, 0, 1), // RightQuarterTurn5Tiles
];

global.registerPlugin = (p) => {
    global.__plugin = p;
};
global.network = {
    createListener: () => listener,
};
global.map = map;
global.context = {
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
    listen: () => {},
};

function request(endpoint, params) {
    const writes = [];
    const conn = {
        on: (evt, fn) => {
            if (!conn.handlers) conn.handlers = {};
            conn.handlers[evt] = fn;
        },
        write: (s) => writes.push(s),
    };
    listener.connectionHandler(conn);
    conn.handlers.data(JSON.stringify({ endpoint: endpoint, params: params || {} }) + "\n");
    return JSON.parse(writes[0]);
}

// Load the real plugin and start it.
const pluginPath = path.join(__dirname, "..", "..", "ridecreation-api.js");
eval(fs.readFileSync(pluginPath, "utf8"));
global.__plugin.main();
const connHandler = listener.connectionHandler;
assert(connHandler != null, "plugin starts and listens");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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
assert(r.payload.history[0].trackType === 2 && r.payload.history[0].x === 67, "first piece is BeginStation at x=67");
assert(r.payload.history[2].trackType === 1 && r.payload.history[2].x === 65, "third piece is EndStation at x=65");
assert(r.payload.history[0].nextX === 66 && r.payload.history[0].nextDirection === 0, "next fields point at the following piece");

// 2. Valid next pieces reflect the last piece's state category.
let r2 = request("getValidNextPieces", { rideId: ride1 });
assert(r2.success === true && r2.payload.stateCategory === "flat", "last piece (Flat) maps to 'flat' category");
assert(JSON.stringify(r2.payload.validPieces) === JSON.stringify([0, 6, 12, 16, 17, 42, 43, 4, 10, 18, 19]),
    "flat category exposes the expected valid pieces");

// 3. A station-only track maps to the station rules.
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
assert(r2.payload.stateCategory === "end_station", "EndStation last -> 'end_station' category");
assert(JSON.stringify(r2.payload.validPieces) === JSON.stringify([0, 6, 12, 16, 17, 18, 19, 42, 43]),
    "end_station exposes track pieces, not more station");

// 4. A ride with no track gets the initial fallback.
clearTiles();
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
assert(eps["4"] && eps["4"].x === 9 && eps["4"].z === 16,
    "Up25 predicts a 2-unit climb (got " + JSON.stringify(eps["4"]) + ")");
assert(eps["10"] && eps["10"].z === 12,
    "Down25 predicts a 2-unit drop (got " + JSON.stringify(eps["10"]) + ")");
assert(eps["16"] && eps["16"].x === 8 && eps["16"].y === 7 && eps["16"].direction === 3,
    "LeftQuarterTurn5Tiles predicts a left turn ending facing direction 3 (got " + JSON.stringify(eps["16"]) + ")");
assert(eps["17"] && eps["17"].x === 8 && eps["17"].y === 13 && eps["17"].direction === 1,
    "RightQuarterTurn5Tiles predicts a right turn ending facing direction 1 (got " + JSON.stringify(eps["17"]) + ")");

// ---------------------------------------------------------------------------

if (failures > 0) {
    console.log(failures + " assertion(s) failed");
    process.exit(1);
}
console.log("all plugin tests passed");