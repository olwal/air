/*
    Alex Olwal, 2020, www.olwal.com

    Configuration file with global constants
*/

const API_KEY_ELEVATION = '13113dc2a0362476bb6131a8eddcfb084';
const API_KEY_MAP_TILER = 'rlkd5TJAOOZNiBLdSkPY';

const DIV_P5 = 'p5';
const DIV_GL = 'gl';
const CANVAS_HEIGHT = 80;
const UPDATE_INTERVAL = -1; //60000;
const DATA_PATH = 'data/outside_sensors_bay_area.csv';
const SENSOR_INDEX_FILE = 'data/outside_sensors_bay_area.csv';
const BINARY_DATA_PATH = 'data/binary/bay_area/';
const LANDMARKS_PATH = 'data/california_cities_selected.csv';
const TIME_BETWEEN_REQUESTS = 100;
const TIME_BETWEEN_REQUESTS_FIRST = 1;
const SHOW_CONTROLS = false;

const FEATURE_OPACITY = 0.7; //0-1
const FEATURE_COLLECTION_NAME = "sensors";

var ORBIT_AFTER_FOCUS = true;

var MAP_TARGET = {
    latitude: 37.512070759717645, longitude: -122.29158348430136,
    distance: 50000,
    angle: 35, bearing: -20
};
  
const GL_CONFIGURATION = {
    // Minimum distance camera can approach scene
    minDistance: 2000,
    // Maximum distance camera can move from scene
    maxDistance: 100000,
    // Maximum distance camera target can move from scene
    maxBounds: 7500000,
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