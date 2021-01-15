/*
    Alex Olwal, 2020, www.olwal.com

    Configuration file with global constants
*/

const API_KEY_ELEVATION = '13113dc2a0362476bb6131a8eddcfb084';
const API_KEY_MAP_TILER = 'rlkd5TJAOOZNiBLdSkPY';

const DIV_P5 = 'p5';
const DIV_GL = 'gl';
const CANVAS_HEIGHT = 80;
let UPDATE_INTERVAL = 60000;
const DATA_PATH = 'data/outside_sensors_bay_area.csv'; 
const SENSOR_INDEX_FILE = 'data/outside_sensors.csv';// 'data/outside_sensors_bay_area.csv';//'data/outside_sensors.csv';//
let LANDMARKS_PATH = 'data/california_cities_selected.csv';
const TIME_BETWEEN_REQUESTS = 100;
const TIME_BETWEEN_REQUESTS_FIRST = 1;
const SHOW_CONTROLS = true;
const DATASETS = [ 'bay_area', 'europe', 'eurasia', 'california' ];
const DATASET_PATH = 'data/binary/';
const BINARY_DATA_PATH = DATASET_PATH + 'bay_area/';
const LANDMARKS = [ 'california_cities_selected', 'world_capitals'];

const FEATURE_OPACITY = 0.7; //0-1
const FEATURE_COLLECTION_NAME = "sensors";
const FEATURE_COLLECTION_NAME_LANDMARKS = "cities";

const DEFAULT_LONGITUDE = -122.44198789673219;
const DEFAULT_LATITUDE = 37.7591527514897;
const DEFAULT_RADIUS = 10000; //m

let DEFAULT_DISTANCE = 50000;

var ORBIT_AFTER_FOCUS = false;

var MAP_TARGET = {
//    latitude: 37.512070759717645, longitude: -122.29158348430136,
    latitude: 37.7591527514897, longitude: -122.44198789673219,
    distance: 1000,
    angle: 45, bearing: 0,
    animationDuration: 2
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
    maxDistance: 100000,
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

const GL_ENVIRONMENT = {
    title: 'custom',
    parameters: {
        inclination: 45,
        fogDropoff: 0.000
    }
};