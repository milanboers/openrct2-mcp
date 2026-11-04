var PLUGIN_VERSION = "0.19.0";

function main() {
    "use strict";

    var checkpointNames = Object.create(null);

    // BEGIN GENERATED ACTION REGISTRY
    var rideEntryFlags = {"cannotBreakDown": 16384, "coveredTrackIsWaterChannel": 512, "disableCollisionCrashes": 262144, "disableColourTab": 524288, "disableDoorConstructionDeprecated": 65536, "disableFirstTwoOperatingModesDeprecated": 131072, "disableLastOperatingModeDeprecated": 32768, "disableWanderingDeprecated": 128, "hasEnterpriseRotationType": 64, "hasTwistRotationType": 32, "hideEmptyTrains": 4194304, "inverterShipSwingMode": 16, "isACoveredRide": 1024, "limitAirTimeBonus": 2048, "magicCarpetSwingMode": 1048576, "noBankedTrack": 4, "noInversions": 2, "noReverseOption": 8388608, "playDepartSound": 8, "playSplashSound": 256, "riderControlsSpeed": 2097152, "separateRideDeprecated": 8192, "separateRideNameDeprecated": 4096, "tabIconIsHalfScale": 1};
    var rideBuildTypes = {"0": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/SpiralRollerCoaster.h", "is_shop_or_facility": false, "name": "spiral_rc", "ride_type": 0, "track_groups": [1, 2, 6, 8, 68, 9, 11, 12, 13, 15, 16, 17, 23, 22, 28, 29, 41, 42, 46, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "1": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/StandUpRollerCoaster.h", "is_shop_or_facility": false, "name": "stand_up_rc", "ride_type": 1, "track_groups": [1, 2, 3, 6, 7, 8, 68, 9, 11, 13, 15, 16, 17, 19, 20, 23, 22, 28, 29, 41, 81, 82, 43, 42, 35, 79, 69, 70, 34, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "10": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/Steeplechase.h", "is_shop_or_facility": false, "name": "steeplechase", "ride_type": 10, "track_groups": [1, 2, 3, 8, 13, 15, 16, 17, 28, 41, 81, 82, 87, 26, 27], "track_name": "endStation", "track_type": 1}, "11": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/CarRide.h", "is_shop_or_facility": false, "name": "car_ride", "ride_type": 11, "track_groups": [1, 2, 8, 14, 15, 48], "track_name": "endStation", "track_type": 1}, "12": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/thrill/LaunchedFreefall.h", "is_shop_or_facility": false, "name": "launched_freefall", "ride_type": 12, "track_groups": [21], "track_name": "towerBase", "track_type": 66}, "13": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/BobsleighCoaster.h", "is_shop_or_facility": false, "name": "bobsleigh_rc", "ride_type": 13, "track_groups": [1, 2, 3, 6, 8, 13, 15, 16, 23, 22, 28, 41, 29], "track_name": "endStation", "track_type": 1}, "14": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/ObservationTower.h", "is_shop_or_facility": false, "name": "observation_tower", "ride_type": 14, "track_groups": [21], "track_name": "towerBase", "track_type": 66}, "15": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/LoopingRollerCoaster.h", "is_shop_or_facility": false, "name": "looping_rc", "ride_type": 15, "track_groups": [1, 2, 3, 6, 7, 8, 68, 9, 11, 12, 13, 15, 16, 17, 23, 22, 28, 29, 41, 42, 49, 35, 43, 81, 82, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "16": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/water/DinghySlide.h", "is_shop_or_facility": false, "name": "dinghy_slide", "ride_type": 16, "track_groups": [1, 2, 3, 8, 68, 9, 13, 15, 16], "track_name": "endStation", "track_type": 1}, "17": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/MineTrainCoaster.h", "is_shop_or_facility": false, "name": "mine_train_rc", "ride_type": 17, "track_groups": [1, 2, 3, 6, 8, 68, 9, 11, 13, 15, 16, 17, 23, 22, 28, 29, 41, 81, 82, 43, 87, 88, 89], "track_name": "endStation", "track_type": 1}, "18": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/transport/Chairlift.h", "is_shop_or_facility": false, "name": "chairlift", "ride_type": 18, "track_groups": [1, 2, 8, 14], "track_name": "endStation", "track_type": 1}, "19": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/CorkscrewRollerCoaster.h", "is_shop_or_facility": false, "name": "corkscrew_rc", "ride_type": 19, "track_groups": [1, 2, 3, 6, 7, 8, 68, 9, 11, 12, 13, 15, 16, 17, 19, 20, 23, 22, 28, 29, 41, 49, 43, 81, 82, 42, 35, 79, 69, 70, 34, 85, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "2": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/SuspendedSwingingCoaster.h", "is_shop_or_facility": false, "name": "suspended_swinging_rc", "ride_type": 2, "track_groups": [1, 2, 3, 8, 68, 9, 11, 13, 15, 16, 17, 27, 26, 28, 41, 87, 88, 89], "track_name": "endStation", "track_type": 1}, "20": {"allow_multiple_circuits": false, "allow_music": false, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/Maze.h", "is_shop_or_facility": false, "name": "maze", "ride_type": 20, "track_groups": [], "track_name": "maze", "track_type": 101}, "21": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[0, 3], [0, 1], [2, 3], [1, 2]], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/SpiralSlide.h", "is_shop_or_facility": false, "name": "spiral_slide", "ride_type": 21, "track_groups": [], "track_name": "flatTrack2x2", "track_type": 258}, "22": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/thrill/GoKarts.h", "is_shop_or_facility": false, "name": "go_karts", "ride_type": 22, "track_groups": [1, 2, 8, 14, 15, 16, 17, 11, 79, 13, 87], "track_name": "endStation", "track_type": 1}, "23": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/water/LogFlume.h", "is_shop_or_facility": false, "name": "log_flume", "ride_type": 23, "track_groups": [1, 2, 8, 13, 15, 29, 36, 9], "track_name": "endStation", "track_type": 1}, "24": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/water/RiverRapids.h", "is_shop_or_facility": false, "name": "river_rapids", "ride_type": 24, "track_groups": [1, 2, 8, 14, 29, 56, 60, 61], "track_name": "endStation", "track_type": 1}, "25": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[0, 3], [0], [0], [0, 1], [3], [], [], [1], [3], [], [], [1], [2, 3], [2], [2], [1, 2]], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/Dodgems.h", "is_shop_or_facility": false, "name": "dodgems", "ride_type": 25, "track_groups": [], "track_name": "flatTrack4x4", "track_type": 259}, "26": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[1, 3], [], [1, 3], [1, 3], []], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/thrill/SwingingShip.h", "is_shop_or_facility": false, "name": "swinging_ship", "ride_type": 26, "track_groups": [], "track_name": "flatTrack1x5", "track_type": 261}, "27": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[1], [], [1], []], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/thrill/SwingingInverterShip.h", "is_shop_or_facility": false, "name": "swinging_inverter_ship", "ride_type": 27, "track_groups": [], "track_name": "flatTrack1x4B", "track_type": 263}, "28": {"allow_multiple_circuits": false, "allow_music": false, "allow_reversed_trains": false, "connection_sides": [[0]], "footprint_supported": true, "has_entrance_and_exit": false, "implementation": "src/openrct2/ride/rtd/shops/FoodStall.h", "is_shop_or_facility": true, "name": "food_stall", "ride_type": 28, "track_groups": [], "track_name": "flatTrack1x1A", "track_type": 262}, "3": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/InvertedRollerCoaster.h", "is_shop_or_facility": false, "name": "inverted_rc", "ride_type": 3, "track_groups": [1, 2, 3, 6, 7, 8, 68, 9, 11, 12, 13, 15, 16, 17, 18, 19, 20, 25, 24, 28, 29, 34, 41, 42, 81, 82, 87, 88, 89, 70, 69, 86, 43, 31, 44, 47, 85, 35, 42, 79, 80, 26, 27], "track_name": "endStation", "track_type": 1}, "30": {"allow_multiple_circuits": false, "allow_music": false, "allow_reversed_trains": false, "connection_sides": [[0]], "footprint_supported": true, "has_entrance_and_exit": false, "implementation": "src/openrct2/ride/rtd/shops/DrinkStall.h", "is_shop_or_facility": true, "name": "drink_stall", "ride_type": 30, "track_groups": [], "track_name": "flatTrack1x1A", "track_type": 262}, "32": {"allow_multiple_circuits": false, "allow_music": false, "allow_reversed_trains": false, "connection_sides": [[0]], "footprint_supported": true, "has_entrance_and_exit": false, "implementation": "src/openrct2/ride/rtd/shops/Shop.h", "is_shop_or_facility": true, "name": "shop", "ride_type": 32, "track_groups": [], "track_name": "flatTrack1x1A", "track_type": 262}, "33": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[], [0, 3], [0], [0, 1], [3], [1], [2, 3], [1, 2], [2]], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/MerryGoRound.h", "is_shop_or_facility": false, "name": "merry_go_round", "ride_type": 33, "track_groups": [], "track_name": "flatTrack3x3", "track_type": 266}, "35": {"allow_multiple_circuits": false, "allow_music": false, "allow_reversed_trains": false, "connection_sides": [[0, 1, 2, 3]], "footprint_supported": true, "has_entrance_and_exit": false, "implementation": "src/openrct2/ride/rtd/shops/InformationKiosk.h", "is_shop_or_facility": true, "name": "information_kiosk", "ride_type": 35, "track_groups": [], "track_name": "flatTrack1x1B", "track_type": 264}, "36": {"allow_multiple_circuits": false, "allow_music": false, "allow_reversed_trains": false, "connection_sides": [[0]], "footprint_supported": true, "has_entrance_and_exit": false, "implementation": "src/openrct2/ride/rtd/shops/Toilets.h", "is_shop_or_facility": true, "name": "toilets", "ride_type": 36, "track_groups": [], "track_name": "flatTrack1x1A", "track_type": 262}, "37": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[1, 3], [0, 1, 3], [1, 3], [1, 2, 3]], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/FerrisWheel.h", "is_shop_or_facility": false, "name": "ferris_wheel", "ride_type": 37, "track_groups": [], "track_name": "flatTrack1x4C", "track_type": 265}, "38": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[0, 3], [0, 1], [2, 3], [1, 2]], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/thrill/MotionSimulator.h", "is_shop_or_facility": false, "name": "motion_simulator", "ride_type": 38, "track_groups": [], "track_name": "flatTrack2x2", "track_type": 258}, "39": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[], [0, 3], [0], [0, 1], [3], [1], [2, 3], [1, 2], [2]], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/thrill/3DCinema.h", "is_shop_or_facility": false, "name": "3d_cinema", "ride_type": 39, "track_groups": [], "track_name": "flatTrack3x3", "track_type": 266}, "4": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/JuniorRollerCoaster.h", "is_shop_or_facility": false, "name": "junior_rc", "ride_type": 4, "track_groups": [1, 2, 3, 5, 6, 8, 10, 11, 13, 15, 16, 17, 23, 22, 28, 41, 49, 81, 82, 87], "track_name": "endStation", "track_type": 1}, "40": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[], [0, 3], [0], [0, 1], [3], [1], [2, 3], [1, 2], [2]], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/thrill/TopSpin.h", "is_shop_or_facility": false, "name": "top_spin", "ride_type": 40, "track_groups": [], "track_name": "flatTrack3x3", "track_type": 266}, "41": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[], [0, 3], [0], [0, 1], [3], [1], [2, 3], [1, 2], [2]], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/SpaceRings.h", "is_shop_or_facility": false, "name": "space_rings", "ride_type": 41, "track_groups": [], "track_name": "flatTrack3x3", "track_type": 266}, "42": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/ReverseFreefallCoaster.h", "is_shop_or_facility": false, "name": "reverse_freefall_rc", "ride_type": 42, "track_groups": [1, 2, 4, 39, 29], "track_name": "endStation", "track_type": 1}, "43": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/transport/Lift.h", "is_shop_or_facility": false, "name": "lift", "ride_type": 43, "track_groups": [21], "track_name": "towerBase", "track_type": 66}, "44": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/VerticalDropCoaster.h", "is_shop_or_facility": false, "name": "vertical_drop_rc", "ride_type": 44, "track_groups": [0, 1, 2, 3, 4, 6, 7, 8, 68, 9, 10, 11, 12, 13, 15, 16, 17, 23, 22, 28, 29, 31, 35, 41, 42, 44, 34, 62, 81, 82, 79, 70, 71, 72, 20, 69, 86, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "45": {"allow_multiple_circuits": false, "allow_music": false, "allow_reversed_trains": false, "connection_sides": [[0]], "footprint_supported": true, "has_entrance_and_exit": false, "implementation": "src/openrct2/ride/rtd/shops/CashMachine.h", "is_shop_or_facility": true, "name": "cash_machine", "ride_type": 45, "track_groups": [], "track_name": "flatTrack1x1A", "track_type": 262}, "46": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[], [0, 3], [0], [0, 1], [3], [1], [2, 3], [1, 2], [2]], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/thrill/Twist.h", "is_shop_or_facility": false, "name": "twist", "ride_type": 46, "track_groups": [], "track_name": "flatTrack3x3", "track_type": 266}, "47": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[], [0, 3], [0], [0, 1], [3], [1], [2, 3], [1, 2], [2]], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/HauntedHouse.h", "is_shop_or_facility": false, "name": "haunted_house", "ride_type": 47, "track_groups": [], "track_name": "flatTrack3x3", "track_type": 266}, "48": {"allow_multiple_circuits": false, "allow_music": false, "allow_reversed_trains": false, "connection_sides": [[0]], "footprint_supported": true, "has_entrance_and_exit": false, "implementation": "src/openrct2/ride/rtd/shops/FirstAid.h", "is_shop_or_facility": true, "name": "first_aid", "ride_type": 48, "track_groups": [], "track_name": "flatTrack1x1A", "track_type": 262}, "49": {"allow_multiple_circuits": false, "allow_music": false, "allow_reversed_trains": false, "connection_sides": [[], [0, 3], [0], [0, 1], [3], [1], [2, 3], [1, 2], [2]], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/Circus.h", "is_shop_or_facility": false, "name": "circus", "ride_type": 49, "track_groups": [], "track_name": "flatTrack3x3", "track_type": 266}, "5": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/transport/MiniatureRailway.h", "is_shop_or_facility": false, "name": "miniature_railway", "ride_type": 5, "track_groups": [1, 2, 8, 13, 15, 16, 17, 87], "track_name": "endStation", "track_type": 1}, "50": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/GhostTrain.h", "is_shop_or_facility": false, "name": "ghost_train", "ride_type": 50, "track_groups": [1, 2, 8, 14, 15, 28, 48], "track_name": "endStation", "track_type": 1}, "51": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/TwisterRollerCoaster.h", "is_shop_or_facility": false, "name": "twister_rc", "ride_type": 51, "track_groups": [0, 1, 2, 3, 6, 7, 8, 68, 9, 11, 12, 13, 15, 16, 17, 19, 20, 23, 22, 28, 29, 31, 32, 33, 34, 35, 41, 42, 43, 44, 47, 49, 18, 81, 82, 79, 69, 70, 71, 72, 85, 86, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "52": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/WoodenRollerCoaster.h", "is_shop_or_facility": false, "name": "wooden_rc", "ride_type": 52, "track_groups": [0, 1, 2, 3, 6, 7, 8, 68, 9, 11, 12, 13, 15, 16, 17, 23, 22, 28, 29, 30, 35, 41, 42, 81, 82, 43, 70, 34, 87, 88, 89], "track_name": "endStation", "track_type": 1}, "53": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/SideFrictionRollerCoaster.h", "is_shop_or_facility": false, "name": "side_friction_rc", "ride_type": 53, "track_groups": [1, 2, 3, 8, 13, 15, 16, 17, 28, 68, 9, 87, 88, 89], "track_name": "endStation", "track_type": 1}, "54": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/SteelWildMouse.h", "is_shop_or_facility": false, "name": "steel_wild_mouse", "ride_type": 54, "track_groups": [1, 2, 3, 4, 8, 68, 9, 10, 11, 14, 15, 28, 41], "track_name": "endStation", "track_type": 1}, "55": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/MultiDimensionRollerCoaster.h", "is_shop_or_facility": false, "name": "multi_dimension_rc", "ride_type": 55, "track_groups": [1, 2, 3, 6, 8, 68, 9, 13, 15, 16, 17, 23, 22, 28, 29, 31, 41, 50, 52, 53, 81, 82, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "56": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": false, "implementation": "src/openrct2/ride/rtd/coaster/MultiDimensionRollerCoaster.h", "is_shop_or_facility": false, "name": "multi_dimension_rc_alt", "ride_type": 56, "track_groups": [], "track_name": "endStation", "track_type": 1}, "57": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/FlyingRollerCoaster.h", "is_shop_or_facility": false, "name": "flying_rc", "ride_type": 57, "track_groups": [1, 6, 8, 68, 9, 11, 12, 13, 15, 16, 17, 23, 22, 28, 29, 41, 42, 50, 57, 52, 73, 31, 35, 81, 82, 79, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "58": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": false, "implementation": "src/openrct2/ride/rtd/coaster/FlyingRollerCoaster.h", "is_shop_or_facility": false, "name": "flying_rc_alt", "ride_type": 58, "track_groups": [], "track_name": "endStation", "track_type": 1}, "59": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/VirginiaReel.h", "is_shop_or_facility": false, "name": "virginia_reel", "ride_type": 59, "track_groups": [1, 2, 3, 8, 14, 15], "track_name": "endStation", "track_type": 1}, "6": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/transport/Monorail.h", "is_shop_or_facility": false, "name": "monorail", "ride_type": 6, "track_groups": [1, 2, 8, 13, 15, 16, 17, 87], "track_name": "endStation", "track_type": 1}, "60": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/water/SplashBoats.h", "is_shop_or_facility": false, "name": "splash_boats", "ride_type": 60, "track_groups": [1, 2, 8, 9, 13, 16, 29], "track_name": "endStation", "track_type": 1}, "61": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/MiniHelicopters.h", "is_shop_or_facility": false, "name": "mini_helicopters", "ride_type": 61, "track_groups": [1, 2, 8, 14, 15], "track_name": "endStation", "track_type": 1}, "62": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/LayDownRollerCoaster.h", "is_shop_or_facility": false, "name": "lay_down_rc", "ride_type": 62, "track_groups": [1, 2, 3, 6, 7, 8, 68, 9, 11, 12, 13, 15, 16, 17, 23, 22, 28, 29, 41, 50, 57, 63, 43, 85, 81, 82, 42, 35, 79, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "63": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/transport/SuspendedMonorail.h", "is_shop_or_facility": false, "name": "suspended_monorail", "ride_type": 63, "track_groups": [1, 2, 8, 13, 15, 16, 17, 87], "track_name": "endStation", "track_type": 1}, "64": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": false, "implementation": "src/openrct2/ride/rtd/coaster/LayDownRollerCoaster.h", "is_shop_or_facility": false, "name": "lay_down_rc_alt", "ride_type": 64, "track_groups": [], "track_name": "endStation", "track_type": 1}, "65": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/ReverserRollerCoaster.h", "is_shop_or_facility": false, "name": "reverser_rc", "ride_type": 65, "track_groups": [1, 2, 3, 8, 13, 15, 16, 28, 38], "track_name": "endStation", "track_type": 1}, "66": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/HeartlineTwisterCoaster.h", "is_shop_or_facility": false, "name": "heartline_twister_rc", "ride_type": 66, "track_groups": [1, 2, 3, 4, 8, 68, 9, 37, 65], "track_name": "endStation", "track_type": 1}, "67": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/MiniGolf.h", "is_shop_or_facility": false, "name": "mini_golf", "ride_type": 67, "track_groups": [1, 2, 8, 14, 66], "track_name": "endStation", "track_type": 1}, "68": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/GigaCoaster.h", "is_shop_or_facility": false, "name": "giga_rc", "ride_type": 68, "track_groups": [1, 2, 3, 6, 8, 68, 9, 11, 12, 13, 15, 16, 17, 23, 22, 28, 29, 41, 42, 43, 45, 35, 79, 81, 82, 31, 44, 85, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "69": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/thrill/RotoDrop.h", "is_shop_or_facility": false, "name": "roto_drop", "ride_type": 69, "track_groups": [21], "track_name": "towerBase", "track_type": 66}, "7": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/MiniSuspendedCoaster.h", "is_shop_or_facility": false, "name": "mini_suspended_rc", "ride_type": 7, "track_groups": [1, 2, 3, 8, 13, 15, 16, 17, 87], "track_name": "endStation", "track_type": 1}, "70": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[0, 3], [0], [0], [0, 1], [3], [], [], [1], [3], [], [], [1], [2, 3], [2], [2], [1, 2]], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/FlyingSaucers.h", "is_shop_or_facility": false, "name": "flying_saucers", "ride_type": 70, "track_groups": [], "track_name": "flatTrack4x4", "track_type": 259}, "71": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[], [0, 3], [0], [0, 1], [3], [1], [2, 3], [1, 2], [2]], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/CrookedHouse.h", "is_shop_or_facility": false, "name": "crooked_house", "ride_type": 71, "track_groups": [], "track_name": "flatTrack3x3", "track_type": 266}, "72": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/gentle/MonorailCycles.h", "is_shop_or_facility": false, "name": "monorail_cycles", "ride_type": 72, "track_groups": [1, 2, 13, 15, 16], "track_name": "endStation", "track_type": 1}, "73": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/CompactInvertedCoaster.h", "is_shop_or_facility": false, "name": "compact_inverted_rc", "ride_type": 73, "track_groups": [1, 2, 3, 6, 7, 8, 68, 9, 11, 12, 13, 15, 16, 17, 18, 19, 20, 25, 24, 28, 29, 31, 41, 81, 82, 87, 88, 89], "track_name": "endStation", "track_type": 1}, "74": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/WaterCoaster.h", "is_shop_or_facility": false, "name": "water_coaster", "ride_type": 74, "track_groups": [1, 2, 3, 6, 8, 68, 9, 11, 13, 15, 16, 17, 23, 22, 28, 41, 29, 49, 81, 82, 87, 88, 89], "track_name": "endStation", "track_type": 1}, "75": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/AirPoweredVerticalCoaster.h", "is_shop_or_facility": false, "name": "air_powered_vertical_rc", "ride_type": 75, "track_groups": [1, 2, 4, 5, 6, 16, 28, 39, 40, 29], "track_name": "endStation", "track_type": 1}, "76": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/InvertedHairpinCoaster.h", "is_shop_or_facility": false, "name": "inverted_hairpin_rc", "ride_type": 76, "track_groups": [1, 2, 3, 4, 8, 68, 9, 10, 11, 14, 15, 28, 41], "track_name": "endStation", "track_type": 1}, "77": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[1, 3], [], [1, 3], []], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/thrill/MagicCarpet.h", "is_shop_or_facility": false, "name": "magic_carpet", "ride_type": 77, "track_groups": [], "track_name": "flatTrack1x4A", "track_type": 257}, "78": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/water/SubmarineRide.h", "is_shop_or_facility": false, "name": "submarine_ride", "ride_type": 78, "track_groups": [1, 2, 14, 15], "track_name": "endStation", "track_type": 1}, "79": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/water/RiverRafts.h", "is_shop_or_facility": false, "name": "river_rafts", "ride_type": 79, "track_groups": [1, 2, 13, 16], "track_name": "endStation", "track_type": 1}, "8": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/water/BoatHire.h", "is_shop_or_facility": false, "name": "boat_hire", "ride_type": 8, "track_groups": [1, 2, 14, 15, 16, 17, 13], "track_name": "endStation", "track_type": 1}, "81": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [[0, 3], [0], [0], [0, 1], [3], [], [], [1], [3], [], [], [1], [2, 3], [2], [2], [1, 2]], "footprint_supported": true, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/thrill/Enterprise.h", "is_shop_or_facility": false, "name": "enterprise", "ride_type": 81, "track_groups": [], "track_name": "flatTrack4x4", "track_type": 259}, "86": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/InvertedImpulseCoaster.h", "is_shop_or_facility": false, "name": "inverted_impulse_rc", "ride_type": 86, "track_groups": [1, 2, 8, 68, 9, 31, 44], "track_name": "endStation", "track_type": 1}, "87": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/MiniRollerCoaster.h", "is_shop_or_facility": false, "name": "mini_rc", "ride_type": 87, "track_groups": [1, 2, 6, 8, 68, 9, 11, 12, 13, 15, 16, 17, 23, 22, 28, 29, 41, 42, 3, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "88": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/MineRide.h", "is_shop_or_facility": false, "name": "mine_ride", "ride_type": 88, "track_groups": [1, 2, 6, 8, 13, 15, 16, 17, 23, 22, 29, 87, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "9": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/WoodenWildMouse.h", "is_shop_or_facility": false, "name": "wooden_wild_mouse", "ride_type": 9, "track_groups": [1, 2, 3, 4, 8, 68, 9, 10, 14, 15], "track_name": "endStation", "track_type": 1}, "90": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/LIMLaunchedRollerCoaster.h", "is_shop_or_facility": false, "name": "lim_launched_rc", "ride_type": 90, "track_groups": [1, 2, 6, 7, 8, 68, 9, 11, 12, 13, 15, 16, 17, 18, 20, 23, 22, 28, 29, 31, 41, 42, 44, 47, 32, 35, 43, 19, 70, 34, 69, 71, 72, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "91": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/HybridCoaster.h", "is_shop_or_facility": false, "name": "hybrid_rc", "ride_type": 91, "track_groups": [0, 1, 2, 3, 4, 6, 8, 68, 9, 11, 12, 13, 15, 16, 17, 23, 22, 28, 29, 31, 32, 33, 35, 41, 42, 43, 44, 47, 71, 72, 79, 81, 82, 83, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "92": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/SingleRailRollerCoaster.h", "is_shop_or_facility": false, "name": "single_rail_rc", "ride_type": 92, "track_groups": [0, 1, 2, 3, 4, 6, 8, 10, 68, 9, 11, 12, 13, 15, 16, 17, 20, 23, 22, 28, 29, 31, 32, 35, 41, 42, 44, 47, 19, 34, 70, 69, 71, 72, 79, 81, 82, 83, 86, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "93": {"allow_multiple_circuits": false, "allow_music": true, "allow_reversed_trains": false, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/AlpineCoaster.h", "is_shop_or_facility": false, "name": "alpine_rc", "ride_type": 93, "track_groups": [0, 1, 2, 3, 6, 8, 10, 11, 13, 15, 16, 17, 23, 87, 27, 25], "track_name": "endStation", "track_type": 1}, "94": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/ClassicWoodenRollerCoaster.h", "is_shop_or_facility": false, "name": "classic_wooden_rc", "ride_type": 94, "track_groups": [0, 1, 2, 3, 6, 7, 8, 68, 9, 11, 13, 15, 16, 17, 28, 29, 30, 41, 81, 82, 43, 70, 34, 87, 88, 89], "track_name": "endStation", "track_type": 1}, "95": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/ClassicStandUpRollerCoaster.h", "is_shop_or_facility": false, "name": "classic_stand_up_rc", "ride_type": 95, "track_groups": [1, 2, 3, 6, 7, 8, 68, 9, 11, 13, 15, 16, 17, 19, 20, 28, 29, 41, 81, 82, 43, 79, 69, 70, 34, 87, 88, 89, 26, 27], "track_name": "endStation", "track_type": 1}, "96": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/LSMLaunchedRollerCoaster.h", "is_shop_or_facility": false, "name": "lsm_rc", "ride_type": 96, "track_groups": [1, 2, 6, 8, 68, 9, 11, 12, 13, 15, 16, 17, 23, 22, 28, 81, 82, 29, 41, 42, 43, 35, 79, 80, 49, 84, 33, 31, 44, 32, 47, 19, 70, 34, 7, 20, 69, 71, 72, 85, 86, 87, 88, 89, 26, 27, 24, 25], "track_name": "endStation", "track_type": 1}, "97": {"allow_multiple_circuits": true, "allow_music": true, "allow_reversed_trains": true, "connection_sides": [], "footprint_supported": false, "has_entrance_and_exit": true, "implementation": "src/openrct2/ride/rtd/coaster/ClassicWoodenTwisterRollerCoaster.h", "is_shop_or_facility": false, "name": "classic_wooden_twister_rc", "ride_type": 97, "track_groups": [0, 1, 2, 3, 6, 8, 68, 9, 11, 13, 15, 16, 17, 28, 29, 41, 81, 82, 43, 23, 22, 12, 35, 87, 88, 89], "track_name": "endStation", "track_type": 1}};
    var registeredActions = {
        "closeRide": {
            "name": "close_ride",
            "action": "ridesetstatus",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "constants": {
                "status": 0
            },
            "response": "message",
            "success_message": "Ride {rideId} closed.",
            "error_prefix": "Failed to close ride"
        },
        "startRideTest": {
            "name": "start_ride_test",
            "action": "ridesetstatus",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "constants": {
                "status": 2
            },
            "response": "message",
            "success_message": "Ride {rideId} started in test mode.",
            "error_prefix": "Failed to start ride test"
        },
        "openRide": {
            "name": "open_ride",
            "action": "ridesetstatus",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "constants": {
                "status": 1
            },
            "response": "acknowledgement",
            "error_prefix": "Failed to open ride"
        },
        "deleteRide": {
            "name": "delete_ride",
            "action": "ridedemolish",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "constants": {
                "modifyType": 0
            },
            "response": "acknowledgement",
            "error_prefix": "Failed to delete ride"
        },
        "setRideVehicles": {
            "name": "set_ride_vehicles",
            "action": "ridesetvehicle",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "setting",
                    "wire_name": "setting",
                    "type": "string",
                    "action_field": "type",
                    "values": {
                        "trains": 0,
                        "cars_per_train": 1
                    }
                },
                {
                    "name": "value",
                    "wire_name": "value",
                    "type": "integer",
                    "action_field": "value",
                    "minimum": 1,
                    "maximum": 255
                }
            ],
            "constants": {
                "colour": 0
            },
            "response": "payload",
            "error_prefix": "Failed to set ride vehicles"
        },
        "setRideInspectionInterval": {
            "name": "set_ride_inspection_interval",
            "action": "ridesetsetting",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "interval",
                    "wire_name": "interval",
                    "type": "string",
                    "action_field": "value",
                    "values": {
                        "every_10_minutes": 0,
                        "every_20_minutes": 1,
                        "every_30_minutes": 2,
                        "every_45_minutes": 3,
                        "every_hour": 4,
                        "every_2_hours": 5,
                        "never": 6
                    }
                }
            ],
            "constants": {
                "setting": 5
            },
            "response": "readback",
            "error_prefix": "Failed to set ride inspection interval",
            "readback": {
                "fields": [
                    {
                        "name": "inspection_interval",
                        "property": "inspectionInterval",
                        "type": "integer"
                    }
                ],
                "matches": {
                    "inspection_interval": "interval"
                }
            }
        },
        "setRideName": {
            "name": "set_ride_name",
            "action": "ridesetname",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "name",
                    "wire_name": "name",
                    "type": "string",
                    "action_field": "name",
                    "min_length": 1
                }
            ],
            "response": "readback",
            "error_prefix": "Failed to rename ride",
            "readback": {
                "fields": [
                    {
                        "name": "name",
                        "property": "name",
                        "type": "string"
                    }
                ],
                "matches": {
                    "name": "name"
                }
            }
        },
        "setRideMinimumWaitingTime": {
            "name": "set_ride_minimum_waiting_time",
            "action": "ridesetsetting",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "seconds",
                    "wire_name": "seconds",
                    "type": "integer",
                    "action_field": "value",
                    "minimum": 0,
                    "maximum": 250
                }
            ],
            "constants": {
                "setting": 2
            },
            "response": "readback",
            "error_prefix": "Failed to set minimum waiting time",
            "readback": {
                "fields": [
                    {
                        "name": "minimum_waiting_time_seconds",
                        "property": "minimumWaitingTime",
                        "type": "integer"
                    },
                    {
                        "name": "maximum_waiting_time_seconds",
                        "property": "maximumWaitingTime",
                        "type": "integer"
                    }
                ],
                "matches": {
                    "minimum_waiting_time_seconds": "seconds"
                }
            }
        },
        "setRideMaximumWaitingTime": {
            "name": "set_ride_maximum_waiting_time",
            "action": "ridesetsetting",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "seconds",
                    "wire_name": "seconds",
                    "type": "integer",
                    "action_field": "value",
                    "minimum": 0,
                    "maximum": 250
                }
            ],
            "constants": {
                "setting": 3
            },
            "response": "readback",
            "error_prefix": "Failed to set maximum waiting time",
            "readback": {
                "fields": [
                    {
                        "name": "minimum_waiting_time_seconds",
                        "property": "minimumWaitingTime",
                        "type": "integer"
                    },
                    {
                        "name": "maximum_waiting_time_seconds",
                        "property": "maximumWaitingTime",
                        "type": "integer"
                    }
                ],
                "matches": {
                    "maximum_waiting_time_seconds": "seconds"
                }
            }
        },
        "setRideLiftHillSpeed": {
            "name": "set_ride_lift_hill_speed",
            "action": "ridesetsetting",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "speed_mph",
                    "wire_name": "speed_mph",
                    "type": "integer",
                    "action_field": "value",
                    "minimum": 0,
                    "maximum": 255
                }
            ],
            "constants": {
                "setting": 8
            },
            "response": "readback",
            "error_prefix": "Failed to set ride lift hill speed",
            "readback": {
                "fields": [
                    {
                        "name": "lift_hill_speed_mph",
                        "property": "liftHillSpeed",
                        "type": "integer"
                    },
                    {
                        "name": "minimum_lift_hill_speed_mph",
                        "property": "minLiftHillSpeed",
                        "type": "integer"
                    },
                    {
                        "name": "maximum_lift_hill_speed_mph",
                        "property": "maxLiftHillSpeed",
                        "type": "integer"
                    }
                ],
                "matches": {
                    "lift_hill_speed_mph": "speed_mph"
                }
            }
        },
        "setRideOperatingMode": {
            "name": "set_ride_operating_mode",
            "action": "ridesetsetting",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "mode",
                    "wire_name": "mode",
                    "type": "string",
                    "action_field": "value",
                    "values": {
                        "normal": 0,
                        "continuous_circuit": 1,
                        "reverse_incline_launched_shuttle": 2,
                        "powered_launch_passthrough": 3,
                        "shuttle": 4,
                        "boat_hire": 5,
                        "upward_launch": 6,
                        "rotating_lift": 7,
                        "station_to_station": 8,
                        "single_ride_per_admission": 9,
                        "unlimited_rides_per_admission": 10,
                        "maze": 11,
                        "race": 12,
                        "dodgems": 13,
                        "swing": 14,
                        "shop_stall": 15,
                        "rotation": 16,
                        "forward_rotation": 17,
                        "backward_rotation": 18,
                        "film_avenging_aviators": 19,
                        "mouse_tails_3d_film": 20,
                        "space_rings": 21,
                        "beginners": 22,
                        "lim_powered_launch": 23,
                        "film_thrill_riders": 24,
                        "storm_chasers_3d_film": 25,
                        "space_raiders_3d_film": 26,
                        "intense": 27,
                        "berserk": 28,
                        "haunted_house": 29,
                        "circus": 30,
                        "downward_launch": 31,
                        "crooked_house": 32,
                        "freefall_drop": 33,
                        "continuous_circuit_block_sectioned": 34,
                        "powered_launch": 35,
                        "powered_launch_block_sectioned": 36
                    }
                }
            ],
            "constants": {
                "setting": 0
            },
            "response": "readback",
            "error_prefix": "Failed to set ride operating mode",
            "readback": {
                "fields": [
                    {
                        "name": "mode_raw",
                        "property": "mode",
                        "type": "integer"
                    },
                    {
                        "name": "ride_status",
                        "property": "status",
                        "type": "string"
                    }
                ],
                "matches": {
                    "mode_raw": "mode"
                }
            }
        },
        "setRideCircuitCount": {
            "name": "set_ride_circuit_count",
            "action": "ridesetsetting",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "circuits",
                    "wire_name": "circuits",
                    "type": "integer",
                    "action_field": "value",
                    "minimum": 1,
                    "maximum": 20
                }
            ],
            "constants": {
                "setting": 9
            },
            "response": "payload",
            "error_prefix": "Failed to set ride circuit count"
        },
        "setRideMusicEnabled": {
            "name": "set_ride_music_enabled",
            "action": "ridesetsetting",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "enabled",
                    "wire_name": "enabled",
                    "type": "boolean",
                    "action_field": "value",
                    "boolean_as_integer": true
                }
            ],
            "constants": {
                "setting": 6
            },
            "response": "readback",
            "error_prefix": "Failed to set ride music enabled",
            "readback": {
                "fields": [
                    {
                        "name": "music_enabled",
                        "property": "flags",
                        "type": "boolean",
                        "bit_mask": 8192
                    }
                ],
                "matches": {
                    "music_enabled": "enabled"
                }
            }
        },
        "setRideMusicStyle": {
            "name": "set_ride_music_style",
            "action": "ridesetsetting",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "music_object",
                    "wire_name": "music_object",
                    "type": "integer",
                    "action_field": "value",
                    "minimum": 0,
                    "maximum": 255
                }
            ],
            "constants": {
                "setting": 7
            },
            "response": "readback",
            "error_prefix": "Failed to set ride music style",
            "readback": {
                "fields": [
                    {
                        "name": "music_object_index",
                        "property": "music",
                        "type": "integer"
                    }
                ],
                "matches": {
                    "music_object_index": "music_object"
                }
            }
        },
        "getRideOperatingSettings": {
            "name": "get_ride_operating_settings",
            "source": "ride",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to read ride settings",
            "readback": {
                "fields": [
                    {
                        "name": "ride_name",
                        "property": "name",
                        "type": "string"
                    },
                    {
                        "name": "ride_status",
                        "property": "status",
                        "type": "string"
                    },
                    {
                        "name": "mode_raw",
                        "property": "mode",
                        "type": "integer"
                    },
                    {
                        "name": "departure_flags_raw",
                        "property": "departFlags",
                        "type": "integer"
                    },
                    {
                        "name": "minimum_waiting_time_seconds",
                        "property": "minimumWaitingTime",
                        "type": "integer"
                    },
                    {
                        "name": "maximum_waiting_time_seconds",
                        "property": "maximumWaitingTime",
                        "type": "integer"
                    },
                    {
                        "name": "lift_hill_speed_mph",
                        "property": "liftHillSpeed",
                        "type": "integer"
                    },
                    {
                        "name": "minimum_lift_hill_speed_mph",
                        "property": "minLiftHillSpeed",
                        "type": "integer"
                    },
                    {
                        "name": "maximum_lift_hill_speed_mph",
                        "property": "maxLiftHillSpeed",
                        "type": "integer"
                    },
                    {
                        "name": "music_object_index",
                        "property": "music",
                        "type": "integer"
                    },
                    {
                        "name": "music_enabled",
                        "property": "flags",
                        "type": "boolean",
                        "bit_mask": 8192
                    }
                ]
            }
        },
        "getRideMaintenanceStatus": {
            "name": "get_ride_maintenance_status",
            "source": "ride",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to read ride settings",
            "readback": {
                "fields": [
                    {
                        "name": "inspection_interval",
                        "property": "inspectionInterval",
                        "type": "integer"
                    },
                    {
                        "name": "reliability_percent",
                        "property": "reliability",
                        "type": "number"
                    },
                    {
                        "name": "downtime_percent",
                        "property": "downtime",
                        "type": "number"
                    },
                    {
                        "name": "age_months",
                        "property": "age",
                        "type": "integer"
                    },
                    {
                        "name": "due_inspection",
                        "property": "flags",
                        "type": "boolean",
                        "bit_mask": 256
                    },
                    {
                        "name": "broken_down",
                        "property": "flags",
                        "type": "boolean",
                        "bit_mask": 128
                    },
                    {
                        "name": "crashed",
                        "property": "flags",
                        "type": "boolean",
                        "bit_mask": 1024
                    }
                ]
            }
        },
        "getLoadedMusicObjects": {
            "name": "get_loaded_music_objects",
            "source": "objects",
            "object_type": "music",
            "response": "observation",
            "error_prefix": "Failed to read loaded music objects",
            "allowed_modes": [
                "normal",
                "scenario_editor",
                "track_designer",
                "track_manager",
                "title"
            ],
            "readback": {
                "fields": [
                    {
                        "name": "index",
                        "property": "index",
                        "type": "integer"
                    },
                    {
                        "name": "identifier",
                        "property": "identifier",
                        "type": "string"
                    },
                    {
                        "name": "name",
                        "property": "name",
                        "type": "string"
                    }
                ]
            }
        },
        "setRideDepartureFlags": {
            "name": "set_ride_departure_flags",
            "action": "ridesetsetting",
            "identity": "ride_id",
            "target": "ride",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "flags_raw",
                    "wire_name": "flags_raw",
                    "type": "integer",
                    "action_field": "value",
                    "minimum": 0,
                    "maximum": 255
                }
            ],
            "constants": {
                "setting": 1
            },
            "response": "readback",
            "error_prefix": "Failed to set ride departure flags",
            "readback": {
                "fields": [
                    {
                        "name": "departure_flags_raw",
                        "property": "departFlags",
                        "type": "integer"
                    }
                ],
                "matches": {
                    "departure_flags_raw": "flags_raw"
                }
            }
        },
        "setRideOperationOption": {
            "name": "set_ride_operation_option",
            "action": "ridesetsetting",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "value",
                    "wire_name": "value",
                    "type": "integer",
                    "action_field": "value",
                    "minimum": 0,
                    "maximum": 255
                }
            ],
            "constants": {
                "setting": 4
            },
            "response": "payload",
            "error_prefix": "Failed to set ride operation option"
        },
        "renewRide": {
            "name": "renew_ride",
            "action": "ridedemolish",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "constants": {
                "modifyType": 1
            },
            "response": "payload",
            "error_prefix": "Failed to renew ride",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "simulateRide": {
            "name": "simulate_ride",
            "action": "ridesetstatus",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "constants": {
                "status": 3
            },
            "response": "payload",
            "error_prefix": "Failed to simulate ride"
        },
        "setRideVehicleObject": {
            "name": "set_ride_vehicle_object",
            "action": "ridesetvehicle",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "ride_object",
                    "wire_name": "ride_object",
                    "type": "integer",
                    "action_field": "value",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "colour_preset",
                    "wire_name": "colour_preset",
                    "type": "integer",
                    "action_field": "colour",
                    "minimum": 0,
                    "maximum": 255
                }
            ],
            "constants": {
                "type": 2
            },
            "response": "payload",
            "error_prefix": "Failed to set ride vehicle object"
        },
        "setRideTrainsReversed": {
            "name": "set_ride_trains_reversed",
            "action": "ridesetvehicle",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "reversed",
                    "wire_name": "reversed",
                    "type": "boolean",
                    "action_field": "value",
                    "boolean_as_integer": true
                }
            ],
            "constants": {
                "type": 3,
                "colour": 0
            },
            "response": "payload",
            "error_prefix": "Failed to set ride trains reversed"
        },
        "setRideTrackColour": {
            "name": "set_ride_track_colour",
            "action": "ridesetappearance",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "channel",
                    "wire_name": "channel",
                    "type": "string",
                    "action_field": "type",
                    "values": {
                        "main": 0,
                        "additional": 1,
                        "supports": 2
                    }
                },
                {
                    "name": "colour",
                    "wire_name": "colour",
                    "type": "integer",
                    "action_field": "value",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "scheme_index",
                    "wire_name": "scheme_index",
                    "type": "integer",
                    "action_field": "index",
                    "minimum": 0,
                    "maximum": 3
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set ride track colour"
        },
        "setRideVehicleColour": {
            "name": "set_ride_vehicle_colour",
            "action": "ridesetappearance",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "channel",
                    "wire_name": "channel",
                    "type": "string",
                    "action_field": "type",
                    "values": {
                        "body": 3,
                        "trim": 4,
                        "tertiary": 5
                    }
                },
                {
                    "name": "colour",
                    "wire_name": "colour",
                    "type": "integer",
                    "action_field": "value",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "vehicle_index",
                    "wire_name": "vehicle_index",
                    "type": "integer",
                    "action_field": "index",
                    "minimum": 0,
                    "maximum": 255
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set ride vehicle colour"
        },
        "setRideVehicleColourScheme": {
            "name": "set_ride_vehicle_colour_scheme",
            "action": "ridesetappearance",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "scheme",
                    "wire_name": "scheme",
                    "type": "string",
                    "action_field": "value",
                    "values": {
                        "all_same": 0,
                        "per_train": 1,
                        "per_car": 2
                    }
                }
            ],
            "constants": {
                "type": 6,
                "index": 0
            },
            "response": "payload",
            "error_prefix": "Failed to set ride vehicle colour scheme"
        },
        "setRideStationStyle": {
            "name": "set_ride_station_style",
            "action": "ridesetappearance",
            "identity": "ride_id",
            "target": "ride",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "station_object",
                    "wire_name": "station_object",
                    "type": "integer",
                    "action_field": "value",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "constants": {
                "type": 7,
                "index": 0
            },
            "response": "readback",
            "error_prefix": "Failed to set ride station style",
            "readback": {
                "fields": [
                    {
                        "name": "station_style",
                        "property": "stationStyle",
                        "type": "integer"
                    }
                ],
                "matches": {
                    "station_style": "station_object"
                }
            },
            "required_objects": {
                "station_object": "station"
            }
        },
        "setRideRandomShopColours": {
            "name": "set_ride_random_shop_colours",
            "action": "ridesetappearance",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "enabled",
                    "wire_name": "enabled",
                    "type": "boolean",
                    "action_field": "value",
                    "boolean_as_integer": true
                }
            ],
            "constants": {
                "type": 8,
                "index": 0
            },
            "response": "payload",
            "error_prefix": "Failed to set ride random shop colours"
        },
        "setTrackPieceColourScheme": {
            "name": "set_track_piece_colour_scheme",
            "action": "ridesetcolourscheme",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "direction",
                    "wire_name": "direction",
                    "type": "integer",
                    "action_field": "direction",
                    "minimum": 0,
                    "maximum": 3
                },
                {
                    "name": "track_type",
                    "wire_name": "track_type",
                    "type": "integer",
                    "action_field": "trackType",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "scheme",
                    "wire_name": "scheme",
                    "type": "integer",
                    "action_field": "colourScheme",
                    "minimum": 0,
                    "maximum": 3
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set track piece colour scheme"
        },
        "setTrackBrakeSpeed": {
            "name": "set_track_brake_speed",
            "action": "tracksetbrakespeed",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "track_type",
                    "wire_name": "track_type",
                    "type": "string",
                    "action_field": "trackType",
                    "values": {
                        "brakes": 99,
                        "booster": 100,
                        "block_brakes": 216,
                        "diagonal_brakes": 337,
                        "diagonal_block_brakes": 338,
                        "down_25_brakes": 339,
                        "diagonal_booster": 340,
                        "diagonal_down_25_brakes": 349
                    }
                },
                {
                    "name": "speed",
                    "wire_name": "speed",
                    "type": "integer",
                    "action_field": "brakeSpeed",
                    "minimum": 0,
                    "maximum": 30
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set track brake speed"
        },
        "getRideTrackColours": {
            "name": "get_ride_track_colours",
            "source": "ride",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "scheme_index",
                    "wire_name": "scheme_index",
                    "type": "integer",
                    "action_field": "index",
                    "minimum": 0,
                    "maximum": 3
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get ride track colours",
            "readback": {
                "fields": [
                    {
                        "name": "main",
                        "property": "colourSchemes",
                        "type": "integer",
                        "index_arg": "scheme_index",
                        "member": "main"
                    },
                    {
                        "name": "additional",
                        "property": "colourSchemes",
                        "type": "integer",
                        "index_arg": "scheme_index",
                        "member": "additional"
                    },
                    {
                        "name": "supports",
                        "property": "colourSchemes",
                        "type": "integer",
                        "index_arg": "scheme_index",
                        "member": "supports"
                    }
                ]
            }
        },
        "getRideVehicleColours": {
            "name": "get_ride_vehicle_colours",
            "source": "ride",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "vehicle_index",
                    "wire_name": "vehicle_index",
                    "type": "integer",
                    "action_field": "index",
                    "minimum": 0,
                    "maximum": 255
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get ride vehicle colours",
            "readback": {
                "fields": [
                    {
                        "name": "body",
                        "property": "vehicleColours",
                        "type": "integer",
                        "index_arg": "vehicle_index",
                        "member": "body"
                    },
                    {
                        "name": "trim",
                        "property": "vehicleColours",
                        "type": "integer",
                        "index_arg": "vehicle_index",
                        "member": "trim"
                    },
                    {
                        "name": "tertiary",
                        "property": "vehicleColours",
                        "type": "integer",
                        "index_arg": "vehicle_index",
                        "member": "tertiary"
                    }
                ]
            }
        },
        "setParkName": {
            "name": "set_park_name",
            "action": "parksetname",
            "target": "park",
            "arguments": [
                {
                    "name": "name",
                    "wire_name": "name",
                    "type": "string",
                    "action_field": "name",
                    "min_length": 1
                }
            ],
            "response": "readback",
            "error_prefix": "Failed to set park name",
            "readback": {
                "fields": [
                    {
                        "name": "name",
                        "property": "name",
                        "type": "string"
                    }
                ],
                "matches": {
                    "name": "name"
                }
            }
        },
        "closePark": {
            "name": "close_park",
            "action": "parksetparameter",
            "constants": {
                "parameter": 0,
                "value": 0
            },
            "response": "payload",
            "error_prefix": "Failed to close park"
        },
        "openPark": {
            "name": "open_park",
            "action": "parksetparameter",
            "constants": {
                "parameter": 1,
                "value": 0
            },
            "response": "payload",
            "error_prefix": "Failed to open park"
        },
        "setParkEntranceFee": {
            "name": "set_park_entrance_fee",
            "action": "parksetentrancefee",
            "target": "park",
            "arguments": [
                {
                    "name": "price_raw",
                    "wire_name": "price_raw",
                    "type": "integer",
                    "action_field": "value",
                    "minimum": 0,
                    "maximum": 9990
                }
            ],
            "response": "readback",
            "error_prefix": "Failed to set park entrance fee",
            "readback": {
                "fields": [
                    {
                        "name": "entrance_fee_raw",
                        "property": "entranceFee",
                        "type": "integer"
                    }
                ],
                "matches": {
                    "entrance_fee_raw": "price_raw"
                }
            }
        },
        "setParkLoan": {
            "name": "set_park_loan",
            "action": "parksetloan",
            "target": "park",
            "arguments": [
                {
                    "name": "loan_raw",
                    "wire_name": "loan_raw",
                    "type": "integer",
                    "action_field": "value",
                    "minimum": 0,
                    "maximum": 2147483647
                }
            ],
            "response": "readback",
            "error_prefix": "Failed to set park loan",
            "readback": {
                "fields": [
                    {
                        "name": "loan_raw",
                        "property": "bankLoan",
                        "type": "integer"
                    },
                    {
                        "name": "cash_raw",
                        "property": "cash",
                        "type": "integer"
                    }
                ],
                "matches": {
                    "loan_raw": "loan_raw"
                }
            }
        },
        "setResearchFunding": {
            "name": "set_research_funding",
            "action": "parksetresearchfunding",
            "target": "research",
            "arguments": [
                {
                    "name": "priorities",
                    "wire_name": "priorities",
                    "type": "integer",
                    "action_field": "priorities",
                    "minimum": 0,
                    "maximum": 127
                },
                {
                    "name": "funding",
                    "wire_name": "funding",
                    "type": "string",
                    "action_field": "fundingAmount",
                    "values": {
                        "none": 0,
                        "minimum": 1,
                        "normal": 2,
                        "maximum": 3
                    }
                }
            ],
            "response": "readback",
            "error_prefix": "Failed to set research funding",
            "readback": {
                "fields": [
                    {
                        "name": "funding",
                        "property": "funding",
                        "type": "integer"
                    },
                    {
                        "name": "progress",
                        "property": "progress",
                        "type": "integer"
                    }
                ],
                "matches": {
                    "funding": "funding"
                }
            }
        },
        "startMarketingCampaign": {
            "name": "start_marketing_campaign",
            "action": "parkmarketing",
            "arguments": [
                {
                    "name": "campaign",
                    "wire_name": "campaign",
                    "type": "string",
                    "action_field": "type",
                    "values": {
                        "free_entry": 0,
                        "half_price_entry": 3,
                        "park_advertising": 4
                    }
                },
                {
                    "name": "weeks",
                    "wire_name": "weeks",
                    "type": "integer",
                    "action_field": "duration",
                    "minimum": 1,
                    "maximum": 255
                }
            ],
            "constants": {
                "item": 0
            },
            "response": "payload",
            "error_prefix": "Failed to start marketing campaign",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "setGameSpeed": {
            "name": "set_game_speed",
            "action": "gamesetspeed",
            "target": "context",
            "arguments": [
                {
                    "name": "speed",
                    "wire_name": "speed",
                    "type": "integer",
                    "action_field": "speed",
                    "minimum": 1,
                    "maximum": 4
                }
            ],
            "response": "readback",
            "error_prefix": "Failed to set game speed",
            "readback": {
                "fields": [
                    {
                        "name": "speed",
                        "property": "gameSpeed",
                        "type": "integer"
                    }
                ],
                "matches": {
                    "speed": "speed"
                }
            }
        },
        "toggleGamePause": {
            "name": "toggle_game_pause",
            "action": "pausetoggle",
            "response": "payload",
            "error_prefix": "Failed to toggle game pause"
        },
        "setStaffName": {
            "name": "set_staff_name",
            "action": "staffsetname",
            "identity": "staff_id",
            "target": "entity",
            "arguments": [
                {
                    "name": "staff_id",
                    "wire_name": "staff_id",
                    "type": "integer",
                    "action_field": "id",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "name",
                    "wire_name": "name",
                    "type": "string",
                    "action_field": "name",
                    "min_length": 1
                }
            ],
            "response": "readback",
            "error_prefix": "Failed to set staff name",
            "readback": {
                "fields": [
                    {
                        "name": "name",
                        "property": "name",
                        "type": "string"
                    }
                ],
                "matches": {
                    "name": "name"
                }
            }
        },
        "setGuestName": {
            "name": "set_guest_name",
            "action": "guestsetname",
            "identity": "guest_id",
            "target": "entity",
            "arguments": [
                {
                    "name": "guest_id",
                    "wire_name": "guest_id",
                    "type": "integer",
                    "action_field": "peep",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "name",
                    "wire_name": "name",
                    "type": "string",
                    "action_field": "name",
                    "min_length": 1
                }
            ],
            "response": "readback",
            "error_prefix": "Failed to set guest name",
            "readback": {
                "fields": [
                    {
                        "name": "name",
                        "property": "name",
                        "type": "string"
                    }
                ],
                "matches": {
                    "name": "name"
                }
            }
        },
        "hireStaff": {
            "name": "hire_staff",
            "action": "staffhire",
            "arguments": [
                {
                    "name": "staff_type",
                    "wire_name": "staff_type",
                    "type": "string",
                    "action_field": "staffType",
                    "values": {
                        "handyman": 0,
                        "mechanic": 1,
                        "security": 2,
                        "entertainer": 3
                    }
                },
                {
                    "name": "auto_position",
                    "wire_name": "auto_position",
                    "type": "boolean",
                    "action_field": "autoPosition"
                },
                {
                    "name": "costume_object",
                    "wire_name": "costume_object",
                    "type": "integer",
                    "action_field": "costumeIndex",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "orders",
                    "wire_name": "orders",
                    "type": "integer",
                    "action_field": "staffOrders",
                    "minimum": 0,
                    "maximum": 15
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to hire staff",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                },
                {
                    "name": "entity_id",
                    "property": "peep",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "fireStaff": {
            "name": "fire_staff",
            "action": "stafffire",
            "identity": "staff_id",
            "arguments": [
                {
                    "name": "staff_id",
                    "wire_name": "staff_id",
                    "type": "integer",
                    "action_field": "id",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to fire staff"
        },
        "setStaffOrders": {
            "name": "set_staff_orders",
            "action": "staffsetorders",
            "identity": "staff_id",
            "target": "entity",
            "arguments": [
                {
                    "name": "staff_id",
                    "wire_name": "staff_id",
                    "type": "integer",
                    "action_field": "id",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "orders",
                    "wire_name": "orders",
                    "type": "integer",
                    "action_field": "staffOrders",
                    "minimum": 0,
                    "maximum": 15
                }
            ],
            "response": "readback",
            "error_prefix": "Failed to set staff orders",
            "readback": {
                "fields": [
                    {
                        "name": "orders",
                        "property": "orders",
                        "type": "integer"
                    }
                ],
                "matches": {
                    "orders": "orders"
                }
            }
        },
        "setStaffColour": {
            "name": "set_staff_colour",
            "action": "staffsetcolour",
            "arguments": [
                {
                    "name": "staff_type",
                    "wire_name": "staff_type",
                    "type": "string",
                    "action_field": "staffType",
                    "values": {
                        "handyman": 0,
                        "mechanic": 1,
                        "security": 2
                    }
                },
                {
                    "name": "colour",
                    "wire_name": "colour",
                    "type": "integer",
                    "action_field": "colour",
                    "minimum": 0,
                    "maximum": 73
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set staff colour"
        },
        "setStaffCostume": {
            "name": "set_staff_costume",
            "action": "staffsetcostume",
            "identity": "staff_id",
            "arguments": [
                {
                    "name": "staff_id",
                    "wire_name": "staff_id",
                    "type": "integer",
                    "action_field": "id",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "costume_object",
                    "wire_name": "costume_object",
                    "type": "integer",
                    "action_field": "costume",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set staff costume",
            "required_objects": {
                "costume_object": "peep_animations"
            }
        },
        "setStaffPatrolArea": {
            "name": "set_staff_patrol_area",
            "action": "staffsetpatrolarea",
            "identity": "staff_id",
            "arguments": [
                {
                    "name": "staff_id",
                    "wire_name": "staff_id",
                    "type": "integer",
                    "action_field": "id",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "x1_game",
                    "wire_name": "x1_game",
                    "type": "integer",
                    "action_field": "x1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y1_game",
                    "wire_name": "y1_game",
                    "type": "integer",
                    "action_field": "y1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "x2_game",
                    "wire_name": "x2_game",
                    "type": "integer",
                    "action_field": "x2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y2_game",
                    "wire_name": "y2_game",
                    "type": "integer",
                    "action_field": "y2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "mode",
                    "wire_name": "mode",
                    "type": "string",
                    "action_field": "mode",
                    "values": {
                        "set": 0,
                        "unset": 1,
                        "clear_all": 2
                    }
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set staff patrol area"
        },
        "pressBalloon": {
            "name": "press_balloon",
            "action": "balloonpress",
            "identity": "entity_id",
            "arguments": [
                {
                    "name": "entity_id",
                    "wire_name": "entity_id",
                    "type": "integer",
                    "action_field": "id",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to press balloon"
        },
        "placeSmallScenery": {
            "name": "place_small_scenery",
            "action": "smallsceneryplace",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "direction",
                    "wire_name": "direction",
                    "type": "integer",
                    "action_field": "direction",
                    "minimum": 0,
                    "maximum": 3
                },
                {
                    "name": "object_index",
                    "wire_name": "object_index",
                    "type": "integer",
                    "action_field": "object",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "quadrant",
                    "wire_name": "quadrant",
                    "type": "integer",
                    "action_field": "quadrant",
                    "minimum": 0,
                    "maximum": 3
                },
                {
                    "name": "primary_colour",
                    "wire_name": "primary_colour",
                    "type": "integer",
                    "action_field": "primaryColour",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "secondary_colour",
                    "wire_name": "secondary_colour",
                    "type": "integer",
                    "action_field": "secondaryColour",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "tertiary_colour",
                    "wire_name": "tertiary_colour",
                    "type": "integer",
                    "action_field": "tertiaryColour",
                    "minimum": 0,
                    "maximum": 73
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to place small scenery",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "removeSmallScenery": {
            "name": "remove_small_scenery",
            "action": "smallsceneryremove",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "object_index",
                    "wire_name": "object_index",
                    "type": "integer",
                    "action_field": "object",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "quadrant",
                    "wire_name": "quadrant",
                    "type": "integer",
                    "action_field": "quadrant",
                    "minimum": 0,
                    "maximum": 3
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to remove small scenery",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "setSmallSceneryColour": {
            "name": "set_small_scenery_colour",
            "action": "smallscenerysetcolour",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "quadrant",
                    "wire_name": "quadrant",
                    "type": "integer",
                    "action_field": "quadrant",
                    "minimum": 0,
                    "maximum": 3
                },
                {
                    "name": "object_index",
                    "wire_name": "object_index",
                    "type": "integer",
                    "action_field": "sceneryType",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "primary_colour",
                    "wire_name": "primary_colour",
                    "type": "integer",
                    "action_field": "primaryColour",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "secondary_colour",
                    "wire_name": "secondary_colour",
                    "type": "integer",
                    "action_field": "secondaryColour",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "tertiary_colour",
                    "wire_name": "tertiary_colour",
                    "type": "integer",
                    "action_field": "tertiaryColour",
                    "minimum": 0,
                    "maximum": 73
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set small scenery colour"
        },
        "placeLargeScenery": {
            "name": "place_large_scenery",
            "action": "largesceneryplace",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "direction",
                    "wire_name": "direction",
                    "type": "integer",
                    "action_field": "direction",
                    "minimum": 0,
                    "maximum": 3
                },
                {
                    "name": "object_index",
                    "wire_name": "object_index",
                    "type": "integer",
                    "action_field": "object",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "primary_colour",
                    "wire_name": "primary_colour",
                    "type": "integer",
                    "action_field": "primaryColour",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "secondary_colour",
                    "wire_name": "secondary_colour",
                    "type": "integer",
                    "action_field": "secondaryColour",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "tertiary_colour",
                    "wire_name": "tertiary_colour",
                    "type": "integer",
                    "action_field": "tertiaryColour",
                    "minimum": 0,
                    "maximum": 73
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to place large scenery",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                },
                {
                    "name": "banner_id",
                    "property": "bannerIndex",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "removeLargeScenery": {
            "name": "remove_large_scenery",
            "action": "largesceneryremove",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "direction",
                    "wire_name": "direction",
                    "type": "integer",
                    "action_field": "direction",
                    "minimum": 0,
                    "maximum": 3
                },
                {
                    "name": "tile_index",
                    "wire_name": "tile_index",
                    "type": "integer",
                    "action_field": "tileIndex",
                    "minimum": 0,
                    "maximum": 65535
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to remove large scenery",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "setLargeSceneryColour": {
            "name": "set_large_scenery_colour",
            "action": "largescenerysetcolour",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "direction",
                    "wire_name": "direction",
                    "type": "integer",
                    "action_field": "direction",
                    "minimum": 0,
                    "maximum": 3
                },
                {
                    "name": "tile_index",
                    "wire_name": "tile_index",
                    "type": "integer",
                    "action_field": "tileIndex",
                    "minimum": 0,
                    "maximum": 65535
                },
                {
                    "name": "primary_colour",
                    "wire_name": "primary_colour",
                    "type": "integer",
                    "action_field": "primaryColour",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "secondary_colour",
                    "wire_name": "secondary_colour",
                    "type": "integer",
                    "action_field": "secondaryColour",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "tertiary_colour",
                    "wire_name": "tertiary_colour",
                    "type": "integer",
                    "action_field": "tertiaryColour",
                    "minimum": 0,
                    "maximum": 73
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set large scenery colour"
        },
        "placeWall": {
            "name": "place_wall",
            "action": "wallplace",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "direction",
                    "wire_name": "direction",
                    "type": "integer",
                    "action_field": "edge",
                    "minimum": 0,
                    "maximum": 3
                },
                {
                    "name": "object_index",
                    "wire_name": "object_index",
                    "type": "integer",
                    "action_field": "object",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "primary_colour",
                    "wire_name": "primary_colour",
                    "type": "integer",
                    "action_field": "primaryColour",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "secondary_colour",
                    "wire_name": "secondary_colour",
                    "type": "integer",
                    "action_field": "secondaryColour",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "tertiary_colour",
                    "wire_name": "tertiary_colour",
                    "type": "integer",
                    "action_field": "tertiaryColour",
                    "minimum": 0,
                    "maximum": 73
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to place wall",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                },
                {
                    "name": "banner_id",
                    "property": "bannerIndex",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "removeWall": {
            "name": "remove_wall",
            "action": "wallremove",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "direction",
                    "wire_name": "direction",
                    "type": "integer",
                    "action_field": "direction",
                    "minimum": 0,
                    "maximum": 3
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to remove wall",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "setWallColour": {
            "name": "set_wall_colour",
            "action": "wallsetcolour",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "direction",
                    "wire_name": "direction",
                    "type": "integer",
                    "action_field": "direction",
                    "minimum": 0,
                    "maximum": 3
                },
                {
                    "name": "primary_colour",
                    "wire_name": "primary_colour",
                    "type": "integer",
                    "action_field": "primaryColour",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "secondary_colour",
                    "wire_name": "secondary_colour",
                    "type": "integer",
                    "action_field": "secondaryColour",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "tertiary_colour",
                    "wire_name": "tertiary_colour",
                    "type": "integer",
                    "action_field": "tertiaryColour",
                    "minimum": 0,
                    "maximum": 73
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set wall colour"
        },
        "placeBanner": {
            "name": "place_banner",
            "action": "bannerplace",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "direction",
                    "wire_name": "direction",
                    "type": "integer",
                    "action_field": "direction",
                    "minimum": 0,
                    "maximum": 3
                },
                {
                    "name": "object_index",
                    "wire_name": "object_index",
                    "type": "integer",
                    "action_field": "object",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "primary_colour",
                    "wire_name": "primary_colour",
                    "type": "integer",
                    "action_field": "primaryColour",
                    "minimum": 0,
                    "maximum": 73
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to place banner",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                },
                {
                    "name": "banner_id",
                    "property": "bannerIndex",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "removeBanner": {
            "name": "remove_banner",
            "action": "bannerremove",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "direction",
                    "wire_name": "direction",
                    "type": "integer",
                    "action_field": "direction",
                    "minimum": 0,
                    "maximum": 3
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to remove banner",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "setBannerColour": {
            "name": "set_banner_colour",
            "action": "bannersetcolour",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "direction",
                    "wire_name": "direction",
                    "type": "integer",
                    "action_field": "direction",
                    "minimum": 0,
                    "maximum": 3
                },
                {
                    "name": "primary_colour",
                    "wire_name": "primary_colour",
                    "type": "integer",
                    "action_field": "primaryColour",
                    "minimum": 0,
                    "maximum": 73
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set banner colour"
        },
        "setSignName": {
            "name": "set_sign_name",
            "action": "signsetname",
            "identity": "banner_id",
            "arguments": [
                {
                    "name": "banner_id",
                    "wire_name": "banner_id",
                    "type": "integer",
                    "action_field": "id",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "name",
                    "wire_name": "name",
                    "type": "string",
                    "action_field": "name",
                    "min_length": 1
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set sign name"
        },
        "setSignStyle": {
            "name": "set_sign_style",
            "action": "signsetstyle",
            "identity": "banner_id",
            "arguments": [
                {
                    "name": "banner_id",
                    "wire_name": "banner_id",
                    "type": "integer",
                    "action_field": "id",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "main_colour",
                    "wire_name": "main_colour",
                    "type": "integer",
                    "action_field": "mainColour",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "text_colour",
                    "wire_name": "text_colour",
                    "type": "integer",
                    "action_field": "textColour",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "is_large",
                    "wire_name": "is_large",
                    "type": "boolean",
                    "action_field": "isLarge"
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set sign style"
        },
        "placePathAddition": {
            "name": "place_path_addition",
            "action": "footpathadditionplace",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                },
                {
                    "name": "object_index",
                    "wire_name": "object_index",
                    "type": "integer",
                    "action_field": "object",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to place path addition",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "removePathAddition": {
            "name": "remove_path_addition",
            "action": "footpathadditionremove",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "z_game",
                    "wire_name": "z_game",
                    "type": "integer",
                    "action_field": "z",
                    "minimum": 0,
                    "maximum": 2040,
                    "multiple_of": 8
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to remove path addition",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "buyLandRights": {
            "name": "buy_land_rights",
            "action": "landbuyrights",
            "arguments": [
                {
                    "name": "x1_game",
                    "wire_name": "x1_game",
                    "type": "integer",
                    "action_field": "x1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y1_game",
                    "wire_name": "y1_game",
                    "type": "integer",
                    "action_field": "y1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "x2_game",
                    "wire_name": "x2_game",
                    "type": "integer",
                    "action_field": "x2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y2_game",
                    "wire_name": "y2_game",
                    "type": "integer",
                    "action_field": "y2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "right",
                    "wire_name": "right",
                    "type": "string",
                    "action_field": "setting",
                    "values": {
                        "land": 0,
                        "construction": 1
                    }
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to buy land rights",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "raiseLand": {
            "name": "raise_land",
            "action": "landraise",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "x1_game",
                    "wire_name": "x1_game",
                    "type": "integer",
                    "action_field": "x1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y1_game",
                    "wire_name": "y1_game",
                    "type": "integer",
                    "action_field": "y1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "x2_game",
                    "wire_name": "x2_game",
                    "type": "integer",
                    "action_field": "x2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y2_game",
                    "wire_name": "y2_game",
                    "type": "integer",
                    "action_field": "y2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "selection_type",
                    "wire_name": "selection_type",
                    "type": "integer",
                    "action_field": "selectionType",
                    "minimum": 0,
                    "maximum": 8
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to raise land",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "lowerLand": {
            "name": "lower_land",
            "action": "landlower",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "x1_game",
                    "wire_name": "x1_game",
                    "type": "integer",
                    "action_field": "x1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y1_game",
                    "wire_name": "y1_game",
                    "type": "integer",
                    "action_field": "y1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "x2_game",
                    "wire_name": "x2_game",
                    "type": "integer",
                    "action_field": "x2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y2_game",
                    "wire_name": "y2_game",
                    "type": "integer",
                    "action_field": "y2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "selection_type",
                    "wire_name": "selection_type",
                    "type": "integer",
                    "action_field": "selectionType",
                    "minimum": 0,
                    "maximum": 8
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to lower land",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "smoothLand": {
            "name": "smooth_land",
            "action": "landsmooth",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "x1_game",
                    "wire_name": "x1_game",
                    "type": "integer",
                    "action_field": "x1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y1_game",
                    "wire_name": "y1_game",
                    "type": "integer",
                    "action_field": "y1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "x2_game",
                    "wire_name": "x2_game",
                    "type": "integer",
                    "action_field": "x2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y2_game",
                    "wire_name": "y2_game",
                    "type": "integer",
                    "action_field": "y2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "selection_type",
                    "wire_name": "selection_type",
                    "type": "integer",
                    "action_field": "selectionType",
                    "minimum": 0,
                    "maximum": 8
                },
                {
                    "name": "lowering",
                    "wire_name": "lowering",
                    "type": "boolean",
                    "action_field": "isLowering"
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to smooth land",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "setLandHeight": {
            "name": "set_land_height",
            "action": "landsetheight",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "height",
                    "wire_name": "height",
                    "type": "integer",
                    "action_field": "height",
                    "minimum": 2,
                    "maximum": 254
                },
                {
                    "name": "slope",
                    "wire_name": "slope",
                    "type": "integer",
                    "action_field": "style",
                    "minimum": 0,
                    "maximum": 31
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set land height",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "raiseWater": {
            "name": "raise_water",
            "action": "waterraise",
            "arguments": [
                {
                    "name": "x1_game",
                    "wire_name": "x1_game",
                    "type": "integer",
                    "action_field": "x1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y1_game",
                    "wire_name": "y1_game",
                    "type": "integer",
                    "action_field": "y1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "x2_game",
                    "wire_name": "x2_game",
                    "type": "integer",
                    "action_field": "x2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y2_game",
                    "wire_name": "y2_game",
                    "type": "integer",
                    "action_field": "y2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to raise water",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "lowerWater": {
            "name": "lower_water",
            "action": "waterlower",
            "arguments": [
                {
                    "name": "x1_game",
                    "wire_name": "x1_game",
                    "type": "integer",
                    "action_field": "x1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y1_game",
                    "wire_name": "y1_game",
                    "type": "integer",
                    "action_field": "y1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "x2_game",
                    "wire_name": "x2_game",
                    "type": "integer",
                    "action_field": "x2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y2_game",
                    "wire_name": "y2_game",
                    "type": "integer",
                    "action_field": "y2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to lower water",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "setWaterHeight": {
            "name": "set_water_height",
            "action": "watersetheight",
            "arguments": [
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "height",
                    "wire_name": "height",
                    "type": "integer",
                    "action_field": "height",
                    "minimum": 2,
                    "maximum": 254
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set water height",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "setSurfaceStyle": {
            "name": "set_surface_style",
            "action": "surfacesetstyle",
            "arguments": [
                {
                    "name": "x1_game",
                    "wire_name": "x1_game",
                    "type": "integer",
                    "action_field": "x1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y1_game",
                    "wire_name": "y1_game",
                    "type": "integer",
                    "action_field": "y1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "x2_game",
                    "wire_name": "x2_game",
                    "type": "integer",
                    "action_field": "x2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y2_game",
                    "wire_name": "y2_game",
                    "type": "integer",
                    "action_field": "y2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "surface_object",
                    "wire_name": "surface_object",
                    "type": "integer",
                    "action_field": "surfaceStyle",
                    "minimum": 0,
                    "maximum": 65535
                },
                {
                    "name": "edge_object",
                    "wire_name": "edge_object",
                    "type": "integer",
                    "action_field": "edgeStyle",
                    "minimum": 0,
                    "maximum": 65535
                },
                {
                    "name": "surface_colour",
                    "wire_name": "surface_colour",
                    "type": "integer",
                    "action_field": "surfaceColour1",
                    "minimum": 0,
                    "maximum": 73
                },
                {
                    "name": "edge_colour",
                    "wire_name": "edge_colour",
                    "type": "integer",
                    "action_field": "edgeColour1",
                    "minimum": 0,
                    "maximum": 73
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to set surface style",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "clearScenery": {
            "name": "clear_scenery",
            "action": "clearscenery",
            "arguments": [
                {
                    "name": "x1_game",
                    "wire_name": "x1_game",
                    "type": "integer",
                    "action_field": "x1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y1_game",
                    "wire_name": "y1_game",
                    "type": "integer",
                    "action_field": "y1",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "x2_game",
                    "wire_name": "x2_game",
                    "type": "integer",
                    "action_field": "x2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "y2_game",
                    "wire_name": "y2_game",
                    "type": "integer",
                    "action_field": "y2",
                    "minimum": 0,
                    "maximum": 32031,
                    "multiple_of": 32
                },
                {
                    "name": "items_mask",
                    "wire_name": "items_mask",
                    "type": "integer",
                    "action_field": "itemsToClear",
                    "minimum": 0,
                    "maximum": 31
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to clear scenery",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "getLoadedObjects": {
            "name": "get_loaded_objects",
            "source": "objects",
            "object_type_arg": "object_type",
            "arguments": [
                {
                    "name": "object_type",
                    "wire_name": "object_type",
                    "type": "string",
                    "action_field": "object_type",
                    "values": {
                        "ride": "ride",
                        "small_scenery": "small_scenery",
                        "large_scenery": "large_scenery",
                        "wall": "wall",
                        "banner": "banner",
                        "footpath": "footpath",
                        "footpath_addition": "footpath_addition",
                        "scenery_group": "scenery_group",
                        "park_entrance": "park_entrance",
                        "water": "water",
                        "scenario_text": "scenario_text",
                        "terrain_surface": "terrain_surface",
                        "terrain_edge": "terrain_edge",
                        "station": "station",
                        "music": "music",
                        "footpath_surface": "footpath_surface",
                        "footpath_railings": "footpath_railings",
                        "audio": "audio",
                        "peep_names": "peep_names",
                        "peep_animations": "peep_animations",
                        "climate": "climate"
                    }
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get loaded objects",
            "allowed_modes": [
                "normal",
                "scenario_editor",
                "track_designer",
                "track_manager",
                "title"
            ],
            "readback": {
                "fields": [
                    {
                        "name": "index",
                        "property": "index",
                        "type": "integer"
                    },
                    {
                        "name": "identifier",
                        "property": "identifier",
                        "type": "string"
                    },
                    {
                        "name": "name",
                        "property": "name",
                        "type": "string"
                    }
                ]
            }
        },
        "listEntities": {
            "name": "list_entities",
            "source": "entities",
            "entity_type_arg": "entity_type",
            "arguments": [
                {
                    "name": "entity_type",
                    "wire_name": "entity_type",
                    "type": "string",
                    "action_field": "entity_type",
                    "values": {
                        "balloon": "balloon",
                        "car": "car",
                        "crash_splash": "crash_splash",
                        "crashed_vehicle_particle": "crashed_vehicle_particle",
                        "duck": "duck",
                        "explosion_cloud": "explosion_cloud",
                        "explosion_flare": "explosion_flare",
                        "jumping_fountain_snow": "jumping_fountain_snow",
                        "jumping_fountain_water": "jumping_fountain_water",
                        "litter": "litter",
                        "money_effect": "money_effect",
                        "guest": "guest",
                        "staff": "staff",
                        "steam_particle": "steam_particle",
                        "peep": "peep"
                    }
                },
                {
                    "name": "offset",
                    "wire_name": "offset",
                    "type": "integer",
                    "action_field": "offset",
                    "minimum": 0,
                    "maximum": 1000000
                },
                {
                    "name": "limit",
                    "wire_name": "limit",
                    "type": "integer",
                    "action_field": "limit",
                    "minimum": 1,
                    "maximum": 256
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to list entities",
            "readback": {
                "fields": [
                    {
                        "name": "id",
                        "property": "id",
                        "type": "integer"
                    },
                    {
                        "name": "type",
                        "property": "type",
                        "type": "string"
                    },
                    {
                        "name": "x_game",
                        "property": "x",
                        "type": "integer"
                    },
                    {
                        "name": "y_game",
                        "property": "y",
                        "type": "integer"
                    },
                    {
                        "name": "z_game",
                        "property": "z",
                        "type": "integer"
                    }
                ]
            }
        },
        "getEntityDetails": {
            "name": "get_entity_details",
            "source": "entity",
            "identity": "entity_id",
            "arguments": [
                {
                    "name": "entity_id",
                    "wire_name": "entity_id",
                    "type": "integer",
                    "action_field": "entity_id",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get entity details",
            "readback": {
                "fields": [
                    {
                        "name": "id",
                        "property": "id",
                        "type": "integer"
                    },
                    {
                        "name": "type",
                        "property": "type",
                        "type": "string"
                    },
                    {
                        "name": "x_game",
                        "property": "x",
                        "type": "integer"
                    },
                    {
                        "name": "y_game",
                        "property": "y",
                        "type": "integer"
                    },
                    {
                        "name": "z_game",
                        "property": "z",
                        "type": "integer"
                    }
                ]
            }
        },
        "getGuestDetails": {
            "name": "get_guest_details",
            "source": "entity",
            "identity": "guest_id",
            "entity_type": "guest",
            "arguments": [
                {
                    "name": "guest_id",
                    "wire_name": "guest_id",
                    "type": "integer",
                    "action_field": "guest_id",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get guest details",
            "readback": {
                "fields": [
                    {
                        "name": "id",
                        "property": "id",
                        "type": "integer"
                    },
                    {
                        "name": "type",
                        "property": "type",
                        "type": "string"
                    },
                    {
                        "name": "x_game",
                        "property": "x",
                        "type": "integer"
                    },
                    {
                        "name": "y_game",
                        "property": "y",
                        "type": "integer"
                    },
                    {
                        "name": "z_game",
                        "property": "z",
                        "type": "integer"
                    },
                    {
                        "name": "name",
                        "property": "name",
                        "type": "string"
                    },
                    {
                        "name": "direction",
                        "property": "direction",
                        "type": "integer"
                    },
                    {
                        "name": "energy",
                        "property": "energy",
                        "type": "integer"
                    },
                    {
                        "name": "energy_target",
                        "property": "energyTarget",
                        "type": "integer"
                    },
                    {
                        "name": "destination_x_game",
                        "property": "destination.x",
                        "type": "integer"
                    },
                    {
                        "name": "destination_y_game",
                        "property": "destination.y",
                        "type": "integer"
                    },
                    {
                        "name": "happiness",
                        "property": "happiness",
                        "type": "integer"
                    },
                    {
                        "name": "happiness_target",
                        "property": "happinessTarget",
                        "type": "integer"
                    },
                    {
                        "name": "nausea",
                        "property": "nausea",
                        "type": "integer"
                    },
                    {
                        "name": "nausea_target",
                        "property": "nauseaTarget",
                        "type": "integer"
                    },
                    {
                        "name": "hunger",
                        "property": "hunger",
                        "type": "integer"
                    },
                    {
                        "name": "thirst",
                        "property": "thirst",
                        "type": "integer"
                    },
                    {
                        "name": "toilet",
                        "property": "toilet",
                        "type": "integer"
                    },
                    {
                        "name": "cash_raw",
                        "property": "cash",
                        "type": "integer"
                    },
                    {
                        "name": "lost_countdown",
                        "property": "lostCountdown",
                        "type": "integer"
                    },
                    {
                        "name": "mass",
                        "property": "mass",
                        "type": "integer"
                    },
                    {
                        "name": "min_intensity",
                        "property": "minIntensity",
                        "type": "integer"
                    },
                    {
                        "name": "max_intensity",
                        "property": "maxIntensity",
                        "type": "integer"
                    },
                    {
                        "name": "nausea_tolerance",
                        "property": "nauseaTolerance",
                        "type": "integer"
                    },
                    {
                        "name": "in_park",
                        "property": "isInPark",
                        "type": "boolean"
                    },
                    {
                        "name": "lost",
                        "property": "isLost",
                        "type": "boolean"
                    },
                    {
                        "name": "favourite_ride",
                        "property": "favouriteRide",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "tshirt_colour",
                        "property": "tshirtColour",
                        "type": "integer"
                    },
                    {
                        "name": "trousers_colour",
                        "property": "trousersColour",
                        "type": "integer"
                    },
                    {
                        "name": "balloon_colour",
                        "property": "balloonColour",
                        "type": "integer"
                    },
                    {
                        "name": "hat_colour",
                        "property": "hatColour",
                        "type": "integer"
                    },
                    {
                        "name": "umbrella_colour",
                        "property": "umbrellaColour",
                        "type": "integer"
                    },
                    {
                        "name": "available_animations",
                        "property": "availableAnimations",
                        "type": "array",
                        "item_type": "string"
                    },
                    {
                        "name": "animation",
                        "property": "animation",
                        "type": "string"
                    },
                    {
                        "name": "animation_offset",
                        "property": "animationOffset",
                        "type": "integer"
                    },
                    {
                        "name": "animation_length",
                        "property": "animationLength",
                        "type": "integer"
                    }
                ]
            }
        },
        "getStaffDetails": {
            "name": "get_staff_details",
            "source": "entity",
            "identity": "staff_id",
            "entity_type": "staff",
            "arguments": [
                {
                    "name": "staff_id",
                    "wire_name": "staff_id",
                    "type": "integer",
                    "action_field": "staff_id",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get staff details",
            "readback": {
                "fields": [
                    {
                        "name": "id",
                        "property": "id",
                        "type": "integer"
                    },
                    {
                        "name": "type",
                        "property": "type",
                        "type": "string"
                    },
                    {
                        "name": "x_game",
                        "property": "x",
                        "type": "integer"
                    },
                    {
                        "name": "y_game",
                        "property": "y",
                        "type": "integer"
                    },
                    {
                        "name": "z_game",
                        "property": "z",
                        "type": "integer"
                    },
                    {
                        "name": "name",
                        "property": "name",
                        "type": "string"
                    },
                    {
                        "name": "direction",
                        "property": "direction",
                        "type": "integer"
                    },
                    {
                        "name": "energy",
                        "property": "energy",
                        "type": "integer"
                    },
                    {
                        "name": "energy_target",
                        "property": "energyTarget",
                        "type": "integer"
                    },
                    {
                        "name": "destination_x_game",
                        "property": "destination.x",
                        "type": "integer"
                    },
                    {
                        "name": "destination_y_game",
                        "property": "destination.y",
                        "type": "integer"
                    },
                    {
                        "name": "staff_type",
                        "property": "staffType",
                        "type": "string"
                    },
                    {
                        "name": "colour",
                        "property": "colour",
                        "type": "integer"
                    },
                    {
                        "name": "orders",
                        "property": "orders",
                        "type": "integer"
                    },
                    {
                        "name": "available_animations",
                        "property": "availableAnimations",
                        "type": "array",
                        "item_type": "string"
                    },
                    {
                        "name": "animation",
                        "property": "animation",
                        "type": "string"
                    },
                    {
                        "name": "animation_offset",
                        "property": "animationOffset",
                        "type": "integer"
                    },
                    {
                        "name": "animation_length",
                        "property": "animationLength",
                        "type": "integer"
                    },
                    {
                        "name": "available_costumes",
                        "property": "availableCostumes",
                        "type": "array",
                        "item_type": "string"
                    },
                    {
                        "name": "costume",
                        "property": "costume",
                        "type": "string",
                        "nullable": true
                    },
                    {
                        "name": "patrol_tiles",
                        "property": "patrolArea.tiles",
                        "type": "array",
                        "fields": [
                            {
                                "name": "x_tile",
                                "property": "x",
                                "type": "integer"
                            },
                            {
                                "name": "y_tile",
                                "property": "y",
                                "type": "integer"
                            }
                        ]
                    },
                    {
                        "name": "lawns_mown",
                        "property": "lawnsMown",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "gardens_watered",
                        "property": "gardensWatered",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "litter_swept",
                        "property": "litterSwept",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "bins_emptied",
                        "property": "binsEmptied",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "rides_fixed",
                        "property": "ridesFixed",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "rides_inspected",
                        "property": "ridesInspected",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "vandals_stopped",
                        "property": "vandalsStopped",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "guests_entertained",
                        "property": "guestsEntertained",
                        "type": "integer",
                        "nullable": true
                    }
                ]
            }
        },
        "getGuestFlags": {
            "name": "get_guest_flags",
            "source": "entity",
            "identity": "guest_id",
            "entity_type": "guest",
            "arguments": [
                {
                    "name": "guest_id",
                    "wire_name": "guest_id",
                    "type": "integer",
                    "action_field": "guest_id",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get guest flags",
            "readback": {
                "fields": [
                    {
                        "name": "leavingPark",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "leavingPark"
                    },
                    {
                        "name": "slowWalk",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "slowWalk"
                    },
                    {
                        "name": "tracking",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "tracking"
                    },
                    {
                        "name": "waving",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "waving"
                    },
                    {
                        "name": "hasPaidForParkEntry",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "hasPaidForParkEntry"
                    },
                    {
                        "name": "photo",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "photo"
                    },
                    {
                        "name": "painting",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "painting"
                    },
                    {
                        "name": "wow",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "wow"
                    },
                    {
                        "name": "litter",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "litter"
                    },
                    {
                        "name": "lost",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "lost"
                    },
                    {
                        "name": "hunger",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "hunger"
                    },
                    {
                        "name": "toilet",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "toilet"
                    },
                    {
                        "name": "crowded",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "crowded"
                    },
                    {
                        "name": "happiness",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "happiness"
                    },
                    {
                        "name": "nausea",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "nausea"
                    },
                    {
                        "name": "purple",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "purple"
                    },
                    {
                        "name": "pizza",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "pizza"
                    },
                    {
                        "name": "explode",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "explode"
                    },
                    {
                        "name": "rideShouldBeMarkedAsFavourite",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "rideShouldBeMarkedAsFavourite"
                    },
                    {
                        "name": "parkEntranceChosen",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "parkEntranceChosen"
                    },
                    {
                        "name": "contagious",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "contagious"
                    },
                    {
                        "name": "joy",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "joy"
                    },
                    {
                        "name": "angry",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "angry"
                    },
                    {
                        "name": "iceCream",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "iceCream"
                    },
                    {
                        "name": "hereWeAre",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "hereWeAre"
                    },
                    {
                        "name": "positionFrozen",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "positionFrozen"
                    },
                    {
                        "name": "animationFrozen",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "animationFrozen"
                    }
                ]
            }
        },
        "getStaffFlags": {
            "name": "get_staff_flags",
            "source": "entity",
            "identity": "staff_id",
            "entity_type": "staff",
            "arguments": [
                {
                    "name": "staff_id",
                    "wire_name": "staff_id",
                    "type": "integer",
                    "action_field": "staff_id",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get staff flags",
            "readback": {
                "fields": [
                    {
                        "name": "leavingPark",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "leavingPark"
                    },
                    {
                        "name": "slowWalk",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "slowWalk"
                    },
                    {
                        "name": "tracking",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "tracking"
                    },
                    {
                        "name": "waving",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "waving"
                    },
                    {
                        "name": "hasPaidForParkEntry",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "hasPaidForParkEntry"
                    },
                    {
                        "name": "photo",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "photo"
                    },
                    {
                        "name": "painting",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "painting"
                    },
                    {
                        "name": "wow",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "wow"
                    },
                    {
                        "name": "litter",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "litter"
                    },
                    {
                        "name": "lost",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "lost"
                    },
                    {
                        "name": "hunger",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "hunger"
                    },
                    {
                        "name": "toilet",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "toilet"
                    },
                    {
                        "name": "crowded",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "crowded"
                    },
                    {
                        "name": "happiness",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "happiness"
                    },
                    {
                        "name": "nausea",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "nausea"
                    },
                    {
                        "name": "purple",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "purple"
                    },
                    {
                        "name": "pizza",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "pizza"
                    },
                    {
                        "name": "explode",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "explode"
                    },
                    {
                        "name": "rideShouldBeMarkedAsFavourite",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "rideShouldBeMarkedAsFavourite"
                    },
                    {
                        "name": "parkEntranceChosen",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "parkEntranceChosen"
                    },
                    {
                        "name": "contagious",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "contagious"
                    },
                    {
                        "name": "joy",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "joy"
                    },
                    {
                        "name": "angry",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "angry"
                    },
                    {
                        "name": "iceCream",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "iceCream"
                    },
                    {
                        "name": "hereWeAre",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "hereWeAre"
                    },
                    {
                        "name": "positionFrozen",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "positionFrozen"
                    },
                    {
                        "name": "animationFrozen",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "animationFrozen"
                    }
                ]
            }
        },
        "getVehicleDetails": {
            "name": "get_vehicle_details",
            "source": "entity",
            "identity": "entity_id",
            "entity_type": "car",
            "arguments": [
                {
                    "name": "entity_id",
                    "wire_name": "entity_id",
                    "type": "integer",
                    "action_field": "entity_id",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get vehicle details",
            "readback": {
                "fields": [
                    {
                        "name": "id",
                        "property": "id",
                        "type": "integer"
                    },
                    {
                        "name": "type",
                        "property": "type",
                        "type": "string"
                    },
                    {
                        "name": "x_game",
                        "property": "x",
                        "type": "integer"
                    },
                    {
                        "name": "y_game",
                        "property": "y",
                        "type": "integer"
                    },
                    {
                        "name": "z_game",
                        "property": "z",
                        "type": "integer"
                    },
                    {
                        "name": "ride_id",
                        "property": "ride",
                        "type": "integer"
                    },
                    {
                        "name": "ride_object",
                        "property": "rideObject",
                        "type": "integer"
                    },
                    {
                        "name": "vehicle_object",
                        "property": "vehicleObject",
                        "type": "integer"
                    },
                    {
                        "name": "num_seats",
                        "property": "numSeats",
                        "type": "integer"
                    },
                    {
                        "name": "velocity_raw",
                        "property": "velocity",
                        "type": "integer"
                    },
                    {
                        "name": "acceleration_raw",
                        "property": "acceleration",
                        "type": "integer"
                    },
                    {
                        "name": "mass",
                        "property": "mass",
                        "type": "integer"
                    },
                    {
                        "name": "current_station",
                        "property": "currentStation",
                        "type": "integer"
                    },
                    {
                        "name": "next_car",
                        "property": "nextCarOnTrain",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "previous_car_on_ride",
                        "property": "previousCarOnRide",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "next_car_on_ride",
                        "property": "nextCarOnRide",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "track_progress",
                        "property": "trackProgress",
                        "type": "integer"
                    },
                    {
                        "name": "remaining_distance",
                        "property": "remainingDistance",
                        "type": "integer"
                    },
                    {
                        "name": "powered_acceleration",
                        "property": "poweredAcceleration",
                        "type": "integer"
                    },
                    {
                        "name": "powered_max_speed",
                        "property": "poweredMaxSpeed",
                        "type": "integer"
                    },
                    {
                        "name": "spin",
                        "property": "spin",
                        "type": "integer"
                    },
                    {
                        "name": "status",
                        "property": "status",
                        "type": "string"
                    },
                    {
                        "name": "crashed",
                        "property": "isCrashed",
                        "type": "boolean"
                    },
                    {
                        "name": "reversed",
                        "property": "isReversed",
                        "type": "boolean"
                    },
                    {
                        "name": "guests",
                        "property": "guests",
                        "type": "array",
                        "item_type": "integer",
                        "nullable_items": true
                    },
                    {
                        "name": "sprite_type",
                        "property": "spriteType",
                        "type": "integer"
                    },
                    {
                        "name": "bank_rotation",
                        "property": "bankRotation",
                        "type": "integer"
                    },
                    {
                        "name": "subposition",
                        "property": "subposition",
                        "type": "integer"
                    },
                    {
                        "name": "colours",
                        "property": "colours",
                        "type": "record",
                        "fields": [
                            {
                                "name": "body",
                                "property": "body",
                                "type": "integer"
                            },
                            {
                                "name": "trim",
                                "property": "trim",
                                "type": "integer"
                            },
                            {
                                "name": "tertiary",
                                "property": "tertiary",
                                "type": "integer"
                            }
                        ]
                    },
                    {
                        "name": "track_location",
                        "property": "trackLocation",
                        "type": "record",
                        "fields": [
                            {
                                "name": "x",
                                "property": "x",
                                "type": "integer"
                            },
                            {
                                "name": "y",
                                "property": "y",
                                "type": "integer"
                            },
                            {
                                "name": "z",
                                "property": "z",
                                "type": "integer"
                            },
                            {
                                "name": "direction",
                                "property": "direction",
                                "type": "integer"
                            },
                            {
                                "name": "track_type",
                                "property": "trackType",
                                "type": "integer"
                            }
                        ]
                    },
                    {
                        "name": "g_forces_raw",
                        "property": "gForces",
                        "type": "record",
                        "fields": [
                            {
                                "name": "lateral_raw",
                                "property": "lateralG",
                                "type": "number"
                            },
                            {
                                "name": "vertical_raw",
                                "property": "verticalG",
                                "type": "number"
                            }
                        ]
                    }
                ]
            }
        },
        "getCalendar": {
            "name": "get_calendar",
            "source": "date",
            "response": "observation",
            "error_prefix": "Failed to get calendar",
            "readback": {
                "fields": [
                    {
                        "name": "ticks",
                        "property": "ticksElapsed",
                        "type": "integer"
                    },
                    {
                        "name": "months_elapsed",
                        "property": "monthsElapsed",
                        "type": "integer"
                    },
                    {
                        "name": "years_elapsed",
                        "property": "yearsElapsed",
                        "type": "integer"
                    },
                    {
                        "name": "month_progress",
                        "property": "monthProgress",
                        "type": "integer"
                    },
                    {
                        "name": "day",
                        "property": "day",
                        "type": "integer"
                    },
                    {
                        "name": "month",
                        "property": "month",
                        "type": "integer"
                    },
                    {
                        "name": "year",
                        "property": "year",
                        "type": "integer"
                    }
                ]
            }
        },
        "getWeather": {
            "name": "get_weather",
            "source": "climate",
            "response": "observation",
            "error_prefix": "Failed to get weather",
            "readback": {
                "fields": [
                    {
                        "name": "climate_type",
                        "property": "type",
                        "type": "string"
                    },
                    {
                        "name": "current_weather",
                        "property": "current.weather",
                        "type": "string"
                    },
                    {
                        "name": "current_temperature_c",
                        "property": "current.temperature",
                        "type": "integer"
                    },
                    {
                        "name": "future_weather",
                        "property": "future.weather",
                        "type": "string"
                    },
                    {
                        "name": "future_temperature_c",
                        "property": "future.temperature",
                        "type": "integer"
                    }
                ]
            }
        },
        "getResearchStatus": {
            "name": "get_research_status",
            "source": "research",
            "response": "observation",
            "error_prefix": "Failed to get research status",
            "readback": {
                "fields": [
                    {
                        "name": "funding",
                        "property": "funding",
                        "type": "integer"
                    },
                    {
                        "name": "stage",
                        "property": "stage",
                        "type": "string"
                    },
                    {
                        "name": "progress",
                        "property": "progress",
                        "type": "integer"
                    },
                    {
                        "name": "expected_month",
                        "property": "expectedMonth",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "expected_day",
                        "property": "expectedDay",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "priorities",
                        "property": "priorities",
                        "type": "array",
                        "item_type": "string"
                    },
                    {
                        "name": "last_researched_item",
                        "property": "lastResearchedItem",
                        "type": "record",
                        "nullable": true,
                        "fields": [
                            {
                                "name": "type",
                                "property": "type",
                                "type": "string"
                            },
                            {
                                "name": "category",
                                "property": "category",
                                "type": "string"
                            },
                            {
                                "name": "object_index",
                                "property": "object",
                                "type": "integer"
                            },
                            {
                                "name": "ride_type",
                                "property": "rideType",
                                "type": "integer",
                                "nullable": true
                            }
                        ]
                    },
                    {
                        "name": "expected_item",
                        "property": "expectedItem",
                        "type": "record",
                        "nullable": true,
                        "fields": [
                            {
                                "name": "type",
                                "property": "type",
                                "type": "string"
                            },
                            {
                                "name": "category",
                                "property": "category",
                                "type": "string"
                            },
                            {
                                "name": "object_index",
                                "property": "object",
                                "type": "integer"
                            },
                            {
                                "name": "ride_type",
                                "property": "rideType",
                                "type": "integer",
                                "nullable": true
                            }
                        ]
                    }
                ]
            }
        },
        "getParkGuestGeneration": {
            "name": "get_park_guest_generation",
            "source": "park",
            "response": "observation",
            "error_prefix": "Failed to get park guest generation",
            "readback": {
                "fields": [
                    {
                        "name": "guests",
                        "property": "guests",
                        "type": "integer"
                    },
                    {
                        "name": "suggested_guest_maximum",
                        "property": "suggestedGuestMaximum",
                        "type": "integer"
                    },
                    {
                        "name": "guest_generation_probability",
                        "property": "guestGenerationProbability",
                        "type": "integer"
                    },
                    {
                        "name": "guest_initial_cash_raw",
                        "property": "guestInitialCash",
                        "type": "integer"
                    },
                    {
                        "name": "guest_initial_happiness",
                        "property": "guestInitialHappiness",
                        "type": "integer"
                    },
                    {
                        "name": "guest_initial_hunger",
                        "property": "guestInitialHunger",
                        "type": "integer"
                    },
                    {
                        "name": "guest_initial_thirst",
                        "property": "guestInitialThirst",
                        "type": "integer"
                    },
                    {
                        "name": "total_admissions",
                        "property": "totalAdmissions",
                        "type": "integer"
                    },
                    {
                        "name": "total_income_from_admissions_raw",
                        "property": "totalIncomeFromAdmissions",
                        "type": "integer"
                    },
                    {
                        "name": "park_size",
                        "property": "parkSize",
                        "type": "integer"
                    }
                ]
            }
        },
        "getParkFlags": {
            "name": "get_park_flags",
            "source": "park",
            "response": "observation",
            "error_prefix": "Failed to get park flags",
            "readback": {
                "fields": [
                    {
                        "name": "difficultGuestGeneration",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "difficultGuestGeneration"
                    },
                    {
                        "name": "difficultParkRating",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "difficultParkRating"
                    },
                    {
                        "name": "forbidHighConstruction",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "forbidHighConstruction"
                    },
                    {
                        "name": "forbidLandscapeChanges",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "forbidLandscapeChanges"
                    },
                    {
                        "name": "forbidMarketingCampaigns",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "forbidMarketingCampaigns"
                    },
                    {
                        "name": "forbidTreeRemoval",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "forbidTreeRemoval"
                    },
                    {
                        "name": "freeParkEntry",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "freeParkEntry"
                    },
                    {
                        "name": "noMoney",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "noMoney"
                    },
                    {
                        "name": "open",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "open"
                    },
                    {
                        "name": "preferLessIntenseRides",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "preferLessIntenseRides"
                    },
                    {
                        "name": "preferMoreIntenseRides",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "preferMoreIntenseRides"
                    },
                    {
                        "name": "scenarioCompleteNameInput",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "scenarioCompleteNameInput"
                    },
                    {
                        "name": "unlockAllPrices",
                        "property": "getFlag",
                        "type": "boolean",
                        "method": "getFlag",
                        "method_arg": "unlockAllPrices"
                    }
                ]
            }
        },
        "getGameState": {
            "name": "get_game_state",
            "source": "context",
            "response": "observation",
            "error_prefix": "Failed to get game state",
            "allowed_modes": [
                "normal",
                "title",
                "scenario_editor",
                "track_designer",
                "track_manager"
            ],
            "readback": {
                "fields": [
                    {
                        "name": "mode",
                        "property": "mode",
                        "type": "string"
                    },
                    {
                        "name": "paused",
                        "property": "paused",
                        "type": "boolean"
                    },
                    {
                        "name": "speed",
                        "property": "gameSpeed",
                        "type": "integer"
                    },
                    {
                        "name": "api_version",
                        "property": "apiVersion",
                        "type": "integer"
                    }
                ]
            }
        },
        "startRideMarketingCampaign": {
            "name": "start_ride_marketing_campaign",
            "action": "parkmarketing",
            "identity": "ride_id",
            "target": "ride",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "item",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "campaign",
                    "wire_name": "campaign",
                    "type": "string",
                    "action_field": "type",
                    "values": {
                        "free_rides": 1,
                        "ride_advertising": 5
                    }
                },
                {
                    "name": "weeks",
                    "wire_name": "weeks",
                    "type": "integer",
                    "action_field": "duration",
                    "minimum": 1,
                    "maximum": 255
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to start marketing campaign",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "createUnbuiltRide": {
            "name": "create_unbuilt_ride",
            "action": "ridecreate",
            "arguments": [
                {
                    "name": "ride_type",
                    "wire_name": "ride_type",
                    "type": "integer",
                    "action_field": "rideType",
                    "minimum": 0,
                    "maximum": 255
                },
                {
                    "name": "ride_object",
                    "wire_name": "ride_object",
                    "type": "integer",
                    "action_field": "rideObject",
                    "minimum": 0,
                    "maximum": 65535
                },
                {
                    "name": "entrance_object",
                    "wire_name": "entrance_object",
                    "type": "integer",
                    "action_field": "entranceObject",
                    "minimum": 0,
                    "maximum": 65535
                },
                {
                    "name": "track_colour_preset",
                    "wire_name": "track_colour_preset",
                    "type": "integer",
                    "action_field": "colour1",
                    "minimum": 0,
                    "maximum": 255
                },
                {
                    "name": "vehicle_colour_preset",
                    "wire_name": "vehicle_colour_preset",
                    "type": "integer",
                    "action_field": "colour2",
                    "minimum": 0,
                    "maximum": 255
                },
                {
                    "name": "inspection_interval",
                    "wire_name": "inspection_interval",
                    "type": "integer",
                    "action_field": "inspectionInterval",
                    "minimum": 0,
                    "maximum": 6
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to create unbuilt ride",
            "result_fields": [
                {
                    "name": "ride_id",
                    "property": "ride",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "removeStationBuilding": {
            "name": "remove_station_building",
            "action": "rideentranceexitremove",
            "identity": "ride_id",
            "arguments": [
                {
                    "name": "ride_id",
                    "wire_name": "rideId",
                    "type": "integer",
                    "action_field": "ride",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "x_game",
                    "wire_name": "x_game",
                    "type": "integer",
                    "action_field": "x",
                    "minimum": 0,
                    "maximum": 32031
                },
                {
                    "name": "y_game",
                    "wire_name": "y_game",
                    "type": "integer",
                    "action_field": "y",
                    "minimum": 0,
                    "maximum": 32031
                },
                {
                    "name": "station_index",
                    "wire_name": "station_index",
                    "type": "integer",
                    "action_field": "station",
                    "minimum": 0,
                    "maximum": 3
                },
                {
                    "name": "is_exit",
                    "wire_name": "is_exit",
                    "type": "boolean",
                    "action_field": "isExit"
                }
            ],
            "response": "payload",
            "error_prefix": "Failed to remove station building"
        },
        "getScenarioDetails": {
            "name": "get_scenario_details",
            "source": "scenario",
            "response": "observation",
            "error_prefix": "Failed to read scenario",
            "readback": {
                "fields": [
                    {
                        "name": "name",
                        "property": "name",
                        "type": "string"
                    },
                    {
                        "name": "details",
                        "property": "details",
                        "type": "string"
                    },
                    {
                        "name": "filename",
                        "property": "filename",
                        "type": "string"
                    },
                    {
                        "name": "status",
                        "property": "status",
                        "type": "string"
                    },
                    {
                        "name": "objective_type",
                        "property": "objective.type",
                        "type": "string"
                    },
                    {
                        "name": "completed_by",
                        "property": "completedBy",
                        "type": "string"
                    },
                    {
                        "name": "completed_company_value_raw",
                        "property": "completedCompanyValue",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "company_value_record_raw",
                        "property": "companyValueRecord",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "park_rating_warning_days",
                        "property": "parkRatingWarningDays",
                        "type": "integer"
                    }
                ]
            }
        },
        "getGuestThoughts": {
            "name": "get_guest_thoughts",
            "source": "entity",
            "identity": "guest_id",
            "entity_type": "guest",
            "arguments": [
                {
                    "name": "guest_id",
                    "wire_name": "guest_id",
                    "type": "integer",
                    "action_field": "guest_id",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "offset",
                    "wire_name": "offset",
                    "type": "integer",
                    "action_field": "offset",
                    "minimum": 0,
                    "maximum": 1000000
                },
                {
                    "name": "limit",
                    "wire_name": "limit",
                    "type": "integer",
                    "action_field": "limit",
                    "minimum": 1,
                    "maximum": 256
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get guest thoughts",
            "readback": {
                "fields": [
                    {
                        "name": "thoughts",
                        "property": "thoughts",
                        "type": "array",
                        "fields": [
                            {
                                "name": "type",
                                "property": "type",
                                "type": "string"
                            },
                            {
                                "name": "item",
                                "property": "item",
                                "type": "integer"
                            },
                            {
                                "name": "freshness",
                                "property": "freshness",
                                "type": "integer"
                            },
                            {
                                "name": "fresh_timeout",
                                "property": "freshTimeout",
                                "type": "integer"
                            }
                        ],
                        "offset_arg": "offset",
                        "limit_arg": "limit"
                    }
                ]
            }
        },
        "getGuestItems": {
            "name": "get_guest_items",
            "source": "entity",
            "identity": "guest_id",
            "entity_type": "guest",
            "arguments": [
                {
                    "name": "guest_id",
                    "wire_name": "guest_id",
                    "type": "integer",
                    "action_field": "guest_id",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "offset",
                    "wire_name": "offset",
                    "type": "integer",
                    "action_field": "offset",
                    "minimum": 0,
                    "maximum": 1000000
                },
                {
                    "name": "limit",
                    "wire_name": "limit",
                    "type": "integer",
                    "action_field": "limit",
                    "minimum": 1,
                    "maximum": 256
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get guest items",
            "readback": {
                "fields": [
                    {
                        "name": "items",
                        "property": "items",
                        "type": "array",
                        "fields": [
                            {
                                "name": "type",
                                "property": "type",
                                "type": "string"
                            },
                            {
                                "name": "ride_id",
                                "property": "rideId",
                                "type": "integer",
                                "nullable": true
                            },
                            {
                                "name": "voucher_type",
                                "property": "voucherType",
                                "type": "string",
                                "nullable": true
                            },
                            {
                                "name": "food_drink_item",
                                "property": "item",
                                "type": "string",
                                "nullable": true
                            }
                        ],
                        "offset_arg": "offset",
                        "limit_arg": "limit"
                    }
                ]
            }
        },
        "getResearchItems": {
            "name": "get_research_items",
            "source": "research",
            "arguments": [
                {
                    "name": "offset",
                    "wire_name": "offset",
                    "type": "integer",
                    "action_field": "offset",
                    "minimum": 0,
                    "maximum": 1000000
                },
                {
                    "name": "limit",
                    "wire_name": "limit",
                    "type": "integer",
                    "action_field": "limit",
                    "minimum": 1,
                    "maximum": 256
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get research items",
            "readback": {
                "fields": [
                    {
                        "name": "invented",
                        "property": "inventedItems",
                        "type": "array",
                        "fields": [
                            {
                                "name": "type",
                                "property": "type",
                                "type": "string"
                            },
                            {
                                "name": "category",
                                "property": "category",
                                "type": "string"
                            },
                            {
                                "name": "object_index",
                                "property": "object",
                                "type": "integer"
                            },
                            {
                                "name": "ride_type",
                                "property": "rideType",
                                "type": "integer",
                                "nullable": true
                            }
                        ],
                        "offset_arg": "offset",
                        "limit_arg": "limit"
                    },
                    {
                        "name": "uninvented",
                        "property": "uninventedItems",
                        "type": "array",
                        "fields": [
                            {
                                "name": "type",
                                "property": "type",
                                "type": "string"
                            },
                            {
                                "name": "category",
                                "property": "category",
                                "type": "string"
                            },
                            {
                                "name": "object_index",
                                "property": "object",
                                "type": "integer"
                            },
                            {
                                "name": "ride_type",
                                "property": "rideType",
                                "type": "integer",
                                "nullable": true
                            }
                        ],
                        "offset_arg": "offset",
                        "limit_arg": "limit"
                    }
                ]
            }
        },
        "getParkMessages": {
            "name": "get_park_messages",
            "source": "park",
            "arguments": [
                {
                    "name": "offset",
                    "wire_name": "offset",
                    "type": "integer",
                    "action_field": "offset",
                    "minimum": 0,
                    "maximum": 1000000
                },
                {
                    "name": "limit",
                    "wire_name": "limit",
                    "type": "integer",
                    "action_field": "limit",
                    "minimum": 1,
                    "maximum": 256
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get park messages",
            "readback": {
                "fields": [
                    {
                        "name": "messages",
                        "property": "messages",
                        "type": "array",
                        "fields": [
                            {
                                "name": "archived",
                                "property": "isArchived",
                                "type": "boolean"
                            },
                            {
                                "name": "month",
                                "property": "month",
                                "type": "integer"
                            },
                            {
                                "name": "day",
                                "property": "day",
                                "type": "integer"
                            },
                            {
                                "name": "ticks_old",
                                "property": "tickCount",
                                "type": "integer"
                            },
                            {
                                "name": "type",
                                "property": "type",
                                "type": "string"
                            },
                            {
                                "name": "text",
                                "property": "text",
                                "type": "string"
                            },
                            {
                                "name": "subject",
                                "property": "subject",
                                "type": "integer",
                                "nullable": true
                            }
                        ],
                        "offset_arg": "offset",
                        "limit_arg": "limit"
                    }
                ]
            }
        },
        "getParkAwards": {
            "name": "get_park_awards",
            "source": "park",
            "arguments": [
                {
                    "name": "offset",
                    "wire_name": "offset",
                    "type": "integer",
                    "action_field": "offset",
                    "minimum": 0,
                    "maximum": 1000000
                },
                {
                    "name": "limit",
                    "wire_name": "limit",
                    "type": "integer",
                    "action_field": "limit",
                    "minimum": 1,
                    "maximum": 256
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get park awards",
            "readback": {
                "fields": [
                    {
                        "name": "awards",
                        "property": "awards",
                        "type": "array",
                        "fields": [
                            {
                                "name": "type",
                                "property": "type",
                                "type": "string"
                            },
                            {
                                "name": "text",
                                "property": "text",
                                "type": "string"
                            },
                            {
                                "name": "months_remaining",
                                "property": "monthsRemaining",
                                "type": "integer"
                            },
                            {
                                "name": "image_id",
                                "property": "imageId",
                                "type": "integer"
                            },
                            {
                                "name": "positive",
                                "property": "positive",
                                "type": "boolean"
                            }
                        ],
                        "offset_arg": "offset",
                        "limit_arg": "limit"
                    }
                ]
            }
        },
        "getMonthlyExpenditure": {
            "name": "get_monthly_expenditure",
            "source": "park",
            "arguments": [
                {
                    "name": "category",
                    "wire_name": "category",
                    "type": "string",
                    "action_field": "category",
                    "values": {
                        "ride_construction": "ride_construction",
                        "ride_runningcosts": "ride_runningcosts",
                        "land_purchase": "land_purchase",
                        "landscaping": "landscaping",
                        "park_entrance_tickets": "park_entrance_tickets",
                        "park_ride_tickets": "park_ride_tickets",
                        "shop_sales": "shop_sales",
                        "shop_stock": "shop_stock",
                        "food_drink_sales": "food_drink_sales",
                        "food_drink_stock": "food_drink_stock",
                        "wages": "wages",
                        "marketing": "marketing",
                        "research": "research",
                        "interest": "interest"
                    }
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get monthly expenditure",
            "readback": {
                "fields": [
                    {
                        "name": "amounts_raw",
                        "property": "getMonthlyExpenditure",
                        "type": "array",
                        "method": "getMonthlyExpenditure",
                        "method_arg_arg": "category",
                        "item_type": "integer"
                    }
                ]
            }
        },
        "getBalloonDetails": {
            "name": "get_balloon_details",
            "source": "entity",
            "identity": "entity_id",
            "entity_type": "balloon",
            "arguments": [
                {
                    "name": "entity_id",
                    "wire_name": "entity_id",
                    "type": "integer",
                    "action_field": "entity_id",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get balloon details",
            "readback": {
                "fields": [
                    {
                        "name": "id",
                        "property": "id",
                        "type": "integer"
                    },
                    {
                        "name": "type",
                        "property": "type",
                        "type": "string"
                    },
                    {
                        "name": "x_game",
                        "property": "x",
                        "type": "integer"
                    },
                    {
                        "name": "y_game",
                        "property": "y",
                        "type": "integer"
                    },
                    {
                        "name": "z_game",
                        "property": "z",
                        "type": "integer"
                    },
                    {
                        "name": "colour",
                        "property": "colour",
                        "type": "integer"
                    }
                ]
            }
        },
        "getLitterDetails": {
            "name": "get_litter_details",
            "source": "entity",
            "identity": "entity_id",
            "entity_type": "litter",
            "arguments": [
                {
                    "name": "entity_id",
                    "wire_name": "entity_id",
                    "type": "integer",
                    "action_field": "entity_id",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to get litter details",
            "readback": {
                "fields": [
                    {
                        "name": "id",
                        "property": "id",
                        "type": "integer"
                    },
                    {
                        "name": "type",
                        "property": "type",
                        "type": "string"
                    },
                    {
                        "name": "x_game",
                        "property": "x",
                        "type": "integer"
                    },
                    {
                        "name": "y_game",
                        "property": "y",
                        "type": "integer"
                    },
                    {
                        "name": "z_game",
                        "property": "z",
                        "type": "integer"
                    },
                    {
                        "name": "litter_type",
                        "property": "litterType",
                        "type": "string"
                    },
                    {
                        "name": "creation_tick",
                        "property": "creationTick",
                        "type": "integer"
                    }
                ]
            }
        },
        "startFoodMarketingCampaign": {
            "name": "start_food_marketing_campaign",
            "action": "parkmarketing",
            "arguments": [
                {
                    "name": "item",
                    "wire_name": "item",
                    "type": "string",
                    "action_field": "item",
                    "values": {
                        "drink": 5,
                        "burger": 6,
                        "chips": 7,
                        "ice_cream": 8,
                        "candyfloss": 9,
                        "pizza": 13,
                        "popcorn": 15,
                        "hot_dog": 16,
                        "tentacle": 17,
                        "toffee_apple": 19,
                        "doughnut": 21,
                        "coffee": 22,
                        "chicken": 24,
                        "lemonade": 25,
                        "pretzel": 35,
                        "chocolate": 36,
                        "iced_tea": 37,
                        "funnel_cake": 38,
                        "beef_noodles": 40,
                        "fried_rice_noodles": 41,
                        "wonton_soup": 42,
                        "meatball_soup": 43,
                        "fruit_juice": 44,
                        "soybean_milk": 45,
                        "sujeonggwa": 46,
                        "sub_sandwich": 47,
                        "cookie": 48,
                        "roast_sausage": 52
                    }
                },
                {
                    "name": "weeks",
                    "wire_name": "weeks",
                    "type": "integer",
                    "action_field": "duration",
                    "minimum": 1,
                    "maximum": 255
                }
            ],
            "constants": {
                "type": 2
            },
            "response": "payload",
            "error_prefix": "Failed to start marketing campaign",
            "result_fields": [
                {
                    "name": "cost_raw",
                    "property": "cost",
                    "type": "integer",
                    "nullable": true
                }
            ]
        },
        "getLoadedObjectDetails": {
            "name": "get_loaded_object_details",
            "source": "object",
            "identity": "object_index",
            "object_type_arg": "object_type",
            "arguments": [
                {
                    "name": "object_type",
                    "wire_name": "object_type",
                    "type": "string",
                    "action_field": "object_type",
                    "values": {
                        "ride": "ride",
                        "small_scenery": "small_scenery",
                        "large_scenery": "large_scenery",
                        "wall": "wall",
                        "banner": "banner",
                        "footpath": "footpath",
                        "footpath_addition": "footpath_addition",
                        "scenery_group": "scenery_group",
                        "park_entrance": "park_entrance",
                        "water": "water",
                        "scenario_text": "scenario_text",
                        "terrain_surface": "terrain_surface",
                        "terrain_edge": "terrain_edge",
                        "station": "station",
                        "music": "music",
                        "footpath_surface": "footpath_surface",
                        "footpath_railings": "footpath_railings",
                        "audio": "audio",
                        "peep_names": "peep_names",
                        "peep_animations": "peep_animations",
                        "climate": "climate"
                    }
                },
                {
                    "name": "object_index",
                    "wire_name": "object_index",
                    "type": "integer",
                    "action_field": "object_index",
                    "minimum": 0,
                    "maximum": 65534
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to read loaded object",
            "allowed_modes": [
                "normal",
                "scenario_editor",
                "track_designer",
                "track_manager",
                "title"
            ],
            "readback": {
                "fields": [
                    {
                        "name": "index",
                        "property": "index",
                        "type": "integer"
                    },
                    {
                        "name": "type",
                        "property": "type",
                        "type": "string"
                    },
                    {
                        "name": "identifier",
                        "property": "identifier",
                        "type": "string"
                    },
                    {
                        "name": "legacy_identifier",
                        "property": "legacyIdentifier",
                        "type": "string",
                        "nullable": true
                    },
                    {
                        "name": "name",
                        "property": "name",
                        "type": "string"
                    },
                    {
                        "name": "ride_types_raw",
                        "property": "rideType",
                        "type": "array",
                        "nullable": true,
                        "item_type": "integer"
                    },
                    {
                        "name": "scenery_groups",
                        "property": "sceneryGroups",
                        "type": "array",
                        "nullable": true,
                        "item_type": "string"
                    },
                    {
                        "name": "large_scenery_tiles",
                        "property": "tiles",
                        "type": "array",
                        "nullable": true,
                        "fields": [
                            {
                                "name": "offset",
                                "property": "offset",
                                "type": "record",
                                "fields": [
                                    {
                                        "name": "x",
                                        "property": "x",
                                        "type": "integer"
                                    },
                                    {
                                        "name": "y",
                                        "property": "y",
                                        "type": "integer"
                                    },
                                    {
                                        "name": "z",
                                        "property": "z",
                                        "type": "integer"
                                    }
                                ]
                            },
                            {
                                "name": "z_clearance_raw",
                                "property": "zClearance",
                                "type": "integer"
                            },
                            {
                                "name": "has_supports",
                                "property": "hasSupports",
                                "type": "boolean"
                            },
                            {
                                "name": "allow_supports_above",
                                "property": "allowSupportsAbove",
                                "type": "boolean"
                            },
                            {
                                "name": "corners",
                                "property": "corners",
                                "type": "integer"
                            },
                            {
                                "name": "walls",
                                "property": "walls",
                                "type": "integer"
                            }
                        ]
                    },
                    {
                        "name": "flags_raw",
                        "property": "flags",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "description",
                        "property": "description",
                        "type": "string",
                        "nullable": true
                    },
                    {
                        "name": "capacity",
                        "property": "capacity",
                        "type": "string",
                        "nullable": true
                    },
                    {
                        "name": "min_cars",
                        "property": "minCarsInTrain",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "max_cars",
                        "property": "maxCarsInTrain",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "flat_ride_cars",
                        "property": "carsPerFlatRide",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "max_height_raw",
                        "property": "maxHeight",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "primary_shop_item_raw",
                        "property": "shopItem",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "secondary_shop_item_raw",
                        "property": "shopItemSecondary",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "small_scenery_height_raw",
                        "property": "height",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "price_raw",
                        "property": "price",
                        "type": "integer",
                        "nullable": true
                    },
                    {
                        "name": "removal_price_raw",
                        "property": "removalPrice",
                        "type": "integer",
                        "nullable": true
                    }
                ]
            }
        },
        "getInstalledObjects": {
            "name": "get_installed_objects",
            "source": "object_manager",
            "arguments": [
                {
                    "name": "offset",
                    "wire_name": "offset",
                    "type": "integer",
                    "action_field": "offset",
                    "minimum": 0,
                    "maximum": 1000000
                },
                {
                    "name": "limit",
                    "wire_name": "limit",
                    "type": "integer",
                    "action_field": "limit",
                    "minimum": 1,
                    "maximum": 256
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to read installed objects",
            "allowed_modes": [
                "normal",
                "scenario_editor",
                "track_designer",
                "track_manager",
                "title"
            ],
            "readback": {
                "fields": [
                    {
                        "name": "objects",
                        "property": "installedObjects",
                        "type": "array",
                        "fields": [
                            {
                                "name": "generation",
                                "property": "generation",
                                "type": "string"
                            },
                            {
                                "name": "type",
                                "property": "type",
                                "type": "string"
                            },
                            {
                                "name": "identifier",
                                "property": "identifier",
                                "type": "string"
                            },
                            {
                                "name": "legacy_identifier",
                                "property": "legacyIdentifier",
                                "type": "string",
                                "nullable": true
                            },
                            {
                                "name": "version",
                                "property": "version",
                                "type": "string",
                                "nullable": true
                            },
                            {
                                "name": "name",
                                "property": "name",
                                "type": "string"
                            },
                            {
                                "name": "authors",
                                "property": "authors",
                                "type": "array",
                                "item_type": "string"
                            },
                            {
                                "name": "source_games",
                                "property": "sourceGames",
                                "type": "array",
                                "item_type": "string"
                            }
                        ],
                        "offset_arg": "offset",
                        "limit_arg": "limit"
                    }
                ]
            }
        },
        "getStaffPatrolTiles": {
            "name": "get_staff_patrol_tiles",
            "source": "entity",
            "identity": "staff_id",
            "entity_type": "staff",
            "arguments": [
                {
                    "name": "staff_id",
                    "wire_name": "staff_id",
                    "type": "integer",
                    "action_field": "staff_id",
                    "minimum": 0,
                    "maximum": 65534
                },
                {
                    "name": "offset",
                    "wire_name": "offset",
                    "type": "integer",
                    "action_field": "offset",
                    "minimum": 0,
                    "maximum": 1000000
                },
                {
                    "name": "limit",
                    "wire_name": "limit",
                    "type": "integer",
                    "action_field": "limit",
                    "minimum": 1,
                    "maximum": 256
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to read patrol area",
            "readback": {
                "fields": [
                    {
                        "name": "tiles",
                        "property": "patrolArea.tiles",
                        "type": "array",
                        "fields": [
                            {
                                "name": "x_tile",
                                "property": "x",
                                "type": "integer"
                            },
                            {
                                "name": "y_tile",
                                "property": "y",
                                "type": "integer"
                            }
                        ],
                        "offset_arg": "offset",
                        "limit_arg": "limit"
                    }
                ]
            }
        },
        "getMapTile": {
            "name": "get_map_tile",
            "source": "tile",
            "arguments": [
                {
                    "name": "x_tile",
                    "wire_name": "x_tile",
                    "type": "integer",
                    "action_field": "x_tile",
                    "minimum": 0,
                    "maximum": 1000
                },
                {
                    "name": "y_tile",
                    "wire_name": "y_tile",
                    "type": "integer",
                    "action_field": "y_tile",
                    "minimum": 0,
                    "maximum": 1000
                }
            ],
            "response": "observation",
            "error_prefix": "Failed to read map tile",
            "allowed_modes": [
                "normal",
                "scenario_editor",
                "track_designer",
                "track_manager"
            ],
            "readback": {
                "fields": [
                    {
                        "name": "element_count",
                        "property": "numElements",
                        "type": "integer"
                    },
                    {
                        "name": "elements",
                        "property": "elements",
                        "type": "array",
                        "fields": [
                            {
                                "name": "type",
                                "property": "type",
                                "type": "string"
                            },
                            {
                                "name": "base_height",
                                "property": "baseHeight",
                                "type": "integer"
                            },
                            {
                                "name": "base_z_game",
                                "property": "baseZ",
                                "type": "integer"
                            },
                            {
                                "name": "clearance_height",
                                "property": "clearanceHeight",
                                "type": "integer"
                            },
                            {
                                "name": "clearance_z_game",
                                "property": "clearanceZ",
                                "type": "integer"
                            },
                            {
                                "name": "occupied_quadrants",
                                "property": "occupiedQuadrants",
                                "type": "integer"
                            },
                            {
                                "name": "is_ghost",
                                "property": "isGhost",
                                "type": "boolean"
                            },
                            {
                                "name": "is_hidden",
                                "property": "isHidden",
                                "type": "boolean"
                            },
                            {
                                "name": "slope",
                                "property": "slope",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "surface",
                                        "wall"
                                    ]
                                }
                            },
                            {
                                "name": "surface_style",
                                "property": "surfaceStyle",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "surface"
                                    ]
                                }
                            },
                            {
                                "name": "edge_style",
                                "property": "edgeStyle",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "surface"
                                    ]
                                }
                            },
                            {
                                "name": "water_height_raw",
                                "property": "waterHeight",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "surface"
                                    ]
                                }
                            },
                            {
                                "name": "grass_length",
                                "property": "grassLength",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "surface"
                                    ]
                                }
                            },
                            {
                                "name": "ownership",
                                "property": "ownership",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "surface"
                                    ]
                                }
                            },
                            {
                                "name": "park_fences",
                                "property": "parkFences",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "surface"
                                    ]
                                }
                            },
                            {
                                "name": "has_ownership",
                                "property": "hasOwnership",
                                "type": "boolean",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "surface"
                                    ]
                                }
                            },
                            {
                                "name": "has_construction_rights",
                                "property": "hasConstructionRights",
                                "type": "boolean",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "surface"
                                    ]
                                }
                            },
                            {
                                "name": "object_raw",
                                "property": "object",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath",
                                        "small_scenery",
                                        "large_scenery",
                                        "wall",
                                        "entrance",
                                        "banner"
                                    ]
                                }
                            },
                            {
                                "name": "surface_object_raw",
                                "property": "surfaceObject",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath"
                                    ]
                                }
                            },
                            {
                                "name": "railings_object_raw",
                                "property": "railingsObject",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath"
                                    ]
                                }
                            },
                            {
                                "name": "edges",
                                "property": "edges",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath"
                                    ]
                                }
                            },
                            {
                                "name": "corners",
                                "property": "corners",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath"
                                    ]
                                }
                            },
                            {
                                "name": "slope_direction",
                                "property": "slopeDirection",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath"
                                    ]
                                }
                            },
                            {
                                "name": "is_blocked_by_vehicle",
                                "property": "isBlockedByVehicle",
                                "type": "boolean",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath"
                                    ]
                                }
                            },
                            {
                                "name": "is_wide",
                                "property": "isWide",
                                "type": "boolean",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath"
                                    ]
                                }
                            },
                            {
                                "name": "is_queue",
                                "property": "isQueue",
                                "type": "boolean",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath"
                                    ]
                                }
                            },
                            {
                                "name": "queue_banner_direction",
                                "property": "queueBannerDirection",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath"
                                    ]
                                }
                            },
                            {
                                "name": "ride_raw",
                                "property": "ride",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath",
                                        "track",
                                        "entrance"
                                    ]
                                }
                            },
                            {
                                "name": "station_raw",
                                "property": "station",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath",
                                        "track",
                                        "entrance"
                                    ]
                                }
                            },
                            {
                                "name": "addition",
                                "property": "addition",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath"
                                    ]
                                }
                            },
                            {
                                "name": "addition_status",
                                "property": "additionStatus",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath"
                                    ]
                                }
                            },
                            {
                                "name": "is_addition_broken",
                                "property": "isAdditionBroken",
                                "type": "boolean",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath"
                                    ]
                                }
                            },
                            {
                                "name": "is_addition_full",
                                "property": "isAdditionFull",
                                "type": "boolean",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath"
                                    ]
                                }
                            },
                            {
                                "name": "is_addition_ghost",
                                "property": "isAdditionGhost",
                                "type": "boolean",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "footpath"
                                    ]
                                }
                            },
                            {
                                "name": "direction",
                                "property": "direction",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "track",
                                        "small_scenery",
                                        "large_scenery",
                                        "wall",
                                        "entrance",
                                        "banner"
                                    ]
                                }
                            },
                            {
                                "name": "track_type",
                                "property": "trackType",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "track"
                                    ]
                                }
                            },
                            {
                                "name": "ride_type",
                                "property": "rideType",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "track"
                                    ]
                                }
                            },
                            {
                                "name": "sequence",
                                "property": "sequence",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "track",
                                        "large_scenery",
                                        "entrance"
                                    ]
                                }
                            },
                            {
                                "name": "maze_entry",
                                "property": "mazeEntry",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "track"
                                    ],
                                    "trackType": [
                                        101
                                    ]
                                }
                            },
                            {
                                "name": "colour_scheme",
                                "property": "colourScheme",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "track"
                                    ]
                                }
                            },
                            {
                                "name": "seat_rotation",
                                "property": "seatRotation",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "track"
                                    ]
                                }
                            },
                            {
                                "name": "brake_booster_speed",
                                "property": "brakeBoosterSpeed",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "track"
                                    ],
                                    "trackType": [
                                        99,
                                        100,
                                        216,
                                        337,
                                        338,
                                        339,
                                        340,
                                        349
                                    ]
                                }
                            },
                            {
                                "name": "has_chain_lift",
                                "property": "hasChainLift",
                                "type": "boolean",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "track"
                                    ]
                                }
                            },
                            {
                                "name": "is_inverted",
                                "property": "isInverted",
                                "type": "boolean",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "track"
                                    ]
                                }
                            },
                            {
                                "name": "has_cable_lift",
                                "property": "hasCableLift",
                                "type": "boolean",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "track"
                                    ]
                                }
                            },
                            {
                                "name": "is_highlighted",
                                "property": "isHighlighted",
                                "type": "boolean",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "track"
                                    ]
                                }
                            },
                            {
                                "name": "primary_colour",
                                "property": "primaryColour",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "small_scenery",
                                        "large_scenery",
                                        "wall",
                                        "banner"
                                    ]
                                }
                            },
                            {
                                "name": "secondary_colour",
                                "property": "secondaryColour",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "small_scenery",
                                        "large_scenery",
                                        "wall",
                                        "banner"
                                    ]
                                }
                            },
                            {
                                "name": "tertiary_colour",
                                "property": "tertiaryColour",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "small_scenery",
                                        "large_scenery",
                                        "wall"
                                    ]
                                }
                            },
                            {
                                "name": "quadrant",
                                "property": "quadrant",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "small_scenery"
                                    ]
                                }
                            },
                            {
                                "name": "age",
                                "property": "age",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "small_scenery"
                                    ]
                                }
                            },
                            {
                                "name": "banner_index_raw",
                                "property": "bannerIndex",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "large_scenery",
                                        "wall",
                                        "banner"
                                    ]
                                }
                            },
                            {
                                "name": "banner_text",
                                "property": "bannerText",
                                "type": "string",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "large_scenery",
                                        "wall",
                                        "banner"
                                    ]
                                }
                            },
                            {
                                "name": "footpath_object",
                                "property": "footpathObject",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "entrance"
                                    ]
                                }
                            },
                            {
                                "name": "footpath_surface_object",
                                "property": "footpathSurfaceObject",
                                "type": "integer",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "entrance"
                                    ]
                                }
                            },
                            {
                                "name": "is_no_entry",
                                "property": "isNoEntry",
                                "type": "boolean",
                                "nullable": true,
                                "when": {
                                    "type": [
                                        "banner"
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }
        }
    };
    // END GENERATED ACTION REGISTRY


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
                    trackGroup: s.trackGroup, allowsChainLift: s.allowsChainLift,
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

    function projectRegisteredFields(fields, object, args) {
        var state = {};
        fields.forEach(function (field) {
            if (field.when && !Object.keys(field.when).every(function (key) {
                return field.when[key].indexOf(object[key]) >= 0;
            })) { state[field.name] = null; return; }
            var value = object;
            if (field.method) {
                value = object[field.method](field.method_arg_arg ? args[field.method_arg_arg] : field.method_arg);
            } else {
                field.property.split(".").forEach(function (part) {
                    value = value === null || value === undefined ? undefined : value[part];
                });
            }
            if (field.index_arg) {
                value = value && value[args[field.index_arg]];
                if (field.member) value = value && value[field.member];
            }
            if ((value === null || value === undefined) && field.nullable) {
                state[field.name] = null; return;
            }
            if (field.type === "record") {
                if (!value || typeof value !== "object") throw new Error("Record unavailable: " + field.property);
                value = projectRegisteredFields(field.fields, value, args);
            } else if (field.type === "array") {
                if (!Array.isArray(value)) throw new Error("Array unavailable: " + field.property);
                state[field.name + "_total"] = value.length;
                var start = field.offset_arg ? args[field.offset_arg] : 0;
                var count = field.limit_arg ? args[field.limit_arg] : 256;
                value = value.slice(start, start + count).map(function (item) {
                    if (field.fields) return projectRegisteredFields(field.fields, item, args);
                    if (item === null && field.nullable_items) return null;
                    if ((field.item_type === "integer" && Number.isSafeInteger(item)) ||
                        (field.item_type === "string" && typeof item === "string")) return item;
                    throw new Error("Array item unavailable: " + field.property);
                });
            }
            if (field.bit_mask !== undefined) {
                if (!Number.isSafeInteger(value)) throw new Error("Flags unavailable: " + field.property);
                value = (value & field.bit_mask) !== 0;
            }
            if ((field.type === "integer" && !Number.isSafeInteger(value)) ||
                (field.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) ||
                (field.type === "boolean" && typeof value !== "boolean") ||
                (field.type === "string" && typeof value !== "string")) {
                throw new Error("Readback unavailable: " + field.property);
            }
            state[field.name] = value;
        });
        return state;
    }

    function registeredTarget(spec, args) {
        var source = spec.target || spec.source || "ride";
        var object;
        if (source === "ride") object = map.getRide(args[spec.identity]);
        else if (source === "entity") {
            object = map.getEntity(args[spec.identity]);
            if (object && spec.entity_type && object.type !== spec.entity_type) throw new Error("Wrong entity type");
        } else if (source === "object") object = context.getObject(spec.object_type || args[spec.object_type_arg], args[spec.identity]);
        else if (source === "object_manager") object = objectManager;
        else if (source === "tile") {
            if (args.x_tile >= map.size.x || args.y_tile >= map.size.y) throw new Error("Tile outside current map");
            object = map.getTile(args.x_tile, args.y_tile);
        }
        else if (source === "park") object = park;
        else if (source === "research") object = park.research;
        else if (source === "date") object = date;
        else if (source === "context") object = context;
        else if (source === "scenario") object = scenario;
        else if (source === "climate") object = climate;
        if (!object) throw new Error(source === "ride" ? "Ride not found" : "Observation target not found");
        return object;
    }

    function readActionState(spec, args) {
        return projectRegisteredFields(spec.readback.fields, registeredTarget(spec, args), args);
    }

    function dispatchRegisteredAction(request, callback) {
        if (dispatchConstruction(request, callback)) return true;
        if (!Object.prototype.hasOwnProperty.call(registeredActions, request.endpoint)) return false;
        var spec = registeredActions[request.endpoint];
        var params = request.params, action = Object.assign({}, spec.constants);
        var expected = {}, requested = {}, before = null;
        try {
            if ((spec.allowed_modes || ["normal"]).indexOf(context.mode) < 0) throw new Error("Tool is not available in this game mode");
            var allowed = (spec.arguments || []).map(function (arg) { return arg.wire_name; });
            if (Object.keys(params).some(function (key) { return allowed.indexOf(key) < 0; })) {
                throw new Error("Unexpected action parameter");
            }
            (spec.arguments || []).forEach(function (arg) {
                var value = params[arg.wire_name];
                if ((arg.type === "integer" && (!Number.isInteger(value) ||
                        (arg.minimum !== undefined && value < arg.minimum) ||
                        (arg.maximum !== undefined && value > arg.maximum) ||
                        (arg.multiple_of !== undefined && value % arg.multiple_of !== 0))) ||
                    (arg.type === "boolean" && typeof value !== "boolean") ||
                    (arg.type === "string" && (typeof value !== "string" ||
                        (arg.min_length !== undefined && value.length < arg.min_length))) ||
                    (arg.values && !Object.prototype.hasOwnProperty.call(arg.values, value))) {
                    throw new Error("Invalid parameter: " + arg.wire_name);
                }
                requested[arg.name] = value;
                expected[arg.name] = arg.values ? arg.values[value] : value;
                action[arg.action_field] = arg.boolean_as_integer ? (value ? 1 : 0) :
                    expected[arg.name];
            });
            if (spec.response === "observation") {
                var payload;
                if (spec.source === "objects") {
                    payload = { objects: context.getAllObjects(spec.object_type || expected[spec.object_type_arg]).map(function (object) {
                        return projectRegisteredFields(spec.readback.fields, object, requested);
                    }) };
                } else if (spec.source === "entities") {
                    var allEntities = map.getAllEntities(spec.entity_type || expected[spec.entity_type_arg]);
                    var page = allEntities.slice(requested.offset, requested.offset + requested.limit);
                    payload = { total: allEntities.length, offset: requested.offset, entities: page.map(function (entity) {
                        return projectRegisteredFields(spec.readback.fields, entity, requested);
                    }) };
                } else {
                    payload = readActionState(spec, expected);
                    if (spec.identity) payload[spec.identity] = requested[spec.identity];
                }
                callback({ success: true, payload: payload }); return true;
            }
            Object.keys(spec.required_objects || {}).forEach(function (name) {
                var loaded = context.getAllObjects(spec.required_objects[name]);
                if (!loaded.some(function (object) { return object.index === expected[name]; })) {
                    throw new Error("Object is not loaded: " + name);
                }
            });
            if (spec.action === "ridecreate") action.rideObject = researchedRideObject(action.rideType, action.rideObject);
            if (spec.name === "set_ride_vehicle_object") {
                var selectedRide = map.getRide(params.rideId);
                if (!selectedRide) throw new Error("Ride not found");
                researchedRideObject(selectedRide.type, action.value);
            }
            if (["set_ride_trains_reversed", "set_ride_circuit_count", "set_ride_music_enabled", "set_ride_music_style"].indexOf(spec.name) >= 0) {
                var settingsRide = map.getRide(params.rideId);
                var settingsRules = settingsRide && rideBuildTypes[settingsRide.type];
                if (!settingsRules) throw new Error("Ride type unavailable");
                if (spec.name === "set_ride_trains_reversed" && (!settingsRules.allow_reversed_trains ||
                    !settingsRide.object || !Number.isInteger(settingsRide.object.flags) ||
                    (settingsRide.object.flags & rideEntryFlags.noReverseOption) !== 0)) {
                    throw new Error("Reversing trains is not available for this ride/vehicle in ordinary play");
                }
                if (spec.name === "set_ride_circuit_count" && (!settingsRules.allow_multiple_circuits ||
                    [1, 2, 3].indexOf(settingsRide.mode) < 0 || !Array.isArray(settingsRide.vehicles) ||
                    settingsRide.vehicles.length > 1 || !Array.isArray(settingsRide.stations) ||
                    readRideStations(settingsRide).length > 1)) {
                    throw new Error("Multiple-circuit controls require a supported mode and at most one train/station");
                }
                if ((spec.name === "set_ride_music_enabled" || spec.name === "set_ride_music_style") && !settingsRules.allow_music) {
                    throw new Error("Music controls are not available for this ride type in ordinary play");
                }
            }
            if (spec.target && !spec.readback) registeredTarget(spec, expected);
            if (spec.readback) before = readActionState(spec, expected);
        } catch (error) {
            callback({ success: false, error: String(error) }); return true;
        }
        context.executeAction(spec.action, action, function (result) {
            if (!result || result.error) {
                callback({ success: false, outcome: result ? "rejected" : "unknown",
                    error: spec.error_prefix + ": " + gameError(result), error_details: gameErrorDetails(result) }); return;
            }
            if (spec.response === "message") {
                callback({ success: true, payload: spec.success_message.replace("{rideId}", String(params.rideId)) }); return;
            }
            if (spec.response === "acknowledgement") {
                callback({ success: true, payload: { rideId: params.rideId } }); return;
            }
            if (spec.response === "payload") {
                if (spec.result_fields && spec.result_fields.length) {
                    try { requested.game_result = projectRegisteredFields(spec.result_fields, result, requested); }
                    catch (error) { requested.game_result = null; requested.state_error = String(error); }
                }
                callback({ success: true, payload: requested }); return;
            }
            var payload = { requested: requested, observed_before: before,
                observed_after: null, readback_matches_request: null };
            if (spec.identity) payload[spec.identity] = requested[spec.identity];
            try {
                payload.observed_after = readActionState(spec, expected);
                payload.readback_matches_request = Object.keys(spec.readback.matches).every(function (field) {
                    return payload.observed_after[field] === expected[spec.readback.matches[field]];
                });
            } catch (error) { payload.state_error = String(error); }
            callback({ success: true, payload: payload });
        });
        return true;
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

    function researchedRideObject(rideType, index) {
        var objects = context.getAllObjects("ride").filter(function (object) {
            return Array.isArray(object.rideType) && object.rideType.indexOf(rideType) >= 0 &&
                (index === 65535 || object.index === index) &&
                rideObjectResearch(object, [rideType])[0].status === "invented";
        });
        if (!Number.isInteger(rideType) || !rideBuildTypes[rideType] || !objects.length) {
            throw new Error("Choose an invented, compatible loaded ride object; unknown research is not permission");
        }
        return objects[0].index;
    }

    function normalTrackPiece(rideType, trackType, chain) {
        var rules = rideBuildTypes[rideType], segment = getSegmentGeometry()[trackType];
        if (!rules || !segment || rules.track_groups.indexOf(segment.trackGroup) < 0 ||
            (chain && (segment.allowsChainLift !== true || rules.track_groups.indexOf(3) < 0))) {
            throw new Error("Track piece or lift is not enabled for this ride type in ordinary play");
        }
    }

    function constructionRide(rideId) {
        if (context.mode !== "normal" || !Number.isInteger(rideId) || rideId < 0 || rideId > 65534) {
            throw new Error("Expected normal park mode and a ride ID");
        }
        var ride = map.getRide(rideId);
        if (!ride) throw new Error("Ride not found");
        if (ride.status !== "closed" || ride.guestCount !== 0 || !Array.isArray(ride.vehicles) ||
            ride.vehicles.some(function (id) { return id !== 65535; })) {
            throw new Error("Construction requires a closed, guest-free, vehicle-free ride; use reset_ride explicitly if needed");
        }
        return ride;
    }

    function trackConnectionDirections(ride, el) {
        if (el.trackType === 101 && ride.type === 20) return [0, 1, 2, 3];
        if (el.trackType >= 1 && el.trackType <= 3) return [(el.direction + 1) % 4, (el.direction + 3) % 4];
        var rules = rideBuildTypes[ride.type];
        if (!rules || !rules.footprint_supported || rules.track_type !== el.trackType ||
            !rules.connection_sides[el.sequence]) return [];
        return rules.connection_sides[el.sequence].map(function (side) { return (side + el.direction) % 4; });
    }

    function trackElementSelection(entry) {
        var el = entry.element;
        return { x: entry.tileX, y: entry.tileY, base_z_game: el.baseZ, direction: el.direction,
            track_type: el.trackType, sequence: el.sequence };
    }

    function readRideLayout(rideId, offset, limit) {
        var ride = map.getRide(rideId);
        if (!ride) throw new Error("Ride not found");
        var all = getRideTrackElements(rideId);
        return { ride_id: rideId, ride_type: ride.type, ride_status: ride.status,
            guest_count: numberOrNull(ride.guestCount), vehicle_ids: Array.isArray(ride.vehicles) ? ride.vehicles.filter(function (id) { return id !== 65535; }) : null,
            elements_total: all.length, offset: offset, elements: all.slice(offset, offset + limit).map(function (entry) {
                return { selection: trackElementSelection(entry), is_ghost: entry.element.isGhost === true,
                    connection_directions: trackConnectionDirections(ride, entry.element),
                    maze_entry: entry.element.trackType === 101 ? numberOrNull(entry.element.mazeEntry) : null };
            }), stations: readRideStations(ride),
            limitations: "Physical track elements, not ordered track pieces. Works on disconnected layouts and footprints. " +
                "No traversal, clearance, operation or guest-access proof. Pagination has no stable cursor." };
    }

    function layoutActionResponse(rideId, before, result, callback) {
        if (!result || result.error) {
            callback({ success: false, outcome: result ? "rejected" : "unknown",
                error: gameError(result), error_details: gameErrorDetails(result) }); return;
        }
        var payload = { ride_id: rideId, cost_raw: numberOrNull(result.cost), observed_before: before, observed_after: null };
        try { payload.observed_after = readRideLayout(rideId, 0, 256); }
        catch (error) { payload.state_error = String(error); }
        callback({ success: true, payload: payload });
    }

    function dispatchConstruction(request, callback) {
        if (["getRideBuildOptions", "getRideLayout", "placeRideFootprint", "removeSelectedTrackPiece", "editMazeCell"].indexOf(request.endpoint) < 0) return false;
        var p = request.params;
        try {
            if (request.endpoint === "getRideBuildOptions") {
                var objects = context.getAllObjects("ride");
                callback({ success: true, payload: { ride_types: Object.keys(rideBuildTypes).map(function (key) {
                    var rules = rideBuildTypes[key];
                    return Object.assign({}, rules, { loaded_objects: objects.filter(function (object) {
                        return object.rideType.indexOf(rules.ride_type) >= 0;
                    }).map(function (object) { return { index: object.index, identifier: object.identifier, name: object.name,
                        research: rideObjectResearch(object, [rules.ride_type])[0].status }; }) });
                }), limitations: "Pinned normal-play starting pieces and enabled track groups, not every vehicle's sprite support or a placement query. " +
                    "Footprints are supported only when footprint_supported is true. Towers and other special track remain unsupported." } });
                return true;
            }
            if (!Number.isInteger(p.rideId) || p.rideId < 0 || p.rideId > 65534) throw new Error("Expected ride ID");
            if (request.endpoint === "getRideLayout") {
                if (!Number.isInteger(p.offset) || p.offset < 0 || p.offset > 1000000 ||
                    !Number.isInteger(p.limit) || p.limit < 1 || p.limit > 256) throw new Error("Expected bounded offset and limit 1-256");
                callback({ success: true, payload: readRideLayout(p.rideId, p.offset, p.limit) }); return true;
            }
            var ride = constructionRide(p.rideId);
            var before = readRideLayout(p.rideId, 0, 256);
            if (request.endpoint === "placeRideFootprint") {
                var rules = rideBuildTypes[ride.type];
                if (!rules || !rules.footprint_supported || before.elements_total !== 0 ||
                    !validMapPoint(p.x, p.y) || !Number.isInteger(p.z) || p.z < 2 || p.z > 254 || p.z % 2 ||
                    !Number.isInteger(p.direction) || p.direction < 0 || p.direction > 3) {
                    throw new Error("Choose an empty supported flat ride/shop, map tile, even height 2-254 and direction 0-3");
                }
                if (!ride.object) throw new Error("Ride object unavailable");
                researchedRideObject(ride.type, ride.object.index);
                context.executeAction("trackplace", { ride: p.rideId, rideType: ride.type, trackType: rules.track_type,
                    x: p.x * 32, y: p.y * 32, z: p.z * 8, direction: p.direction,
                    brakeSpeed: 0, colour: 0, seatRotation: 0, trackPlaceFlags: 0, isFromTrackDesign: false }, function (result) {
                    layoutActionResponse(p.rideId, before, result, callback);
                });
            } else if (request.endpoint === "removeSelectedTrackPiece") {
                if (ride.type === 20) throw new Error("Use maze cell edits, not linear track removal, for mazes");
                var selected = p.selection;
                var fields = ["x", "y", "base_z_game", "direction", "track_type", "sequence"];
                if (!selected || Object.keys(selected).length !== fields.length || fields.some(function (key) {
                    return !Number.isInteger(selected[key]);
                }) || !validMapPoint(selected.x, selected.y)) throw new Error("Expected an exact current track element selection");
                // Match the native selector independently of ride ID; otherwise a coincident element of another ride could be removed.
                var matches = map.getTile(selected.x, selected.y).elements.filter(function (el) {
                    return el.type === "track" && el.baseZ === selected.base_z_game && el.direction === selected.direction &&
                        el.sequence === selected.sequence && el.isGhost === false &&
                        (el.trackType === selected.track_type || (el.trackType >= 1 && el.trackType <= 3 &&
                            selected.track_type >= 1 && selected.track_type <= 3));
                });
                if (matches.length !== 1 || matches[0].ride !== p.rideId || matches[0].trackType !== selected.track_type) {
                    throw new Error("Track selection changed, is ambiguous or belongs to another ride");
                }
                if (!getSegmentGeometry()[selected.track_type]) throw new Error("Track descriptor unavailable");
                context.executeAction("trackremove", { x: selected.x * 32, y: selected.y * 32, z: selected.base_z_game,
                    direction: selected.direction, trackType: selected.track_type, sequence: selected.sequence }, function (result) {
                    layoutActionResponse(p.rideId, before, result, callback);
                });
            } else {
                if (ride.type !== 20 || ["build", "fill"].indexOf(p.mode) < 0 ||
                    !Number.isInteger(p.x_game) || !Number.isInteger(p.y_game) || p.x_game % 16 || p.y_game % 16 ||
                    !validMapPoint(Math.floor(p.x_game / 32), Math.floor(p.y_game / 32)) ||
                    !Number.isInteger(p.z) || p.z < 2 || p.z > 254 || p.z % 2 ||
                    !Number.isInteger(p.direction) || p.direction < 0 || p.direction > 3) {
                    throw new Error("Expected maze, build/fill, half-tile aligned game X/Y, even Z 2-254 and direction 0-3");
                }
                // Native fill queries the cursor tile but writes the previous half-cell. Validate both before querying native code.
                var dx = [-16, 0, 16, 0][p.direction], dy = [0, 16, 0, -16][p.direction];
                var affectedX = p.mode === "fill" ? p.x_game - dx : p.x_game;
                var affectedY = p.mode === "fill" ? p.y_game - dy : p.y_game;
                var affected = getRideTrackElements(p.rideId).filter(function (entry) {
                    return entry.tileX === Math.floor(affectedX / 32) && entry.tileY === Math.floor(affectedY / 32) &&
                        entry.element.trackType === 101 && entry.element.baseZ === p.z * 8;
                });
                if (affected.length > 1 || (p.mode === "fill" && affected.length !== 1) ||
                    (affected.length && (affected[0].element.isGhost !== false ||
                        affected[0].element.mazeEntry !== p.expected_maze_entry)) ||
                    (!affected.length && p.expected_maze_entry !== null)) {
                    throw new Error("Maze tile changed or is unavailable; inspect its current maze_entry (null for new tile)");
                }
                context.executeAction("mazesettrack", { ride: p.rideId, x: p.x_game, y: p.y_game, z: p.z * 8,
                    direction: p.direction, mode: p.mode === "build" ? 0 : 2,
                    isInitialPlacement: before.elements_total === 0 }, function (result) {
                    layoutActionResponse(p.rideId, before, result, callback);
                });
            }
        } catch (error) { callback({ success: false, error: String(error) }); }
        return true;
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
                var rules = rideBuildTypes[selected.ride.type];
                return el.type === "track" && el.ride === params.rideId &&
                    (el.station === 0 || selected.ride.type === 20 || (rules && rules.footprint_supported)) && el.baseZ === stationZ && !el.isGhost &&
                    !(rules && rules.is_shop_or_facility) &&
                    trackConnectionDirections(selected.ride, el).indexOf((params.direction + 2) % 4) >= 0;
            })) throw new Error("Building must face a valid connection side of adjacent station-0 track/footprint/maze at station height");
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

    // Project a single traversal; never cache track state across requests or edits.
    function readConstructionCandidates(state) {
        if (!state || state.history.length === 0) {
            // No track placed yet - allow only station and flat pieces to start
            return {
                validPieces: [0, 1, 2, 3], // Only flat and station pieces to start
                lastTrackType: null,
                stateCategory: "initial",
                candidateStatus: "initial",
                isCircuitComplete: false
            };
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

        return {
            validPieces: validPieces,
            candidateStatus: candidateStatus,
            pieceCount: state.history.length,
            validPieceEndpoints: buildValidPieceEndpoints(buildPosition, validPieces),
            lastTrackType: lastPiece.trackType,
            stateCategory: stateCategory,
            isCircuitComplete: state.isComplete === true,
            position: buildPosition
        };
    }

    function readTrackHistory(state) {
        if (!state) throw new Error("Could not reconstruct ride track");
        return {
            history: state.history,
            trackElements: state.elements.map(function (entry) {
                return {
                    x: entry.tileX,
                    y: entry.tileY,
                    z: entry.element.baseZ / 8
                };
            })
        };
    }

    function readCoasterState(rideId, state) {
        var ride = null;
        map.rides.forEach(function (r) { if (r.id === rideId) ride = r; });
        if (!ride) throw new Error("Ride " + rideId + " not found");
        state = state !== undefined ? state : getRideTrackState(rideId);
        var history = readTrackHistory(state);
        var payload = readConstructionCandidates(state);
        payload.history = history.history;
        payload.trackElements = history.trackElements;
        payload.rideType = ride.type;
        payload.rideName = ride.name || null;
        payload.stations = readRideStations(ride);
        payload.rideObject = ride.object ? { index: ride.object.index,
            identifier: ride.object.identifier, name: ride.object.name } : null;
        payload.layoutStatus = state.layoutStatus;
        return payload;
    }

    function inspectConfirmedAction(callback, inspect) {
        var payload;
        try {
            payload = inspect();
        } catch (error) {
            callback({ success: false, outcome: "confirmed", error: "Action acknowledged, but inspection failed: " + String(error),
                error_details: { category: "post_action_inspection" } });
            return;
        }
        callback({ success: true, payload: payload });
    }

    function appendTrackPiece(params, callback) {
        if (!Number.isInteger(params.ride) || params.ride < 0 || params.ride > 65534) {
            callback({ success: false, error: "Missing or invalid ride ID" });
            return;
        }
        var current = readCoasterState(params.ride);
        var position = current.position;
        if (current.layoutStatus !== "complete" || current.isCircuitComplete || !position ||
            current.validPieces.indexOf(params.trackType) === -1) {
            callback({ success: false, error: "Track is not an available connection candidate at the current endpoint" });
            return;
        }
        var expected = params.expectedEndpoint;
        if (!expected || ["x", "y", "z", "direction"].some(function (axis) {
            return expected[axis] !== position[axis];
        }) || (params.expectedPieceCount !== undefined && params.expectedPieceCount !== current.history.length)) {
            callback({ success: false, error: "Construction endpoint changed; inspect before retrying",
                error_details: { category: "stale_endpoint", expected: expected, actual: position } });
            return;
        }
        var resolved = {};
        Object.keys(params).forEach(function (key) { resolved[key] = params[key]; });
        resolved.tileCoordinateX = position.x;
        resolved.tileCoordinateY = position.y;
        resolved.tileCoordinateZ = position.z;
        resolved.direction = position.direction;
        resolved.rideType = current.rideType;
        resolved.isFromTrackDesign = false;
        placeTrackPiece(resolved, callback);
    }

    function findPlacedTrack(params, result, pixelZ, isStation) {
        var tileX = Math.floor(result.position.x / 32);
        var tileY = Math.floor(result.position.y / 32);
        var offsets = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (var i = 0; i < offsets.length; i++) {
            var x = tileX + offsets[i][0];
            var y = tileY + offsets[i][1];
            var tile = map.getTile(x, y);
            if (!tile) continue;
            for (var j = 0; j < tile.numElements; j++) {
                var element = tile.elements[j];
                if (element.type === "track" && element.ride === params.ride &&
                    element.direction === params.direction && element.baseZ === pixelZ &&
                    (element.trackType === params.trackType ||
                        (isStation && element.trackType >= 1 && element.trackType <= 3))) {
                    return { x: x, y: y, index: j, element: element };
                }
            }
        }
        throw new Error("Could not find track element on any nearby tile");
    }

    function readPlacedTrack(params, result, pixelZ, isStation) {
        var placed = findPlacedTrack(params, result, pixelZ, isStation);
        var iterator = map.getTrackIterator({ x: placed.x * 32, y: placed.y * 32 }, placed.index);
        if (!iterator) throw new Error("Track iterator not available");
        if (!iterator.nextPosition) {
            if (!iterator.next || !iterator.next() || !iterator.nextPosition) {
                throw new Error("Track has no valid next position");
            }
        }
        // Preserve the iterator-to-tile rounding used by construction snapshots.
        var next = iterator.nextPosition;
        var endpoint = { x: Math.round(next.x / 32), y: Math.round(next.y / 32),
            z: Math.round(next.z / 8), direction: next.direction };
        var predicted = predictEndpoint(
            { x: params.tileCoordinateX, y: params.tileCoordinateY, z: params.tileCoordinateZ },
            params.direction, params.trackType);
        var mismatch = predicted && ["x", "y", "z", "direction"].some(function (key) {
            return predicted[key] !== endpoint[key];
        });
        if (mismatch) console.log("WARNING: endpoint prediction mismatch", JSON.stringify({ predicted: predicted, actual: endpoint }));

        var state = getRideTrackState(params.ride);
        var complete = state !== null && state.isComplete;
        var payload = {
            message: "Track piece placed for ride " + params.ride,
            nextEndpoint: endpoint,
            isCircuitComplete: complete,
            circuitMessage: complete ? "Circuit complete! Track connects back to station - ready for testing!" : "Continue building...",
            debug: { placedAt: { x: placed.x, y: placed.y, z: result.position.z },
                trackType: params.trackType, elemDirection: placed.element.direction }
        };
        if (mismatch) payload.endpointPredictionMismatch = { predicted: predicted, actual: endpoint };
        if (isStation) payload.stationDetected = true;
        // Reuse this post-action traversal for the caller's final state, not another map scan.
        if (params.includeState === true) payload.coasterState = readCoasterState(params.ride, state);
        return payload;
    }

    function placeTrackPiece(params, callback, query) {
        // Required parameters:
        // tileCoordinateX, tileCoordinateY, tileCoordinateZ, direction, ride,
        // trackType, rideType, brakeSpeed, colour, seatRotation, trackPlaceFlags, isFromTrackDesign
        // Optional: hasChainLift (boolean) - adds chain lift to slope pieces
        var requiredParams = [
            "tileCoordinateX", "tileCoordinateY", "tileCoordinateZ", "direction", "ride",
            "trackType", "rideType", "brakeSpeed", "colour",
            "seatRotation", "trackPlaceFlags", "isFromTrackDesign"
        ];
        if (!params) {
            callback({ success: false, error: "Missing parameters for placeTrackPiece" });
            return;
        }
        for (var i = 0; i < requiredParams.length; i++) {
            var key = requiredParams[i];
            if (typeof params[key] === "undefined") {
                callback({ success: false, error: "Missing parameter: " + key });
                return;
            }
        }
        try { normalTrackPiece(params.rideType, params.trackType, params.hasChainLift === true || (params.trackPlaceFlags & 1) !== 0); }
        catch (error) { callback({ success: false, error: String(error) }); return; }
        // Convert tile-based input coordinates to game (pixel) units.
        var pixelCoordinateX = params.tileCoordinateX * 32;
        var pixelCoordinateY = params.tileCoordinateY * 32;
        var pixelCoordinateZ = params.tileCoordinateZ * 8 + getZAdjustment(params.trackType);
        // Check if chain lift flag should be added
        var flags = params.trackPlaceFlags;
        if (params.hasChainLift === true) {
            // Add chain lift flag (bit 0)
            flags = flags | 1;
        }

        // Log station piece placement for debugging
        // Station types: 1=EndStation, 2=BeginStation, 3=MiddleStation
        var isStationPiece = (params.trackType === 1 ||
                             params.trackType === 2 ||
                             params.trackType === 3);

        if (isStationPiece) {
            console.log("Station piece requested - Type:", params.trackType, "for ride", params.ride);
            console.log("Note: Use placeEntranceExit endpoint to add entrance/exit after station is complete");
        }

        var trackPlaceArgs = {
            x: pixelCoordinateX,
            y: pixelCoordinateY,
            z: pixelCoordinateZ,
            direction: params.direction,
            ride: params.ride,
            trackType: params.trackType,
            rideType: params.rideType,
            brakeSpeed: params.brakeSpeed,
            colour: params.colour,
            seatRotation: params.seatRotation,
            trackPlaceFlags: flags,
            isFromTrackDesign: params.isFromTrackDesign
        };
        if (query) {
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
                inspectConfirmedAction(callback, function () {
                    return readPlacedTrack(params, result, pixelCoordinateZ, isStationPiece);
                });
            }
        });
    }

    function removeTrackPiece(params, callback, preview) {
        // This endpoint only removes track pieces, not entrances/exits
        // Entrances/exits must be managed separately
        if (!params || typeof params.rideId !== "number") {
            callback({
                success: false,
                error: "Missing or invalid parameter: rideId"
            });
            return;
        }

        var rideId = params.rideId;
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
        if (params.expectedTarget) {
            // Compare fields, not incoming JSON key order.
            var expectedTarget = params.expectedTarget;
            if (Object.keys(removalTarget).some(function (key) { return expectedTarget[key] !== removalTarget[key]; })) {
                callback({ success: false, error: "Removal target changed; inspect before removing",
                    error_details: { category: "stale_removal_target", actual: removalTarget } });
                return;
            }
        }
        if (preview) {
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
                inspectConfirmedAction(callback, function () {
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

                    if (params.includeState === true) responsePayload.coasterState = readCoasterState(rideId, newState);
                    return responsePayload;
                });
            }
        });
    }

    function processRequest(request, callback) {
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

        if (request.params.rideId !== undefined && (!Number.isInteger(request.params.rideId) ||
                request.params.rideId < 0 || request.params.rideId > 65534)) {
            callback({ success: false, error: "Invalid ride ID" }); return;
        }
        if (dispatchRegisteredAction(request, callback)) return;

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
                    if (!selectedPath || selectedPath.is_ghost !== false ||
                        selectedPath.addition_object !== null ||
                        !expected || Object.keys(expected).length !== Object.keys(selectedPath).length ||
                        Object.keys(selectedPath).some(function (key) { return expected[key] !== selectedPath[key]; })) {
                        callback({ success: false, error: "Expected exact current observation of one non-ghost path without additions; target changed or unsupported" }); return;
                    }
                    context.executeAction("footpathremove", { x: pp.x * 32, y: pp.y * 32, z: pp.z * 8 }, function (result) {
                        pathActionResponse(pp, beforePaths, result, callback);
                    });
                    return;
                }
                var slope = pp.slope_direction === undefined ? null : pp.slope_direction;
                if (slope !== null && (!Number.isInteger(slope) || slope < 0 || slope > 3)) {
                    callback({ success: false, error: "Expected null for flat path or slope_direction 0-3" }); return;
                }
                if (targetTile.elements.some(function (el) {
                    return (el.type === "footpath" && el.baseZ === pp.z * 8) ||
                        ["surface", "footpath", "track"].indexOf(el.type) < 0;
                })) {
                    callback({ success: false, error: "Existing paths at this height cannot be replaced; local scenery is not cleared" }); return;
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
                    slopeType: slope === null ? 0 : 1, slopeDirection: slope === null ? 0 : slope, constructFlags: pp.is_queue ? 1 : 0 }, function (result) {
                    pathActionResponse(pp, beforePaths, result, callback);
                });
                break;

            case "savePark":
                var filename = request.params.filename;
                if (["normal", "scenario_editor"].indexOf(context.mode) < 0 || typeof filename !== "string" ||
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
                    registered_actions: Object.keys(registeredActions).map(function (key) { return registeredActions[key].name; }),
                    protocol_version: 1,
                    api_version: context.apiVersion,
                    map_size: { x: map.size.x, y: map.size.y },
                    game_paused: context.paused,
                    park_name: typeof park !== "undefined" ? park.name : null,
                    capabilities: ["coaster_snapshot", "close_ride", "endpoint_removal", "cardinal_geometry",
                        "guarded_append", "removal_preview", "track_options_readback", "loaded_ride_objects",
                        "park_status", "station_access_observations", "ride_object_research", "train_observations", "explicit_ride_reset",
                        "flat_paths", "sloped_elevated_paths", "ride_footprints", "selected_track_removal", "maze_cells", "normal_play_guards", "open_ride", "checkpoint_request", "explicit_station_buildings", "ride_finances", "ride_prices"]
                } });
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
                appendTrackPiece(request.params, callback);
                break;

            case "queryTrackPiece":
            case "placeTrackPiece":
                placeTrackPiece(request.params, callback, request.endpoint === "queryTrackPiece");
                break;

            case "getCoasterState":
                callback({ success: true, payload: readCoasterState(request.params.rideId) });
                break;

            case "getValidNextPieces":
                if (typeof request.params.rideId !== "number") {
                    callback({ success: false, error: "Missing or invalid parameter: rideId" });
                    return;
                }
                callback({ success: true, payload: readConstructionCandidates(getRideTrackState(request.params.rideId)) });
                break;

            case "placeStationBuilding":
                placeStationBuilding(request.params, callback);
                break;

            case "placeEntranceExit":
                placeEntranceExit(request.params, callback);
                break;

            case "previewTrackRemoval":
            case "deleteLastTrackPiece":
                removeTrackPiece(request.params, callback, request.endpoint === "previewTrackRemoval");
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
                try {
                    if (context.mode !== "normal" || !rideBuildTypes[rideCreateArgs.rideType] ||
                        rideBuildTypes[rideCreateArgs.rideType].track_type !== 1) {
                        throw new Error("create_ride requires station-based track; use create_unbuilt_ride and its dedicated construction tool");
                    }
                    rideCreateArgs.rideObject = researchedRideObject(rideCreateArgs.rideType, rideCreateArgs.rideObject);
                } catch (error) { callback({ success: false, error: String(error) }); return; }
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
                callback({ success: true, payload: readTrackHistory(getRideTrackState(request.params.rideId)) });
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