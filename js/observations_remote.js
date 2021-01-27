/*
    Alex Olwal, 2020, www.olwal.com

    Class to manage sensor data and updates using remote data.
*/

class ObservationsRemote 
{
    constructor(longitude, latitude, radius)
    {
        this.latitudes = [ 10000, -10000 ]; //min, max
        this.longitudes = [ 10000, -10000 ];  //min, max

        //position and radius (m)
        this.setLocation(longitude, latitude, radius)

        this.selected = undefined; //tracking clicked object

        this.FEATURE_OPACITY = 0.5;
        this.TIME_BETWEEN_REQUESTS_FIRST = 1; //the first round should update fast
        this.TIME_BETWEEN_REQUESTS = 10; //slower updates when we refresh the data

        //static fields are not yet supported in all browswer, thus setting these up as member fields
        this.COLUMN_ID = "id";
        this.COLUMN_LONGITUDE = "longitude";
        this.COLUMN_LATITUDE = "latitude";
        this.COLUMN_AQI = "aqi";
        this.COLUMN_UPDATED = "updated";
        this.COLUMN_TEMPERATURE = "temp_f";
        this.COLUMN_HUMIDITY = "humidity";
        this.COLUMN_PRESSURE = "pressure";
        this.COLUMN_LABEL = "label";
        this.COLUMN_COLOR = "color";
        this.COLUMN_VALUE = this.COLUMN_AQI;

        this.sensorValues = []; //sorted array of updated values
        this.nSensorsUpdated = 0; //track updated sensors
        this.nSensorsSkipped = 0; //track skipped sensors (due to distance)
        this.updatingSensors = false; //flag whether we are currently updating
        this.initialized = false; //has there been a first update of all sensor data
    }

    preload() //load table with sensor IDs and locations
    {
        self = this;
        this.sensors = loadTable(DATA_PATH, 'csv', 'header');   
        this.observations = {};
    }

    init(updateInterval, limitSensorsToLoad = -1) 
    {
        self.updateInterval = updateInterval; //time between updates

        for (let r = 0; r < self.sensors.getRowCount(); r++)
        {
            let id = self.sensors.getNum(r, this.COLUMN_ID);
            let longitude = self.sensors.getNum(r, this.COLUMN_LONGITUDE);
            let latitude = self.sensors.getNum(r, this.COLUMN_LATITUDE);
            let aqi = -1;

            //store min, max for longitude and latitude
            if (longitude < this.longitudes[0])
                this.longitudes[0] = longitude;

            if (longitude > this.longitudes[1])
                this.longitudes[1] = longitude;
            
            if (latitude < this.latitudes[0])
                this.latitudes[0] = latitude;
            
            if (latitude > this.latitudes[1])
                this.latitudes[1] = latitude;

            //convert read IDs, longitudes and latitudes to numbers
            self.sensors.set(r, this.COLUMN_ID, id);
            self.sensors.set(r, this.COLUMN_LONGITUDE, longitude);
            self.sensors.set(r, this.COLUMN_LATITUDE, latitude);

            let distance = this.getDistanceM(longitude, latitude);
            if (distance > this.radius)
                continue;

            //key-value store: [ aqi, longitude, latitude ]
            self.observations[id] = [ aqi, longitude, latitude ];

/*
            for (let c = 0; c < self.sensors.getColumnCount(); c++)
            {
                //convert read IDs, longitudes and latitudes to numbers
                let num = self.sensors.getNum(r, c);
                self.sensors.set(r, c, num);
            }*/
        }
                
        //store min, max as JSON object
        this.bounds = {
            sw: { latitude: this.latitudes[0], longitude: this.longitudes[0] }, 
            ne: { latitude: this.latitudes[1], longitude: this.longitudes[1] }
        };

        //add columns to table for retrieved data
        self.sensors.addColumn(self.COLUMN_AQI);
        self.sensors.addColumn(self.COLUMN_TEMPERATURE);
        self.sensors.addColumn(self.COLUMN_PRESSURE);
        self.sensors.addColumn(self.COLUMN_HUMIDITY);
        self.sensors.addColumn(self.COLUMN_LABEL);
        //add column for calculated color
        self.sensors.addColumn(self.COLUMN_COLOR); 
        self.sensors.addColumn(self.COLUMN_UPDATED);         

        if (limitSensorsToLoad > 0) //loading fewer sensors for debug/test
            self.nSensors = limitSensorsToLoad;
        else //otherwise (default) load all sensors
            //self.nSensors = self.sensors.rows.length;
            self.nSensors = self.sensors.rows.length; 

        self.fetchData();
    }

