/*
    Alex Olwal, 2020, www.olwal.com

    Configuration file with global constants
*/

const API_KEY_ELEVATION = '13113dc2a0362476bb6131a8eddcfb084';
const API_KEY_MAP_TILER = 'rlkd5TJAOOZNiBLdSkPY';

const BACKGROUND_COLOR = "#222222"; //#666666
const DIV_P5 = 'p5';
const DIV_GL = 'gl';
const CANVAS_HEIGHT = 80;
let UPDATE_INTERVAL = 60000;
const DATA_PATH = 'data/sensors/outside_sensors_bay_area.csv'; 
//const SENSOR_INDEX_FILE = 'data/outside_sensors.csv';// 'data/outside_sensors_bay_area.csv';//'data/outside_sensors.csv';//
//const SENSOR_INDEX_FILE = 'data/sensors/california_cities_selected.csv';
const SENSOR_INDEX_FILE = 'data/sensors/outside_sensors_bay_area.csv';
let LANDMARKS_PATH = 'data/landmarks/california_cities_selected.csv';
const TIME_BETWEEN_REQUESTS = 100;
const TIME_BETWEEN_REQUESTS_FIRST = 1;
const SHOW_CONTROLS = true;
const DATASETS = [ 'bay_area', 'europe', 'eurasia', 'california', 'bay_area_selected' ];
const DATASET_PATH = 'data/binary/';
//const DATASET_PATH = 'data/binary_averages/';
const BINARY_DATA_PATH = DATASET_PATH + 'bay_area/';
//const BINARY_DATA_PATH = DATASET_PATH + 'bay_area_selected/';
const LANDMARKS = [ 'california_cities_selected', 'world_capitals'];

const SENSOR_INDEX_AGGREGATE_FILE = 'data/sensors/california_cities_selected_ids.csv';
const BINARY_AGGREGATE_DATA_PATH = 'data/binary_averages/bay_area_selected/';

let BINARY_INDEX = BINARY_DATA_PATH + 'index.txt';
const BINARY_AGGREGATE_INDEX = BINARY_AGGREGATE_DATA_PATH + 'index.txt';

const FEATURE_OPACITY = 0.7; //0-1
const FEATURE_COLLECTION_NAME = "sensors";
const FEATURE_COLLECTION_NAME_LANDMARKS = "cities";

const DEFAULT_LONGITUDE = -122.44198789673219;
const DEFAULT_LATITUDE = 37.7591527514897;
const KM_TO_MILES = 1.609;
const DEFAULT_RADIUS = Math.round(5000 * KM_TO_MILES); //5 miles in m

const DATASET_START_DATE = "2020-01-01";
const DATASET_END_DATE = "2021-01-01";

let AUTOPLAY = false; //whether dataset play back starts
let UPDATE_MS = 100; //inter-frame delay 
let UPDATE_MULTIPLIER = 1.2;

let DEFAULT_DISTANCE = 20000;

var ORBIT_AFTER_FOCUS = false;

var proceduralLocation; 
var proceduralLoaded = false;

const MS_TO_DAYS = 24 /* h */ * 60 /* min */ * 60 /* s */ * 1000 /* ms */;

var MAP_TARGET = {
//    latitude: 37.512070759717645, longitude: -122.29158348430136,
    latitude: 37.7591527514897, longitude: -122.44198789673219,
    distance: 54000,
    angle: 28, bearing: 225,
    animationDuration: 1,
    location: 'San Francisco'
 //   angle: 35, bearing: 70
};

var MAP_TARGET_NEUTRAL = {
    //    latitude: 37.512070759717645, longitude: -122.29158348430136,
        latitude: 37.7591527514897, longitude: -122.44198789673219,
    //distance: 50000,
    };

var MAP_TARGET_0 = {
    //    latitude: 37.512070759717645, longitude: -122.29158348430136,
        latitude: 37.7749, longitude: -122.4194,
        distance: 10000,
        //angle: 17, bearing: 100
        angle: 17, bearing: 50
    };
    

const GL_CONFIGURATION = {
    // Minimum distance camera can approach scene
    minDistance: 1000,
    // Maximum distance camera can move from scene
    maxDistance: 1000000,
    // Maximum distance camera target can move from scene
    maxBounds: 75000,
    // Minimum polar angle of camera
    minPolarAngle: 0.2 * Math.PI,
    // Maximum polar angle of camera
    maxPolarAngle: 0.45 * Math.PI,
    // Set to true to disable panning
    noPan: false,
    // Set to true to disable rotating
    noRotate: false,
    // Set to true to disable zooming
    noZoom: false
};

var GL_ENVIRONMENT = {
    title: 'custom',
    parameters: {
//        inclination: 45,
//        fogDropoff: 0.000
        "turbidity": 2.928118393234672,
        "reileigh": 0.631430584918957,
        "mieCoefficient": 0.005962433224194382,
        "mieDirectionalG": 0.1037394451145959,
        "luminance": 1.0236084783732553,
        "inclination": 0.5350336033086335,
        "azimuth": 0.881,
        "fogDropoff": 0,
        "fogIntensity": 1,
        "exposureBias": 1.25,
        "whitePoint": 2.5
    }
};
