"""Named, progressively validated cardinal subset; not ride-specific availability."""

# Track Type Mapping
TRACK_TYPES = {
    0: "Flat",
    1: "EndStation",
    2: "BeginStation",
    3: "MiddleStation",
    4: "Up25",
    5: "Up60",
    10: "Down25",
    11: "Down60",
    6: "FlatToUp25",
    7: "Up25ToUp60",
    8: "Up60ToUp25",
    9: "Up25ToFlat",
    12: "FlatToDown25",
    13: "Down25ToDown60",
    14: "Down60ToDown25",
    15: "Down25ToFlat",
    16: "LeftQuarterTurn5Tiles",
    17: "RightQuarterTurn5Tiles",
    42: "LeftQuarterTurn3Tiles",
    43: "RightQuarterTurn3Tiles",
    18: "FlatToLeftBank",
    19: "FlatToRightBank",
    20: "LeftBankToFlat",
    21: "RightBankToFlat",
    32: "LeftBank",
    33: "RightBank",
    22: "BankedLeftQuarterTurn5Tiles",
    23: "BankedRightQuarterTurn5Tiles",
    44: "LeftBankedQuarterTurn3Tiles",
    45: "RightBankedQuarterTurn3Tiles",
    99: "Brakes",
}

# Reverse mapping for input
TRACK_NAME_TO_ID = {v: k for k, v in TRACK_TYPES.items()}

# Ride type IDs -> names. The plugin's track validation is tuned for the
# Wooden Roller Coaster (52); other types may not place correctly.
RIDE_TYPES = {
    0: "Spiral Roller Coaster",
    1: "Stand-up Roller Coaster",
    3: "Inverted Roller Coaster",
    13: "Bobsleigh Coaster",
    15: "Looping Roller Coaster",
    17: "Mine Train Coaster",
    19: "Corkscrew Roller Coaster",
    44: "Vertical Drop Roller Coaster",
    51: "Twister Roller Coaster",
    52: "Wooden Roller Coaster",
    54: "Steel Wild Mouse",
    57: "Flying Roller Coaster",
}

