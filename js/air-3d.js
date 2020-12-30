/*
    Alex Olwal, 2020, www.olwal.com
    
    3D map using procedural-gl.js
    (https://github.com/felixpalmer/procedural-gl-js)
*/

/*
Externally defined constants/global variables:
Example:

const API_KEY_ELEVATION = '******************************';
const API_KEY_MAP_TILER = '******************************';

const DIV_GL = 'gl';

var ORBIT_AFTER_FOCUS = true;

const MAP_TARGET = {
    latitude: 37.512070759717645, longitude: -122.29158348430136,
    distance: 50000,
    angle: 35, bearing: -20
};
  
const GL_CONFIGURATION = {
    // Minimum distance camera can approach scene
  //  minDistance: 1000,
    // Maximum distance camera can move from scene
    maxDistance: 50000,
    // Maximum distance camera target can move from scene
    maxBounds: 7500000,
    // Minimum polar angle of camera
  //  minPolarAngle: 0.25 * Math.PI,
    // Maximum polar angle of camera
  //  maxPolarAngle: 0.8 * Math.PI,
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
*/

const container = document.getElementById(DIV_GL);

//tile servers: https://wiki.openstreetmap.org/wiki/Tile_servers
//map tiler: https://cloud.maptiler.com/account/keys/

//configure data sources for elevation and map imagery
 var datasource = {
  elevation: {
    apiKey: API_KEY_ELEVATION
  },
  imagery: {
    apiKey: API_KEY_MAP_TILER,
    urlFormat: 'https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key={apiKey}',
    attribution: '<a href="https://www.maptiler.com/copyright/">Maptiler</a> <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }
}

//initialize with container and data sources
Procedural.init( {container, datasource} );

//show user interface controls
/*Procedural.setCameraModeControlVisible(true);
*/
Procedural.setCompassVisible(false);
/*Procedural.setRotationControlVisible(true);
Procedural.setZoomControlVisible(true);
*/
window.Procedural = Procedural;

//start orbiting after location is focused
Procedural.onLocationFocused = 
  function () 
  {
    if (ORBIT_AFTER_FOCUS)
      Procedural.orbitTarget();
  };

//use externally defined settings to set up camera, rendering and location
Procedural.configureControls(GL_CONFIGURATION);
Procedural.setEnvironment(GL_ENVIRONMENT);
Procedural.displayLocation(MAP_TARGET);