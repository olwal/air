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

  static buildFromData(data, name)
  {
    let o = {};
    o.type = "FeatureCollection";
    o.name = name;
    o.features = [];
/*    o.defaults = {
      "properties": {
        "borderRadius": 25,
        "padding": 10,
        "borderWidth": 0,
        },        
      }
    };    
 */   

    for (let i = 0; i < data.length; i++)
    {
  /*    let f =  {
        "geometry": {
          "type": "Point",
          "coordinates": [data[i][1], data[i][2]]
        },
        "type": "Feature",
        "id": 0,
        "properties": {
          "color": "#ddd",
          "fontSize": 400,
          "name": "|",
          "anchorOffset": {
            "y": -70,
            "x": 0
          },
          "collapseDistance": 3000,
          "fadeDistance": 5000,          
          "anchor": "bottom"
        }
      };
  
      o.features.push(f);
*/

      let node = {};
      node.type = 'Feature';
      node.id = data[i][0];
      
      let geometry = {};
      geometry.type = 'Point';
      geometry.coordinates = [data[i][1], data[i][2]];
      node.geometry = geometry;
    
      let aqi = parseInt(data[i][3]);

      if (isNaN(aqi))
        continue;

      let colorAqi = data[i][8];
      //'#000000'; //data[i][8];

      node.properties = {};
//      node.properties.fontSize = 40;
      node.properties.borderRadius = 0;
      node.properties.color = '#ffffff';
      node.properties.padding = 0;
  //    node.properties.name = data[i][8];
      //node.properties.name = data[i][7];//aqi;
  //    node.properties.background = colorAqi; // + "33"; //data[i][4];

//      o.features.push(node);

//      node.id = "#" + data[i][0] + " bar";
      node.properties.color = colorAqi;
      node.properties.fontSize = 20 + 150 * min(5000, Math.pow(aqi, 1.5))/5000;
      
 //Math.max(20 + 2*aqi;
      node.properties.name = "|";
      node.properties.anchor = "bottom";
      node.properties.fadeDistance = 100000;
      //node.properties.anchorOffset = { x: 0, y: -(20 + 2*aqi)/5 };
      node.properties.anchorOffset = { x: 0, y: 0 };
      o.features.push(node);
/*
      let base = {};
      base.type = 'Feature';

      let geometry2 = {};
      geometry2.type = 'Point';
      geometry2.coordinates = [data[i][1], data[i][2]];
      base.geometry = geometry2;
      base.id = "#" + data[i][0] + " base";
      base.properties = {};
      base.properties.fontSize = 10;
      base.properties.color = colorAqi;
      base.properties.name = "";
      base.properties.anchor = "center";
      base.properties.anchorOffset = {};
      base.properties.icon = "circle-o";
      o.features.push(base);      
*/
    }
    
    console.log("Read " + data.length + " features.");

    return o;
  }

  static getBayAreaFeatures(featureCollectionName, locations, location = undefined)
  {   
    let o = {};
    o.type = "FeatureCollection";
    o.name = featureCollectionName;
    /*o.defaults = {
      "properties": {
        "color": "white",
        "padding": 10,
        "clipping": "object",
        "borderRadius": 25,
        "padding": 10,
        "borderWidth": 0,
        "background": "rgba(255, 255, 255, 200)",
        "anchorOffset": {
          "y": 70,
          "x": 0
        },        
      }*/
   // };


    let count = 0;

    o.features = [];

    console.log("length: " + locations.rows.length);    

    for (let row of locations.rows)
    {
      let name = row.get("name"); //.arr[0];
      let show = row.get("show"); //row.arr[3];

      if (show == '' || show == undefined)
        show = '1';

      if (show == '0' && (location == undefined || name != location))
        continue;

      let textColor = "rgba(255, 255, 255, 0.8)";

      if (location != undefined)
      {
        textColor = (name == location) ? "rgba(255, 255, 255, 1)" : "rgba(240, 240, 240, 0.8)";
        
        if (name == location)
        {
          //name = "[ " + name + " ]";
          if (show != '1' && show != 1)
            show = '2';
        }      
      }
      
      let latitude = parseFloat(row.get("latitude")); //parseFloat(row.arr[1]);
      let longitude = parseFloat(row.get("longitude")); //parseFloat(row.arr[2]);

      if (isNaN(latitude) || isNaN(longitude))
      {
        console.log("NaN: " + name + " " + longitude + ""  + latitude + " " + show);
        continue;
      }

      let feature = {
        "geometry": {
          "type": "Point",
          "coordinates": [longitude, latitude]
        },
        "type": "Feature",
        "id": count,
        "properties": {
          "fontSize": 10 + (50 / (show * show)),
          "color": textColor,        
          "name": name,
          "anchorOffset": {
            "y": 0,
            "x": 0
          },
          "anchor": "bottom",
          "borderRadius": 25,
          "padding": 10,
          "borderWidth": 0,
//          "background": "rgba(255, 255, 255, 0.5)"
          "fadeDistance": 250000,
          }
        };

      let feature2 =
        {
          "geometry": {
            "type": "Point",
            "coordinates": [ -122.0839, 37.3861 ]
          },
          "type": "Feature",
          "id": count,
          "properties": {
            "fontSize": 24,
            "color": "white",        
            "name": "Mountain View",
          }
        }

      count += 1;
      o.features.push(feature);
    } 

      



/*
      node.id = "#" + row.arr[0] + " bar";
      node.properties.fontSize = 2;
      node.properties.name = "|";

      o.features.push(node);      
   */   
    //}

    /*
    let feature = 
    {
    "type": "FeatureCollection",
    "features": [ {
      "geometry": {
        "type": "Point",
        "coordinates": [ -122.0839, 37.3861 ]
      },
      "type": "Feature",
      "id": 0,
      "properties": {
        "fontSize": 24,
        "color": "white",        
        "name": "Mountain View",
        "anchorOffset": {
          "y": 70,
          "x": 0
        },
        "borderRadius": 25,
        "padding": 10,
        "borderWidth": 0,
        "background": "rgba(33, 00, 00, 200)"
        }
      } ]
    };*/

    return o;
  }
}