    //update selection object
    updateSelected(id) 
    {
        let previousId = -1;
        if (this.selected != undefined)
            previousId = this.selected[0];

        console.log(id + " " + previousId);

        let row = this.findRow(id); //find the row with all data
        if (row >= 0)
        {
            this.selected = this.sensors.rows[row].arr;
            console.log(this.sensors.rows[row].arr);
            
            return (previousId != id) //true if changed id
        }
        else
        {
            this.selected = undefined;
            return false;
        }
    }

    setLocation(longitude, latitude, radius)
    {
        this.longitude = longitude;
        this.latitude = latitude;
        this.radius = radius;        
    }

    changeLocation(longitude, latitude, radius)
    {
        this.setLocation(longitude, latitude, radius);

        this.selected = undefined; //tracking clicked object

        this.sensorValues = []; //sorted array of updated values
        this.nSensorsUpdated = 0; //track updated sensors
        this.nSensorsSkipped = 0; //track skipped sensors (due to distance)
        this.updatingSensors = false; //flag whether we are currently updating
        this.initialized = false; //has there been a first update of all sensor data
        this.observations = {};     

        this.latitudes = [ 10000, -10000 ]; //min, max
        this.longitudes = [ 10000, -10000 ];  //min, max

        for (let r = 0; r < self.sensors.getRowCount(); r++)
        {
            let id = self.sensors.getNum(r, this.COLUMN_ID);
            let sensorLongitude = self.sensors.getNum(r, this.COLUMN_LONGITUDE);
            let sensorLatitude = self.sensors.getNum(r, this.COLUMN_LATITUDE);
            let aqi = -1;

            //store min, max for longitude and latitude
            if (longitude < this.longitudes[0])
                this.longitudes[0] = longitude;

            if (longitude > this.longitudes[1])
                this.longitudes[1] = longitude;
            
            if (latitude < this.latitudes[0])
                this.latitudes[0] = latitude;
            
            if (latitude > this.latitudes[1])
                this.latitudes[1] = latitude;

            let distance = this.getDistanceM(sensorLongitude, sensorLatitude);
            if (distance > this.radius)
                continue;

            //key-value store: [ aqi, longitude, latitude ]
            this.observations[id] = [ aqi, sensorLongitude, sensorLatitude ];
        }

        console.log( "sensors: " + Object.keys(air.observations).length );

        this.fetchData();
    }

    preload() //load table with sensor IDs and locations
    {
        self = this;
        this.sensors = loadTable(DATA_PATH, 'csv', 'header');   
        this.observations = {};        
    }

    //fetch data from remote server
    fetchData() 
    {         
        if (self.updatingSensors) //return if we have an on-going update
            return;

        self.updatingSensors = true; //flag on-going update
        self.clearUpdates(self.sensors, "updated");

        console.log("Starting update...");
        for (var i = 0; i < self.nSensors; i++)
        {
            //do a fast download for the first request, and slower when updating
            let timeout = self.initialized ? self.TIME_BETWEEN_REQUESTS : self.TIME_BETWEEN_REQUESTS_FIRST;
            //start each request slightly offset to avoid many simultaneous requests
            timeout *= i;

            let sensorId        = self.sensors.rows[i].arr[0]; //id
            let sensorLongitude = self.sensors.rows[i].arr[1]; //longitude
            let sensorLatitude  = self.sensors.rows[i].arr[2]; //latitude

            let distance = self.getDistanceM(sensorLongitude ,sensorLatitude);
            if (distance > self.radius)
            {
                self.nSensorsSkipped += 1;
                continue;
            }

            let url = "https://www.purpleair.com/json?show=" + sensorId;

            setTimeout(function() { 
                try 
                {
                    loadJSON(url, self.onFetched, //callback upon successful result
                        function (response) 
                        { //onError
                            console.log("fetchData: loadJSON");
                            console.log(response);
                            self.onFetched(undefined); //call with undefined if failed
                        }
                    )
                }
                catch(err)
                {
                    console.log("fetchData: throwing error");
                    console.log(err);
                }                 
            }, timeout ); //when to start this request
        }
    }

