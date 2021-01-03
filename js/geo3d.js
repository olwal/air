/*
    Alex Olwal, 2020, www.olwal.com
    
    3D map using procedural-gl.js
    (https://github.com/felixpalmer/procedural-gl-js)

    Externally defined constants/global variables in config.js
*/

const container = document.getElementById(DIV_GL);

//tile servers: https://wiki.openstreetmap.org/wiki/Tile_servers
//map tiler: https://cloud.maptiler.com/account/keys/
//preview of tile servers: https://leaflet-extras.github.io/leaflet-providers/preview/

//configure data sources for elevation and map imagery
 var datasource = {
  elevation: {
    apiKey: API_KEY_ELEVATION
  },
  /*
  imagery: {
    apiKey: API_KEY_MAP_TILER,
    urlFormat: 'https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key={apiKey}',
    attribution: '<a href="https://www.maptiler.com/copyright/">Maptiler</a> <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }
  */
  imagery: {   
    urlFormat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  }

}

//initialize with container and data sources
Procedural.init( {container, datasource} );

//User interface controls
if (SHOW_CONTROLS)
{
  Procedural.setCameraModeControlVisible(true);
  Procedural.setCompassVisible(true);
  Procedural.setRotationControlVisible(true);
  Procedural.setZoomControlVisible(true);
}
else
  Procedural.setCompassVisible(false);

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
Procedural.focusOnLocation(MAP_TARGET);