/*
    Alex Olwal, 2020, www.olwal.com
    
    Class with static method to build FeatureCollection for use as overlays on 3D map.
    See: https://tools.ietf.org/html/rfc7946
*/

class Features
{
  static preload()
  {
    console.log(LANDMARKS_PATH);
    return loadTable(LANDMARKS_PATH, 'csv', 'header');
  }

  static getBayAreaFeatures(featureCollectionName, locations, location = undefined)
  {   
    let o = {};
    o.type = "FeatureCollection";
    o.name = featureCollectionName;
    o.defaults = {
      "properties": {
        "anchorOffset": {
          "y": 0,
          "x": 0
        },
        "anchor": "bottom",
        "fadeDistance": 1000000,
        "clipping": "pixel"
        }
    };

    let count = 0;
    let selectedLocation = false;; 

    o.features = [];

//    console.log("length: " + locations.rows.length);    

    let dpr = window.devicePixelRatio; //scale labels based on pixel density
    let fontScale = CANVAS_WIDTH/1000 * dpr; // * 1.5; //CANVAS_WIDTH/1000 * dpr;

    for (let row of locations.rows)
    {
      let name = row.get("name"); //.arr[0];
      let show = row.get("show"); //row.arr[3];

      if (show == '' || show == undefined)
        show = '1';

      if (show == '0' && (location == undefined || name != location))
        continue;

      let textColor = "rgba(255, 255, 255, 0.7)";

      if (location != undefined)
      {
        textColor = (name == location) ? "rgba(255, 255, 255, 1)" : textColor;
        
        if (name == location)
        {
          selectedLocation = true;
          //name = "[ " + name + " ]";
          if (show != '1' && show != 1)
            show = '2';
        }      
        else
          selectedLocation = false;
      }
      
      let latitude = parseFloat(row.get("latitude")); //parseFloat(row.arr[1]);
      let longitude = parseFloat(row.get("longitude")); //parseFloat(row.arr[2]);

      if (isNaN(latitude) || isNaN(longitude))
      {
        console.log("NaN: " + name + " " + longitude + ""  + latitude + " " + show);
        continue;
      }

//      console.log("adding: " + name + " " + longitude + " "  + latitude + " " + show);

      let feature = {
        "geometry": {
          "type": "Point",
          "coordinates": [longitude, latitude]
        },
        "type": "Feature",
        "id": name, //count,
        "properties": {
          "fontSize":  fontScale * 10 + (10 / (show * show)),
          "color": textColor,        
          "name": name,
          /*"borderRadius": 25,
          "padding": 20,
          "borderWidth": 0,
          "background": "rgba(100, 100, 100, 1)",*/
          }
        };

      if (selectedLocation)
      {
        feature.properties = {
          "fontSize": fontScale * 10 + (10 / (show * show)),
          "color": textColor,
          "name": name,
          "borderRadius": 10,
          "padding": 0,
          "borderWidth": 0,
          "background": "rgba(0, 0, 0, 0.25)"
          }
      }

      count += 1;
      o.features.push(feature);
    } 

    return o;
  }
}