    //callback function for fetched data
    onFetched(data)
    {
        self.nSensorsUpdated += 1; //increase counter to track all processed requests

        //failed request
        if (data == undefined || data.results == undefined || data.results[0] == undefined)
        {
            console.log("Could not fetch this sensor");
        }
        else //successful request will return JSON object
        { 
            //Example: https://www.purpleair.com/json?show=46333
            let results = data.results[0];

            let id = results.ID; //sensor id
            let pm25 = results.PM2_5Value; //PM 2.5 
            let aqi = AirQuality.getAqiFromPm25(pm25); //convert to Air Quality Index

            if (aqi == undefined)
                aqi = -1;

            let row = self.findRow(id); //find row to update

            // let color = AirQuality.getColorHex(aqi);
            let rgb = AirQuality.getColor(aqi);
            let color = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + self.FEATURE_OPACITY + ")";

            self.sensors.set(row, self.COLUMN_AQI, aqi);
            self.sensors.set(row, self.COLUMN_COLOR, rgb);
            self.sensors.set(row, self.COLUMN_LABEL, results.Label);
            self.sensors.set(row, self.COLUMN_TEMPERATURE, results.temp_f);
            self.sensors.set(row, self.COLUMN_PRESSURE, results.pressure);
            self.sensors.set(row, self.COLUMN_HUMIDITY, results.humidity);        
            self.sensors.set(row, self.COLUMN_UPDATED, true);        
            
            let values = self.observations[id];
            self.observations[id] = [ aqi, values[1], values[2], rgb ];

            //console.log(id + " " + aqi + " " + self.nSensorsUpdated + " " + self.nSensors);
        }

        //check if all sensors have been processed
        if ((self.nSensorsUpdated + self.nSensorsSkipped) >= self.nSensors)
        {
            console.log(
                self.nSensorsUpdated + " " + self.nSensorsSkipped
            );
    
            self.updatingSensors = false;
            self.sensorValues = self.getUpdatedValues(self.sensors, 
                self.COLUMN_ID, self.COLUMN_UPDATED, self.COLUMN_VALUE, self.COLUMN_COLOR);
            self.nSensorsUpdated = 0;
            self.nSensorsSkipped = 0;
            self.onUpdateCompleted();
        }
    }

    clearUpdates(table, columnUpdated)
    {   
        for (let r = 0; r < table.getRowCount(); r++)
            table.set(r, columnUpdated, false);
    }

    getUpdatedValues(table, columnId, columnUpdated, columnValue, columnColor)
    {
        let values = [];

        for (let r = 0; r < table.getRowCount(); r++)
        {
            let updated = table.get(r, columnUpdated);
            if (!updated)
                continue;

            let value = [ table.getNum(r, columnId), 
                          table.getNum(r, columnValue),
                          table.get(r, columnColor)
                        ];
            values.push(value); 
        }

        return values.sort(
            function(a, b) {
                return a[1] - b[1];
            }
        ); 
    }

    //callback for when fetch requests have been completed
    onUpdateCompleted()
    {
        let self = this;
        console.log("Updated all sensors");

        if (self.onUpdateCallback) //external callback
            self.onUpdateCallback(self.sensors);

        if (self.updateInterval < 0) //don't update further if invalid interval
            return;

        //continue updating sensors based on updateInterval
        window.setInterval( 
            function() {                
                //don't start if actively updating
                if (self.updatingSensors || (self.nSensorsUpdated + self.nSensorsSkipped) > 0)
                    return;
    
                self.fetchData();
            },        
            self.updateInterval);

        //flag that the first request was completed
        self.initialized = true;
    }

    //returns the row in sensors for given id
    findRow(id)
    {
        return self.binarySearch(self.sensors.getColumn(self.COLUMN_ID), id);
    }

    //classic binary search for value in sorted array of values
    binarySearch(values, value)
    {
        let start = 0;
        let end = values.length-1; 
                  
        while (start <= end)
        { 
            let mid = Math.floor((start + end)/2); 

            if (values[mid] == value)
                return mid; 
          
            else if (values[mid] < value)  
                start = mid + 1; 
            else
                end = mid - 1; 
        } 
           
        return -1; 
    }  

    getDistanceM(longitude1, latitude1, longitude2 = undefined, latitude2 = undefined)
    {
        if (longitude2 == undefined)
            longitude2 = this.longitude;

        if (latitude2 == undefined)
            latitude2 = this.latitude;
                
        let R = 6371; //earth's radius (km)

        let PI_180 = PI/180;

        let deltaLatitude = (latitude2-latitude1) * PI_180;
        let deltaLongitude = (longitude2-longitude1) * PI_180;

        let a = pow(sin(deltaLatitude/2), 2) +
                cos(latitude1 * PI_180) * cos(latitude2 * (PI_180)) *
                pow(sin(deltaLongitude/2), 2);;

        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        let d = R * c;
        
        return d*1000;
    }    
}