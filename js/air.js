/*
    Alex Olwal, 2020, www.olwal.com

    Class to manage sensor data and updates using remote data.
*/

class Air 
{
    self;
    static colors;
    static mapping;

    latitudes = [ 10000, -10000 ]; //min, max
    longitudes = [ 10000, -10000 ];  //min, max

    selected = undefined; //tracking clicked object

    TIME_BETWEEN_REQUESTS_FIRST = 1; //the first round should update fast
    TIME_BETWEEN_REQUESTS = 10; //slower updates when we refresh the data

    nSensorsUpdated = 0; //track updated sensors
    updatingSensors = false; //flag whether we are currently updating
    initialized = false; //has there been a first update of all sensor data

    preload() //load table with sensor IDs and locations
    {
        self = this;
        this.sensors = loadTable(DATA_PATH, 'csv', 'header');   
    }

    init(updateInterval, limitSensorsToLoad = -1) 
    {
        self.updateInterval = updateInterval; //time between updates

        for (let r = 0; r < self.sensors.getRowCount(); r++)
            for (let c = 0; c < self.sensors.getColumnCount(); c++)
            {
                //convert read IDs, longitudes and latitudes to numbers
                let num = self.sensors.getNum(r, c);
                self.sensors.set(r, c, num);

                //store min, max for longitude and latitude
                if (c == 1) //longitude
                {
                    if (num < this.longitudes[0])
                        this.longitudes[0] = num;
                    else if (num > this.longitudes[1])
                        this.longitudes[1] = num;
                }
                else if (c == 2) //latitude
                {
                    if (num < this.latitudes[0])
                        this.latitudes[0] = num;
                    else if (num > this.latitudes[1])
                        this.latitudes[1] = num;
                }
            }
                
        //store min, max as JSON object
        this.bounds = {
            sw: { latitude: this.latitudes[0], longitude: this.longitudes[0] }, 
            ne: { latitude: this.latitudes[1], longitude: this.longitudes[1] }
        };

        //add columns to table for retrieved data
        self.sensors.addColumn('aqi');
        self.sensors.addColumn('temp_f');
        self.sensors.addColumn('pressure');
        self.sensors.addColumn('humidity');
        self.sensors.addColumn('label');
        //add column for calculated color
        self.sensors.addColumn('color');        

        if (limitSensorsToLoad > 0) //loading fewer sensors for debug/test
            self.nSensors = limitSensorsToLoad
        else //otherwise (default) load all sensors
            self.nSensors = self.sensors.rows.length;

        self.fetchData();
    }

    //update selection object
    updateSelected(id) 
    {
        let previousId = -1;
        if (this.selected != undefined)
            previousId = this.selected[0];

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

    //fetch data from remote server
    fetchData() 
    {         
        if (self.updatingSensors) //return if we have an on-going update
            return;

        self.updatingSensors = true; //flag on-going update
        console.log("Starting update...");
        for (var i = 0; i < self.nSensors; i++)
        {
            //do a fast download for the first request, and slower when updating
            let timeout = self.initialized ? self.TIME_BETWEEN_REQUESTS : self.TIME_BETWEEN_REQUESTS_FIRST;
            //start each request slightly offset to avoid many simultaneous requests
            timeout *= i;

            let sensorId = air.sensors.rows[i].arr[0]; //id
            let url = "https://www.purpleair.com/json?show=" + sensorId;

            setTimeout(function() { 
                try{
                 loadJSON(url, self.onFetched, //callback upon successful result
                    function (response) { //onError
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
                }
                , timeout ); //when to start this request
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

            let row = self.findRow(id) //find row to update

            self.sensors.set(row, "aqi", aqi);
            self.sensors.set(row, "color", AirQuality.getColorHex(aqi));
            self.sensors.set(row, "label", results.Label);
            self.sensors.set(row, "temp_f", results.temp_f);
            self.sensors.set(row, "pressure", results.pressure);
            self.sensors.set(row, "humidity", results.humidity);            

            //console.log(id + " " + aqi + " " + self.nSensorsUpdated + " " + self.nSensors);
        }

        //check if all sensors have been processed
        if (self.nSensorsUpdated >= self.nSensors)
        {
            self.updatingSensors = false;
            self.nSensorsUpdated = 0;
            self.onUpdateCompleted();
        }
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
                if (self.updatingSensors || self.nSensorsUpdated > 0)
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
        return self.binarySearch(self.sensors.getColumn("id"), id);
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
}