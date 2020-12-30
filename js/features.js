/*
    Alex Olwal, 2020, www.olwal.com
    
    Class with static method to build FeatureCollection for use as overlays on 3D map.
    See: https://tools.ietf.org/html/rfc7946
*/

class Features
{
  static buildFromData(data, name)
  {
    let o = {};
    o.type = "FeatureCollection";
    o.name = name;
    o.features = [];
    
    for (let i = 0; i < data.length; i++)
    {
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

      node.properties = {};
      node.properties.borderRadius = 25;
      node.properties.color = '#ffffff';
      node.properties.padding = 10;
      //node.properties.name = data[i][7];//aqi;
      node.properties.background = colorAqi; //data[i][4];

      o.features.push(node);
    }
    
    console.log("Read " + data.length + " features.");

    return o;
  }
};