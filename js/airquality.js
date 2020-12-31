/*
    Alex Olwal, 2020, www.olwal.com
    
    Class with static methods for calculating Air Quality Index and color mapping.
*/

class AirQuality
{ 
  //colors =['#68E143', '#FFFF55', '#EF8533', '#EA3324', '#8C1A4B', '#8C1A4B', '#731425', '#731425', '#731425', '#731425', '#731425'] 
  //colors to interpolate in categories from 0-300
    
    static getColors()
    {
        let colors = 
        [ [104, 225, 67],
            [255, 255, 85], 
            [239, 133, 51],
            [234, 51, 36],
            [140, 26, 76],
            [140, 26, 76],      
            [115, 20, 37],
            [115, 20, 37],      
        ];

        return colors;
    }

    //calculate Air Quality Index from PM 2.5 concentration
    static getAqiFromPm25(concentration)
    {
        let c = (Math.floor(10*concentration))/10;
        
        if (c >= 0 && c < 12.1)
            return AirQuality.getLinear(50,0,12,0,c);
        else if (c >= 12.1 && c < 35.5)
            return AirQuality.getLinear(100,51,35.4,12.1,c);
        else if (c >= 35.5 && c < 55.5)
            return AirQuality.getLinear(150,101,55.4,35.5,c);
        else if (c >= 55.5 && c < 150.5)
            return AirQuality.getLinear(200,151,150.4,55.5,c);
        else if (c >= 150.5 && c < 250.5)
            return AirQuality.getLinear(300,201,250.4,150.5,c);
        else if (c >= 250.5 && c < 350.5)
            return AirQuality.getLinear(400, 301, 350.4, 250.5, c);
        else if (c  >=  350.5 && c < 500.5)
            return AirQuality.getLinear(500, 401, 500.4, 350.5, c);

        return undefined;
    }

    //linear interpolation from concentration to Air Quality Index value
    static getLinear(aqiHigh, aqiLow, concHigh, concLow, concentration)
    {
        let conc = parseFloat(concentration);
        return Math.round(((conc-concLow)/(concHigh-concLow))*(aqiHigh-aqiLow)+aqiLow);
    }     

    //convert Air Quality Index to hex color
    static getColorHex(aqi)
    {
        let rgb = [0, 0, 0];
        let colors = -1;

        try 
        {
            rgb = AirQuality.getColor(aqi);
        }
        catch (err) 
        {
            console.log(err + " [ aqi: " + aqi + " ]");
        }

        return AirQuality.rgbToHex(rgb[0], rgb[1], rgb[2]);

    }

    //convert Air Quality Index to color
    static getColor(aqi)
    {
        if (aqi < 0)
            aqi = 0;
        else if (aqi > 300)
            aqi = 300;

        let colorIndex = int(aqi/50);

//        let c0 = AirQuality.colors[colorIndex];
//        let c1 = AirQuality.colors[colorIndex + 1];
        let c0 = AirQuality.getColors()[colorIndex];
        let c1 = AirQuality.getColors()[colorIndex + 1];

        let t = (aqi % 50) / 50.0;

        if (c0 == undefined || c1 == undefined)
        {
            console.log("AirQuality.getColor(aqi): aqi == " + aqi);
            return [ 0, 0, 0 ];
        }

        //linear interporlation for the 3 color components 
        let c = [
            int(c0[0] + (c1[0]-c0[0]) * t),
            int(c0[1] + (c1[1]-c0[1]) * t),
            int(c0[2] + (c1[2]-c0[2]) * t)
        ];

        return c;
    }    

    //convert RGB values to color hex string
    static rgbToHex(r, g, b) {
        return "#" + AirQuality.componentToHex(r) + AirQuality.componentToHex(g) + AirQuality.componentToHex(b);
    } 

    //convert 8-bit number (0-255) to hex string
    static componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

   
};