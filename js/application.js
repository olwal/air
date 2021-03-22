/*
    Alex Olwal, 2020, www.olwal.com

    Application for 3D visualization, playback and interaction with time series sensor data overlaid on geo maps.

    Externally defined constants/global variables in config.js
*/

var CANVAS_WIDTH = window.innerWidth; //borderless width
const CONTAINER_P5 = document.getElementById(DIV_P5);

const LABELS_NAME = FEATURE_COLLECTION_NAME_LANDMARKS;
let binaries;
let binariesAggregate;

let locations; //location data for labels
let sensors; //sensor index
let sensorsAggregate; 

let observations = [];
let observationsAggregate = [];
let observationsCache = {};
let observationsVisible = []; //location names, strings
let current = 0;
let nLoaded = 0;
let nLoadedAggregate = 0;
let loadingText = "Loaded";
let radius = DEFAULT_RADIUS;
let distance = DEFAULT_DISTANCE;
let initialized = false;
let autoplay = AUTOPLAY;
let timestamp; //keep track of time for animation

let play = false;
let buttons = {};

//Time intervals to load data, either these as default, or from urlParameters (start_date and end_date)

let START_DATE = Date.parse(START_DATE_STRING);
let END_DATE = Date.parse(END_DATE_STRING);

let locationLabels = undefined;

let showLabels = true;
let showHelp = false;
let showGraph = true;
let showControls = SHOW_CONTROLS;
let showDetails = true;

let focusOnClick = false;
var selectionTracking = false;

showLive = false;
let lastUpdated = -1;
let timestampLive;

let SENSORS_NAME = "$";
let AVERAGE_NAME = "%";

let air;

let reloadNeeded = true;


function preload()
{
    let params = getURLParams();

    let live = int(params['realtime']);
    if (live && !isNaN(live) && live >= 60) //minimum 60s delay
    {
        UPDATE_INTERVAL = live * 1000;
        showLive = true;
    }

    if (showLive)
        preloadLive();
    else
        preloadTimeSeries();

}

function setup()
{
    //create p5.js canvas
    let can = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    can.parent(CONTAINER_P5);

    Procedural.displayLocation(MAP_TARGET);

    enableControls(showControls);

    if (showLive)
        setupLive();
    else
        setupTimeSeries();
}

function draw()
{
    if (showLive)
        drawLive();
    else
        drawTimeSeries();
}

function preloadLive() 
{
    let longitude = MAP_TARGET.longitude;
    let latitude = MAP_TARGET.latitude;
    let radius = DEFAULT_RADIUS;

    air = new ObservationsRemote(longitude, latitude, radius);
    air.preload();
    locations = Features.preload();
}

function digit(number)
{
    return ('0' + number).slice(-2);
}

function submitFormData(location, radius, start_date, end_date, loadLocation)
{
    let long = NaN;
    let lat = NaN;
    let distance = NaN;
    let doFocus = true;

    if (showLive)
    {
        focusLive(location, radius);
        /*
        let longlat = getLocationFromTable(location, MAP_TARGET.longitude, MAP_TARGET.latitude);
        longitude = longlat[0];
        latitude = longlat[1];

        MAP_TARGET.longitude = longitude;
        MAP_TARGET.latitude = latitude;

        let formRadius = document.getElementById("radius").value;
        let formUnit = document.getElementById("unit").value;

        if (formRadius && formUnit)
            radius = formRadius * formUnit;

        loadingText = location;

        document.getElementById("start_date").value = year() + "-" + digit(month()) + "-" + digit(day());
        document.getElementById("end_date").value = year() + "-" + digit(month()) + "-" + digit(day());
    
        focusOn(MAP_TARGET);
        air.changeLocation(longitude, latitude, radius);*/
    }
    else
        loadData(start_date, end_date, long, lat, radius, distance, location, doFocus, loadLocation);
}

function focusLive(location, radius)
{
    let longlat = getLocationFromTable(location, MAP_TARGET.longitude, MAP_TARGET.latitude);
    longitude = longlat[0];
    latitude = longlat[1];

    MAP_TARGET.longitude = longitude;
    MAP_TARGET.latitude = latitude;

    let formRadius = document.getElementById("radius").value;
    let formUnit = document.getElementById("unit").value;

    if (formRadius && formUnit)
        radius = formRadius * formUnit;

    loadingText = location;

    let currentDateString = year() + "-" + digit(month()) + "-" + digit(day());
    document.getElementById("start_date").value = currentDateString;
    document.getElementById("end_date").value = currentDateString;

    focusOn(MAP_TARGET);
    air.changeLocation(longitude, latitude, radius);
}

function setupLive() 
{
	let params = getURLParams();		    
    //let longitude = parseFloat(params['longitude']);
    //let latitude = parseFloat(params['latitude']);

    radius = parseFloat(params['radius']);    
    if (!radius)
        radius = DEFAULT_RADIUS;
    else
    {
        unit = params['unit'];

        if (radius && !isNaN(radius) && unit)
        {
            let conversion = (unit == 'km') ? 1 : KM_TO_MILES;
            print(unit + " " + conversion);
            document.getElementById("unit").value = conversion;
            radius *= conversion;
        }

        radius = isNaN(radius) ? DEFAULT_RADIUS : radius;
    }

    distance = parseFloat(params['distance']) || DEFAULT_DISTANCE;
    
    let location = params['location'];
    if (location == undefined && params['city'])
        location = params['city'];
    if (location == undefined)
        location = DEFAULT_LOCATION;
    else
    {
        location = location.replace(/\+/g, " ");
        location = location.replace(/\%20/g, " ");
    }

    let currentDateString = year() + "-" + digit(month()) + "-" + digit(day());

    //set the text size to 1/4 of the height to fit 2 lines + progress bar
    textSize(CANVAS_HEIGHT * 0.25);
    textFont("Inter");
    textAlign(LEFT);

    air.TIME_BETWEEN_REQUESTS = TIME_BETWEEN_REQUESTS;
    air.TIME_BETWEEN_REQUESTS_FIRST = TIME_BETWEEN_REQUESTS_FIRST;
    air.FEATURE_OPACITY = FEATURE_OPACITY;

    air.init(UPDATE_INTERVAL);    
    self = air;

    //add city names overlays
    locationLabels = Features.getBayAreaFeatures(FEATURE_COLLECTION_NAME_LANDMARKS, locations, location)
    Procedural.addOverlay(locationLabels);

    timestampLive = year() + " " + digit(month()) + " " + digit(day()) + " "  + digit(hour()) + ":"  + digit(minute()); //zero-padded YYYY-MM-DD hh:mm

    updateForm(location, currentDateString, currentDateString, radius);
    focusLive(location, radius);
    
    //callback for receiving updated sensor data
    air.onUpdateCallback = function(sensors) 
    {       
        if (!self.initialized) //first update
        {
            timestampLive = year() + " " + digit(month()) + " " + digit(day()) + " "  + digit(hour()) + ":"  + digit(minute()); //zero-padded YYYY-MM-DD hh:mm

            //Procedural.focusOnLocation(MAP_TARGET); //focus on target position, which will also trigger a camera adjustment

            Procedural.onFeatureClicked = function (id) //clicking on a feature 
            {
                let changed = self.updateSelected(id);

                if (changed && focusOnClick)
                    focusOn(air.selected[1], air.selected[2]);
            }
        }

        if (self.selected != undefined) // Check for a valid selection
            self.updateSelected(self.selected[0]);
        /*
        let callbackData = [] //clear data for overlays
        for (let r = 0; r < sensors.getRowCount(); r++) //add all rows from updates
            callbackData.push(sensors.rows[r].arr);     
        */

        //generate and add sensor overlays
        let o = Observations.getFeatureCollectionJson(SENSORS_NAME, self.observations, FEATURE_OPACITY, 3);
        Procedural.addOverlay(o);

        lastUpdated = millis();
    }

    focusOn(MAP_TARGET);
}

function drawAnalogTime(r, hours, minutes, seconds, colorDial, colorHour, colorMinute, colorSeconds = undefined)
{
    stroke(colorDial);
    noFill();
//    ellipse(0, 0, r);

    for (let a = 0; a < 2 * PI; a += PI/6)
    {
        let x = Math.cos(a);
        let y = Math.sin(a);

        line(0.55 * r * x, 0.55 * r * y,
             0.6 * r * x, 0.6 * r * y 
            );
    }

    let ha = -2 * Math.PI * ( (hours + minutes/60 % 12)/12 ); 
    ha += -Math.PI/2
    
    let ma = -2 * Math.PI * minutes/60;
    ma += -Math.PI/2;

    stroke(colorHour);
    line(0, 0, -0.25 * r * Math.cos(ha), 0.25 * r * Math.sin(ha));

    stroke(colorMinute);
    line(0, 0, -0.4 * r * Math.cos(ma), 0.4 * r * Math.sin(ma));

    if (seconds != undefined && colorSeconds)
    {
        let sa = -2 * Math.PI * seconds/60;
        sa += -Math.PI/2;
        line(0, 0, -0.47 * r * Math.cos(sa), 0.47 * r * Math.sin(sa));    
    }

    fill(colorDial);
    ellipse(0, 0, 0.05 * r);
}

function drawLive() 
{
    background(BACKGROUND_COLOR);

    let hour_string = "Preparing data...";
    let i = 0;
    let keys = Object.keys(air.observations);
    let nSensors = keys.length;

    noStroke();
    fill(255);

    let ts = CANVAS_HEIGHT/4; //text size 25% of canvas height
    let ty = CANVAS_HEIGHT/6; //text position close to top
    let centerX = CANVAS_WIDTH/2; //text centered
    textSize(ts);
    textAlign(LEFT, CENTER);
    let dw = textWidth("DEC 30"); //use a representative long date, since we want a stable offset (otherwise will be jittering)
    fill(255);
    let pad = 10;

    let nValues = air.sensorValues.length;

    if (air.updatingSensors && !air.initialized) //if updating, show percentage and progress bar
    {
        fraction = air.nSensorsUpdated/nSensors;
        let ts = CANVAS_HEIGHT/6; //smaller font size to fit two lines
        textSize(ts);
    
        textAlign(CENTER, CENTER);        
        //Percentage of loaded observations
        text(loadingText + " " + (100 * fraction).toFixed() + "%", centerX, ty);

    }
    else  //if not updating, show seconds since last update
    {
/*        if (lastUpdated >= 0 && air.updateInterval >= 0)
            textString = ((millis() - lastUpdated)/1000).toFixed(0) + "s ago";
        else
*/           hour_string = timestampLive.slice(-5); //get hours + minutes
        let year_string = timestampLive.slice(0, 4);
        //display current date
        let month = int(timestampLive.slice(5, 7))
        let date_string = Observations.getMonth(month) + " " + timestampLive.slice(8, 10)

        //display the current date in center
        text(date_string, centerX - dw/2, ty + pad);

        //smaller text for year and time
        textSize(ts * 2/3);

        //hour, left-centered to the right
        textAlign(LEFT, CENTER);
        fill(200);
//        text(hour_string, centerX + dw/2 + pad, ty + pad);    

        push();
            translate(centerX + dw/2 + 3 * pad, ty + pad);

            let r = pad * 3;

            let colorDial = color(100);
            let colorHour = color(100);
            let colorMinute = color(100);
            let colorSeconds = color(90);
            drawAnalogTime(r, hour(), minute(), second(), colorDial, colorHour, colorMinute, colorSeconds);

            let hours = int(timestampLive.slice(-5, -3));
            let minutes = int(timestampLive.slice(-2));

            colorDial = color(125);
            colorHour = color(180);
            colorMinute = color(200, 200, 100);
            drawAnalogTime(r, hours, minutes, undefined, colorDial, colorHour, colorMinute, undefined);

        pop();

        
        textSize(CANVAS_HEIGHT/10);
        textAlign(RIGHT)
        text(loadingText, CANVAS_WIDTH - pad/2, CANVAS_HEIGHT/10 + pad);
        text(nValues + " sensor" + (nValues == 1 ? "" : "s"), CANVAS_WIDTH - pad/2, 2.2 * CANVAS_HEIGHT/10 + pad);    

        textSize(ts * 2/3);
        textAlign(LEFT);
        //year, right-centered to the left
        let yw = textWidth("2020");
        text(year_string, centerX - dw/2 - yw - pad * 2, ty + pad);   
    }

    //draw a graph of the average values for all observations, and cursor for current
    for (v of air.sensorValues)
    {
        let id = v[0];
        let aqi = v[1];
        let rgb = v[2];
        
        if (!rgb)
            rgb = [ 0, 0, 0 ];

        let maxHeight = CANVAS_HEIGHT/2;
        let x = CANVAS_WIDTH * i/(nValues - 1);
        let y = maxHeight * min(50 + aqi, 600)/600;

//        console.log(y + " " + rgb[0]);

        if (showGraph)
        {
//            console.log(y + " " + rgb[0]);
            stroke(rgb[0], rgb[1], rgb[2]);
            fill(rgb[0], rgb[1], rgb[2]); //colors based on precomputed AQI color
            rect(x, maxHeight * 2, CANVAS_WIDTH/(nValues - 1), -y);
        }

        i += 1;
    }

    if (air.sensorValues.length == 0)
    {
        let loadingColor = color(150, 150, 150);
        stroke(loadingColor);
        fill(loadingColor); //colors based on precomputed AQI color

        aqi = 20;

        let maxHeight = CANVAS_HEIGHT/2;
        let y = 5;

        for (let i = 0; i < air.nSensorsUpdated; i++)
        {
            let x = CANVAS_WIDTH * i/(nSensors - 1);
            rect(x, maxHeight * 2, CANVAS_WIDTH/(nSensors - 1), -y);
        }

        print(nSensors);
    }



}

function drawLiveClassic() 
{
    background(BACKGROUND_COLOR);

    let textString = "Preparing data...";

    noStroke();
    fill(255, 100);

    if (air.updatingSensors) //if updating, show percentage and progress bar
    {
        fraction = air.nSensorsUpdated/air.nSensors;
        rect(0, height * 0.8, width * fraction, height);
        textString = "Real-time air quality sensor data | " + (100 * fraction).toFixed(0) + "%";
    }
    else  //if not updating, show seconds since last update
    {
        rect(0, height * 0.8, width, height);

        if (lastUpdated >= 0 && air.updateInterval >= 0)
            textString = "Real-time air quality sensor data | " + ((millis() - lastUpdated)/1000).toFixed(0) + "s ago";
        else
            textString = "Air quality sensor data | " + timestampLive; 
    }

    fill(255);
    text(textString, textSize()/4, textSize() * 1.3);

    if (air.selected != undefined) //show additional info in bar when sensor is selected (clicked)
    {
        //draw a circle filled with the AQI color
        radius = 10;
        fill(air.selected[8]); 
        ellipse(radius, textSize() * 2.3, radius);

        //show additional text for the current sensor
        let info = "AQI " + air.selected[3] + "     " + air.selected[4] + String.fromCharCode(176) + "F     " + 
        //air.selected[5] + " " + air.selected[6] + " " + 
        air.selected[7] + 
        "     longitude " + air.selected[1].toFixed(4) + ", latitude " + air.selected[2].toFixed(4);
        
        fill(255);
        text(info, radius * 2.5 + textSize()/4, textSize() * 2.7);        
    }
}

function preloadTimeSeries()
{
    let params = getURLParams();

    let dataset = params['dataset'];
    let landmarks = params['landmarks'];

    console.log("dataset: " + dataset + ", landmarks: " + landmarks);

    if (DATASETS.includes(dataset))
    {
        let PATH = DATASET_PATH + dataset + "/";
        BINARY_INDEX = PATH + 'index.txt';
    }

    if (LANDMARKS.includes(landmarks))
        LANDMARKS_PATH = "data/" + landmarks + ".csv";

    locations = Features.preload();

    sensors = Observations.preload(SENSOR_INDEX_FILE);
    binaries = loadStrings(BINARY_INDEX);

    sensorsAggregate = Observations.preload(SENSOR_INDEX_AGGREGATE_FILE);
    binariesAggregate = loadStrings(BINARY_AGGREGATE_INDEX);
}

function setupTimeSeries()
{
    //Add specific locations to the locations table
    let show = 2;
    addLocation("LNU Lightning Complex Fires", -122.506, 38.549, show);
    addLocation("CZU Lightning Complex Fires", -122.223, 37.262, show);
    addLocation("SCU Lightning Complex Fires", -121.777, 37.882, show);

    //Attempt to parse URL parameters for start_date and end_date. If successful, load that interval, otherwise load default
	let params = getURLParams();		    
    let start_string = params['start_date'];
    let end_string = params['end_date'];
    let longitude = parseFloat(params['longitude']);
    let latitude = parseFloat(params['latitude']);
    let playParam = params['play'];
    autoplay = (playParam == undefined || playParam == "false") ? autoplay : true;

    console.log("autoplay: " + autoplay + " [" + playParam + "]");

    radius = parseFloat(params['radius']);    
    unit = params['unit'];

    if (radius && !isNaN(radius) && unit)
    {
        let conversion = (unit == 'km') ? 1 : KM_TO_MILES;
        print(unit + " " + conversion);
        document.getElementById("unit").value = conversion;
        radius *= conversion;
    }

    radius = isNaN(radius) ? DEFAULT_RADIUS : radius;

    distance = parseFloat(params['distance']);
    let location = params['location'];
    if (location == undefined && params['city'])
        location = params['city'];

    //did we start with valid location or longitude/latitude?
    let loadOnStart = !(location == undefined && (isNaN(longitude) || isNaN(latitude)));

    if (loadOnStart)
    {
        showDetails = true;
        location = location.replace(/\+/g, " ");
        location = location.replace(/\%20/g, " ");
        loadData(start_string, end_string, longitude, latitude, radius, distance, location);
    }
    else
    {
        showDetails = false;
        MAP_TARGET.location = undefined;
        updateForm(DEFAULT_LOCATION, START_DATE_STRING, END_DATE_STRING, radius);
        loadDataAggregate(START_DATE, END_DATE, longitude, latitude);
        locationLabels = Features.getBayAreaFeatures(FEATURE_COLLECTION_NAME_LANDMARKS, locations);
        Procedural.addOverlay(locationLabels);
        observations = observationsAggregate;
    }

    Procedural.onFeatureClicked = function (id) //clicking on a feature 
    {
        selectionTracking++;

        console.log("---------------------")
        console.log("[ Clicked " + id + " ]");

        //check if this is one of the sensors, expanded from the average 
        let separator = id.indexOf('#')
        if (separator >= 0)
            id = id.substring(0, separator)

        let isSensor = id.startsWith(SENSORS_NAME);
        let isAverage = id.startsWith(AVERAGE_NAME);

        if (isSensor || isAverage)
            id = int(id.substr(1, id.length)); //extract id (assuming single character)

        let isLandmark = isNaN(id);
        let locationName = undefined;

        if (isSensor)
        {
            let o = observations[current];
            let p; 

            if (o) //Ensure that an observation is loaded
            {
                p = o.observations[id]; //Ensure that this sensor exists 
                if (p)
                {
                    print(id + " " + p[0] + " " + p[1] + " " + p[2]);

                    //look up the ID for sensor metadata
                    let row = sensors.findRow(parseInt(id), "id");
                    console.log(row);        

                    ORBIT_AFTER_FOCUS = false;
                    //focusOn(p[1], p[2]);
                    return;
                }
            }

            console.log("Error: Could not find sensor " + id);
            return;
        }
        else if (isAverage)
        {
            return;
/*
            if (locations.rows[id])
                locationName = locations.rows[id].arr[0];
    
            if (!locationName)
                return;
            else    
                isLandmark = true;
*/       }
        else if (isLandmark)
        {
            locationName = id;
        }

//        if (MAP_TARGET.location == locationName)
        if (observationsVisible.indexOf(locationName) >= 0)
        {
            hideDetailSensorViewSpecific(locationName);
//            console.log("Already loaded")
            return;
        }

        showDetails = true;

        console.log("Loading : " + id);
/*            window.open('https://olwal.github.io/air/3d/?' +
            'start_date=' + START_DATE_STRING + 
            '&end_date=' + END_DATE_STRING + 
            '&radius=' + radius +
            '&distance=' + distance + 
            '&location=' + id, 
            "_self");
*/

        loadingText = locationName; 
        location = locationName;

        let formStartDate = document.getElementById("start_date").value;
        let formEndDate = document.getElementById("end_date").value;
        let formRadius = document.getElementById("radius").value;
        let formUnit = document.getElementById("unit").value;

        if (isValidDateRange(formStartDate, formEndDate))
        {
            START_DATE_STRING = formStartDate;
            END_DATE_STRING = formEndDate;
        }

        if (formRadius && formUnit)
            radius = formRadius * formUnit;

        for (o of observations) //cancel any on-going loading
            o.cancel();

        loadData(START_DATE_STRING, END_DATE_STRING, longitude, latitude, radius, distance, location);
    }

    textFont("Inter");

    timestamp = millis();

    addButtons();
}

function hideDetailSensorView()
{
    MAP_TARGET.location = undefined;
    observations = observationsAggregate;
    nLoaded = observations.length;
    nLoadedAggregate = observations.length;
    Procedural.removeOverlay(SENSORS_NAME);
    showDetails = false;
    setObservations(current);
    locationLabels = Features.getBayAreaFeatures(FEATURE_COLLECTION_NAME_LANDMARKS, locations);
    Procedural.addOverlay(locationLabels);
}

function hideDetailSensorViewSpecific(name)
{
    let index = observationsVisible.indexOf(name);
    if (index >= 0)
    {
        observationsVisible.splice(index, 1);
        Procedural.removeOverlay(name);
    
    
        if (observationsVisible.length == 0)
            showDetails = false;    
    
        showObservationsAggregate();
    }
}

function showObservationsAggregate()
{
    MAP_TARGET.location = undefined;
    observations = observationsAggregate;
    nLoaded = observations.length;
    nLoadedAggregate = observations.length;

    setObservations(current);
    locationLabels = Features.getBayAreaFeatures(FEATURE_COLLECTION_NAME_LANDMARKS, locations);
    Procedural.addOverlay(locationLabels);
}

function hideDetailSensorViewAll()
{
    for (o in observationsVisible)
    {
        Procedural.removeOverlay(observationsVisible[o]);
    }

    observationsVisible = [];
    showDetails = false;
    
    showObservationsAggregate();
}

function updateForm(location, start_date = undefined, end_date = undefined, radius = undefined)
{
    if (location)
        document.getElementById("location").value = location;
    
    if (start_date)
        document.getElementById("start_date").value = start_date;

    if (end_date)
        document.getElementById("end_date").value = end_date;
    
    if (radius)
    {
        let unit = float(document.getElementById("unit").value);
        document.getElementById("radius").value = Math.round(radius / unit);
    }
}

function addLocation(name, longitude, latitude, show)
{
    let row = locations.addRow();
    row.setString('name', name);
    row.setNum('longitude', longitude);
    row.setNum('latitude', latitude);
    row.setNum('show', show);
}

function getLocationFromTable(location, defaultLongitude = undefined, defaultLatitude = undefined)
{
    let longitude = defaultLongitude;
    let latitude = defaultLatitude; 

    let found = false; //default = no match found

    //if location was specified, try to match it in location table
    if (location != undefined)
    {
        location = location.replace(/%20/g, " "); //replace %20 characters from URL
        location = location.replace(/\+/g, " "); //replace + characters from URL
        let rows = locations.findRows(location, "name"); //look up all matches
        let row = undefined;

        for (r of rows)
        {
            if (r.get("name") == location) //make sure that the whole string matches
            {
                row = r;
                break;
            }
        }

        //if exact match succeeded, set long/lat (overwriting potential URL parameters)
        if (row != undefined) 
        {
            latitude = parseFloat(row.get("latitude"));
            longitude = parseFloat(row.get("longitude"));
            found = true;
        }
    }

    return [ longitude, latitude, found ];
}

function loadData(start_string, end_string, longitude, latitude, _radius, distance, location, doFocus = false, loadLocation = false)
{
    showDetails = true;
    observationsVisible.push(location);

    let msCurrent = false;
    if (observations && observations[current])
    {
        currentDate = observations[current].filename.slice(-17, -7); //save current observation
        msCurrent = Date.parse(currentDate); //to be used when loading data
        msCurrent += int(observations[current].hour_string * 60 * 1000);
    }

    //if parameters changed reload
    reloadNeeded = start_string != START_DATE_STRING || end_string != END_DATE_STRING ||
        _radius != radius || loadLocation;

    if (reloadNeeded)
    {
        observations = [];
        observationsAggregate = [];
        observationsCache = {};
    }

    radius = _radius;

    if (isValidDateRange(start_string, end_string))
    {
        let start = new Date(start_string);
        let end = new Date(end_string);    
    
        START_DATE = start.getTime();
        END_DATE = end.getTime();          
        START_DATE_STRING = start_string;
        END_DATE_STRING = end_string;
    }

    let longlat = getLocationFromTable(location, longitude, latitude);
    longitude = longlat[0];
    latitude = longlat[1];
    let found = longlat[2]; //indicates whether location match was found

    if (found && !reloadNeeded)
    {
        MAP_TARGET.longitude = longitude; 
        MAP_TARGET.latitude = latitude; 
        MAP_TARGET.location = location;    

        let oCached = observationsCache[location];
        if (oCached)
        {
            print("loaded from cache");
            observations = oCached;
            nLoaded = observations.length;
            nLoadedAggregate = observations.length;
            setObservations(current);
            updateForm(location);
            locationLabels = Features.getBayAreaFeatures(FEATURE_COLLECTION_NAME_LANDMARKS, locations, location)
            Procedural.addOverlay(locationLabels);

            if (doFocus)
                focusOn(MAP_TARGET);

            return;
        }
        else
        {
            observations = [];
            console.log(location + " not found in cache, loading data");
        }
    }

//    current = 0;
    nLoaded = 0;
    nLoadedAggregate = 0;

    //check if URL parameters were valid, otherwise use default value
    longitude = isNaN(longitude) ? DEFAULT_LONGITUDE : longitude;
    latitude = isNaN(latitude) ? DEFAULT_LATITUDE : latitude;
    
    //if no location was specified, but long/lat was, then add them to the table, 
    //to generate a label that can be shown
    if (location == undefined)  
    {
        location = longitude.toFixed(2) + ", " + latitude.toFixed(2);
        addLocation(location, longitude, latitude, 2);
    }

    loadingText = location;   

    distance = isNaN(distance) ? DEFAULT_DISTANCE : distance;

    /*
    console.log("date start: " + START_DATE_STRING);
    console.log("date end: " + END_DATE_STRING);    
    console.log("longitude: " + longitude);
    console.log("latitude: " + latitude);
    console.log("radius: " + radius);
    console.log("distance: " + distance);
    */
    console.log("location: " + location + ", # of files to load: " + binaries.length);

    MAP_TARGET.longitude = longitude; //-122.44198789673219;
    MAP_TARGET.latitude = latitude; //37.7591527514897;
    MAP_TARGET.distance = distance; //20000;    
    MAP_TARGET.location = location;    

    updateForm(location, START_DATE_STRING, END_DATE_STRING, radius);

    if (doFocus)
        initialized = false;

    if (initialized)
    {
        MAP_TARGET.longitude = longitude;
        MAP_TARGET.latitude = latitude;    
        //Procedural.focusOnLocation(MAP_TARGET);
    }

    locationLabels = Features.getBayAreaFeatures(FEATURE_COLLECTION_NAME_LANDMARKS, locations, location)
    Procedural.addOverlay(locationLabels);

    window.setTimeout(
        function()
        {
            let count = 0;

            for (b of binaries) //b is the filename (e.g., "2020-12-13_00.bin")
            {
                let ms = Date.parse(b.slice(0, -7)); //extracts date portion and converts to UTC milliseconds

                if (ms < START_DATE || ms > END_DATE || b.length == 0) //skips this file if it is too early or too late
                    continue;

                if (msCurrent)
                {
                    ms = ms + b.slice(-6, -4) * 60 * 1000; //add # of hours in ms
                    let msDiff = ms - msCurrent; 
                    let dayDiff = msDiff / MS_TO_DAYS;
                    let dayRange = (END_DATE - START_DATE)/MS_TO_DAYS;

                    if (dayDiff >= 0)
                        count = 10 * dayDiff;
                    else
                        count = 10 * (dayRange + dayRange + dayDiff);
                }
                else
                    count += 10;

                let data = BINARY_DATA_PATH + b; //complete path for file to load                                      

                let o = new Observations(location, longitude, latitude, radius); //create a new Observations object, which will load and preprocess the data and overlays
                o.FEATURE_WIDTH = 1;

                window.setTimeout(
                        function()
                        {
                            o.load(data, sensors, 
                                function(observation)
                                {
                    //                console.log('Loaded ' + observation.filename + " " + observation.count + " sensors (" + observation.errors + " errors, " + observation.notInIndex + ")");
                                    nLoaded++; //keep track of # of loaded Observations

                                    if (nLoaded == 1)
                                    {
                                        if (!initialized)
                                        {
                                            //Procedural.displayLocation(MAP_TARGET);
                                            focusOn(MAP_TARGET, loadLocation);
                                        }
                                       setObservation(current, observations);
                                    }

                                    isLoadedComplete();
                                }    
                            );
                        }, count);

                observations.push(o); //add each Observation object 
            }
        }, 100
    );

    if (!reloadNeeded) //no need to reload averages if main parameters didn't change
        return;

    loadDataAggregate(START_DATE, END_DATE, longitude, latitude)
}

function loadDataAggregate(start_date, end_date, longitude, latitude)
{
    window.setTimeout(
        function()
        {
            let count = 0;

            for (b of binariesAggregate) //b is the filename (e.g., "2020-12-13_00.bin")
            {
                let ms = Date.parse(b.slice(0, -7)); //extracts date portion and converts to UTC milliseconds

                if (ms < start_date || ms > end_date || b.length == 0) //skips this file if it is too early or too late
                    continue;

                count += 15;

                let data = BINARY_AGGREGATE_DATA_PATH + b; //complete path for file to load   
                
                let o = new Observations(AVERAGE_NAME, longitude, latitude); //create a new Observations object, which will load and preprocess the data and overlays
                o.FEATURE_WIDTH = 4;                        

                window.setTimeout(
                        function()
                        {
                            o.load(data, sensorsAggregate, 
                                function(observation)
                                {
                                    nLoadedAggregate++; //keep track of # of loaded Observations
                                    isLoadedComplete();
                                }    
                            );
                        }, count); //(count / 100) * 1000);

                observationsAggregate.push(o); //add each Observation object 
            }
        }, 100
    );
}

function isLoadedComplete()
{
    if ((!showDetails || nLoaded == observations.length) &&
        (!reloadNeeded || nLoadedAggregate == observationsAggregate.length))
    {
        setObservations(current);

        if (!initialized)
        {
            initialized = true;
            focusOn(MAP_TARGET);
            if (autoplay)
                setPlay(true);
        }

        print(MAP_TARGET.location + " -> cache");
        observationsCache[MAP_TARGET.location] = observations;        
    }    
}

function focusOn(target, loadLocation = false)
{
    if (proceduralLocation)
    {
        target.distance = proceduralLocation.distance;
        target.bearing = proceduralLocation.bearing;
        target.angle = proceduralLocation.angle;
    }

    if (loadLocation)
    {
        target.distance = 5000;
        Procedural.displayLocation(target);
    }

    Procedural.focusOnLocation(target);
}

function cancelLoading()
{
    for (o of observations)
        o.cancel();

    for (o of observationsAggregate)
        o.cancel();
}

function keyPressed() //handle keyboard presses
{
    let delta = 1;

    switch (keyCode)
    {        
        //stop loading observations
        case ESCAPE:
            cancelLoading();
            break;

        case ENTER: 
        case RETURN:
            Procedural.orbitTarget(); //orbit around the current location
            return; 
    }

    switch (key) 
    {
        case 'p':
        case ' ': //play/pause
            togglePlay();
            break;

        case 'o':
            Procedural.orbitTarget(); //orbit around the current location
            break;

        //previous observation
        case '{': 
        case 'N': 
        case '<':   
            delta = 10;
        case '[': 
        case 'n': 
        case ',': 
            changeObservation(-delta);
            return false;

        //next observation
        case '}': 
        case '>': 
        case 'M': 
            delta = 10;
        case ']': 
        case '.': 
        case 'm': 
            changeObservation(delta);
            return false;

        case 'l':
            showLabels = !showLabels; 
            if (showLabels)
                Procedural.addOverlay(locationLabels);
            else
                Procedural.removeOverlay(FEATURE_COLLECTION_NAME_LANDMARKS);

        case 'x': 
            UPDATE_MS /= UPDATE_MULTIPLIER;
            console.log(UPDATE_MS);            
            break;

        case 'X': 
            UPDATE_MS *= UPDATE_MULTIPLIER;     
            console.log(UPDATE_MS);            
            break;

        case 's':
            Procedural.autoRotateSpeed += 1;
            console.log(Procedural.autoRotateSpeed);
            break;

        case 'h':
            showHelp = !showHelp;
            break; 

        case 't':       
            GL_ENVIRONMENT.parameters.inclination = GL_ENVIRONMENT.parameters.inclination + 0.1;
            print(GL_ENVIRONMENT);
            Procedural.setEnvironment(GL_ENVIRONMENT);
            break; 
    

        case 'g':
            showGraph = !showGraph;
            break; 

        case 'e':
            Procedural.environmentEditor();
            break; 
                
        case 'r': //rewind to beginning
            current = 0;    
            break;

        case 'c': //show/hide controls
            showControls = !showControls;
            enableControls(showControls);
            break;

        case 'O': //toggle whether a focus will trigger an immediate orbit to start
            ORBIT_AFTER_FOCUS = !ORBIT_AFTER_FOCUS;
            break;

        case 'f': //focus on default location
            focusOn(MAP_TARGET);
            break;

        case 'u': //focus on default location
            focusOn(MAP_TARGET_0);
            break;            
    }
}

function drawTimeSeries()
{
    background(BACKGROUND_COLOR);

    let i = 0;

    let deltaT = millis() - timestamp;

    //update timestamp and advance observation if playing
    if (deltaT > UPDATE_MS)
    {
        if (play)
            changeObservation();

        timestamp = millis();
    }

    //draw month names for the first and last observations, as well as all months that start inbetween
    fill(125);
    textSize(CANVAS_HEIGHT/10);
    for (let j = 0; j < observations.length; j++)
    {       
        let oj = observations[j];

        let first = j == 0;
        let last = j == observations.length - 1;

        if (first || last || (oj.day_string == "01" && oj.hour_string == "00"))
        {
            let x = CANVAS_WIDTH * j/(observations.length - 1);        
            
            line(x, CANVAS_HEIGHT, x, 2/3 * CANVAS_HEIGHT); //line to connect graph to month name
            
            if (first) // month + day
            {
                textAlign(LEFT, TOP); //left-centered and (x + 5) to not get cut off at left edge
                if (oj.month_text != undefined && oj.day_string != undefined)
                    text(oj.month_text + " " + oj.day_string, x + 5, CANVAS_HEIGHT/2);
            }
            else if (last) // month + day
            {
                textAlign(RIGHT, TOP); //right-centered and (x - 5) to not get cut off at right edge
                if (oj.month_text != undefined && oj.day_string != undefined)
                    text(oj.month_text + " " + oj.day_string, x - 5, CANVAS_HEIGHT/2);
            }
            else // month
            {
                textAlign(CENTER, TOP); //centered
                if (oj.month_text != undefined)
                    text(oj.month_text, x, CANVAS_HEIGHT/2);                       
            }
        }
    }

/*
    if (showHelp)
    {
        textSize(CANVAS_HEIGHT/6);
        textAlign(RIGHT)
        //text("[P]LAY/PAUSE   [O]RBIT   [F]OCUS   [L]ABELS   olwal.com | 2021 | 00.02 ", CANVAS_WIDTH, CANVAS_HEIGHT/10 );
        text("[P]LAY/PAUSE   [O]RBIT  <" + mouseX + "," + mouseY + "> DPR: " + window.devicePixelRatio.toFixed(2) + "   ", CANVAS_WIDTH, CANVAS_HEIGHT/10);
    }
*/
    //draw a graph of the average values for all observations, and cursor for current
    for (o of observations)
    {
        let maxHeight = CANVAS_HEIGHT/2;
        let x = CANVAS_WIDTH * i/(observations.length - 1);
        let y = maxHeight * min(50 + o.aqiAverage, 600)/600;
        let cursorWidth = CANVAS_WIDTH/(observations.length - 1);

        if (showGraph)
        {
            if (o.rgb[0] == 0 && o.rgb[1] == 0 && o.rgb[2] == 0) //not loaded yet, use background instead of black
            {
                stroke(BACKGROUND_COLOR);
                fill(BACKGROUND_COLOR);
            }
            else
            {
                stroke(o.rgb[0], o.rgb[1], o.rgb[2]); //colors based on precomputed AQI color
                fill(o.rgb[0], o.rgb[1], o.rgb[2]); 
            }
            rect(x, maxHeight * 2, cursorWidth, -y);
        }

        if (false && i == current) //cursor for current value
        {
//           stroke(200, 100);
           stroke(o.rgb[0], o.rgb[1], o.rgb[2]);
           strokeWeight(5);
           noFill();
            line(x + cursorWidth/2, maxHeight, x + cursorWidth/2, maxHeight * 2);
 //           noStroke();
//            fill(255, 200);
 //           rect(x, maxHeight * 2, cursorWidth, -maxHeight);
        }

        if (i == current) //cursor for current value
        {
           stroke(200, 100);
           line(x + cursorWidth/2, maxHeight, x + cursorWidth/2, maxHeight * 2);
           noStroke();
           fill(o.rgb[0], o.rgb[1], o.rgb[2]);
           ellipse(x + cursorWidth/2, maxHeight, maxHeight/5);           
        }



        i += 1;
    }
    strokeWeight(1);
    noStroke();

    if (showHelp)
    {
        fill(255);
        let ts = CANVAS_HEIGHT/7;
        let tdy = ts * 1.2;
        let tx = ts * 5;
        let ty = 0;
        textSize(ts);
        textAlign(LEFT)
        text("p PLAY/PAUSE   r REWIND   x SPEED UP   X SLOW DOWN        (DPR: " + window.devicePixelRatio + ")", tx, ty += tdy);
        text("[ n , STEP -1X <-                   ] m . STEP +1X ->", tx, ty += tdy);
        text("{ N < STEP -10X <---             } M > STEP +10X --->", tx, ty += tdy);

        text("o ORBIT   l LABELS   g GRAPH   f FOCUS ON FEATURE", tx, ty += tdy);      

        fill(0, 100);
        rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        return;
    }

    fill(255);

    let ts = CANVAS_HEIGHT/4; //text size 25% of canvas height
    let ty = CANVAS_HEIGHT/6; //text position close to top
    let centerX = CANVAS_WIDTH/2; //text centered
    textSize(ts);
    textAlign(LEFT, CENTER);
    let dw = textWidth("DEC 30"); //use a representative long date, since we want a stable offset (otherwise will be jittering)
    fill(255);
    let pad = 10;

    let n = showDetails ? nLoaded : nLoadedAggregate;

    if (n < observations.length) //show progress information, if not loaded yet
    {
        let ts = CANVAS_HEIGHT/6; //smaller font size to fit two lines
        textSize(ts);
    
        textAlign(CENTER, CENTER);        
        //Percentage of loaded observations
        text(loadingText + " " + (100 * n/observations.length).toFixed() + "%", centerX, ty);
        //Second line that shows the time span to load        
        textSize(ts * 0.75);
        fill(150);
        text(START_DATE_STRING + " to " + END_DATE_STRING, centerX, ts * 1.1 + ty);

        return;
    }

    if (current >= observations.length)
        return;

    let oc = observations[current]; //get current observation

    if (!oc)
        return;

    if (!oc.date_string)
        return;

    //display the current date in center
    text(oc.date_string, centerX - dw/2, ty + pad);

    //smaller text for year and time
    textSize(ts * 2/3);

    //hour, left-centered to the right
    textAlign(LEFT, CENTER);
    fill(200);
//    text(oc.hour_string + ":00", centerX + dw/2 + pad, ty + pad);    

    push();
        translate(centerX + dw/2 + 3 * pad, ty + pad);

        let r = pad * 3;

        let hours = int(oc.hour_string);
        let minutes = 0;
        
        if (play && UPDATE_MS < 400 && UPDATE_MS > 300) //if running and inbetween values, interpolate minutes
            minutes = 60 * (deltaT / UPDATE_MS);

        let pm = hours >= 12;

        let h = (hours + 20) % 24;
        let v = Math.sin(2 * PI * h/24);
        //let c = color(v * 150 + 100, v * 250 + 5, 0);
        let c = color(v * 50 + 150);
        drawAnalogTime(r, hours, minutes, undefined, c, c, c);
        
        noStroke();
        fill(c);
        text(pm ? "PM" : "AM", r * 1.1, 0);
/*
        GL_ENVIRONMENT.parameters.inclination = 0.75 + v * 0.25;
        print(GL_ENVIRONMENT.parameters.inclination);
        Procedural.setEnvironment(GL_ENVIRONMENT);
*/
    pop();
    
    if (oc.count && !showHelp)
    {
        textSize(CANVAS_HEIGHT/10);
    //    text(oc.count + " sensor" + (oc.count == 1 ? "" : "s"), centerX + dw + 4 * pad, ty + pad);    
        textAlign(RIGHT)
        text(loadingText, CANVAS_WIDTH - pad/2, CANVAS_HEIGHT/10 + pad);
//        text(oc.count + " sensor" + (oc.count == 1 ? "" : "s") + " (" + radius/1000 + " km)", CANVAS_WIDTH - pad/2, 2.2 * CANVAS_HEIGHT/10 + pad);    
        text(oc.count + " sensor" + (oc.count == 1 ? "" : "s"), CANVAS_WIDTH - pad/2, 2.2 * CANVAS_HEIGHT/10 + pad);    
    }

    textSize(ts * 2/3);
    textAlign(LEFT);
    //year, right-centered to the left
    let yw = textWidth("2020");
    text(oc.year_string, centerX - dw/2 - yw - pad * 2, ty + pad);    


}

function setObservation(index, observations) //set current observation
{
    index = index.toFixed() % observations.length;

    if (!isNaN(index) && index >= 0 && index < observations.length)
    {
        current = index;

        let json;
    
        if ((observations == observationsAggregate) && showDetails)
            json = observations[current].jsonInactive;
        else
            json = observations[current].json;
        
        if (!json)
        {
            // console.log("setObservation(index): broken json: " + current);
            return;
        }
        
        try
        {
            Procedural.addOverlay(json);
        }
        catch (err)
        {
            console.log(err);
        }
    }
}

function setObservations(index) //set current observation
{
//    setObservation(index, observations);

    for (visible in observationsVisible)
    {
        let location = observationsVisible[visible]
        if (observationsCache[location])
            setObservation(index, observationsCache[location]);
    }

    setObservation(index, observationsAggregate);
}

function changeObservation(delta = 1) //change observations with +/- delta
{
    setObservations(current + delta + observations.length);
}

function getObservation(x) //get observation for a given X value
{
    let c = (observations.length - 1) * mouseX/CANVAS_WIDTH;

    if (c >= 0 && c < observations.length)
    {
        c = round(c);
        return c;
    }
    else
        return -1;
}

function enableControls(show)
{
    //User interface controls
    Procedural.setCameraModeControlVisible(show);
    Procedural.setRotationControlVisible(show);
    Procedural.setZoomControlVisible(show);
    Procedural.setUserLocationControlVisible(show);

    Procedural.setCompassVisible(false);
}

function setObservationFromX(x) //set observation given X value (e.g, from mouse/touch)
{
    let c = getObservation(x);
    
    if (c >= 0)
        setObservations(c);    
}

function mousePressed() //update observation based on timeline click
{
    selectionTracking = -10;

    if (mouseY > displayHeight * 0.73 + CANVAS_HEIGHT)
    {
        print("form");
    } 
    else if (mouseY > CANVAS_HEIGHT/2 && mouseY < CANVAS_HEIGHT)
    {
        setObservationFromX(mouseX);
        return;
    }
    else if (showDetails && mouseButton == LEFT)
    {
        print("reset...");
        selectionTracking = 0;
    }
}


function mouseReleased() //update observation based on timeline click
{
    if (mouseY > CANVAS_HEIGHT && (mouseY < displayHeight * 0.73 + CANVAS_HEIGHT))
    {
        print(mouseY + " " + displayHeight * 0.73 + CANVAS_HEIGHT);

        if (selectionTracking == 0)
            hideDetailSensorViewAll();
    }

    if (mouseY > CANVAS_HEIGHT/2 && mouseY < CANVAS_HEIGHT)
    {
        return true;
    }

    return true;
}


function mouseDragged() //update observation based on timeline drag
{
    selectionTracking = -10;

    if (mouseY < CANVAS_HEIGHT/2 || mouseY > CANVAS_HEIGHT)
        return;

    setObservationFromX(mouseX);
}

function mouseWheel(event) //update observation based on scroll events
{
    if (mouseY < CANVAS_HEIGHT/2 || mouseY > CANVAS_HEIGHT)
        return;

    changeObservation(event.delta);
}

function windowResized() //adjust canvas size when window is resized
{
    resizeCanvas(windowWidth, CANVAS_HEIGHT);
    CANVAS_WIDTH = windowWidth;
}

function isValidDate(d)  //check if data is valid
{
    return d instanceof Date && !isNaN(d);
}

function isValidDateRange(start_string, end_string)
{
    let start = new Date(start_string);
    let end = new Date(end_string);    

    return (isValidDate(start) && isValidDate(end) && 
        start.getTime() >= Date.parse(DATASET_START_DATE) && end.getTime() <= Date.parse(DATASET_END_DATE) && 
        start < end);
}

function togglePlay()
{
    setPlay(!play);
}

function setPlay(state)
{
    play = state;
    if (play)
    {
        buttons['play'].hide();
        buttons['pause'].show();
    }
    else
    {
        buttons['pause'].hide();
        buttons['play'].show();
    }
}

function addButtons()
{
    let w = 24;
    let h = 24;
    let n = 4;

    let offsetX = 0; //CANVAS_WIDTH - n * w * 1.1;
    let x = offsetX + 5; 
    let y = 7;

    //Fixed white SVG fill with https://vectorpaint.yaks.co.nz/
    let button = createImg('data/images/play_arrow-24px_white.svg', 'Play');
    button.size(w, h);
    button.position(x, y);
    button.mousePressed(togglePlay);
    buttons['play'] = button;

    button = createImg('data/images/pause-24px_white.svg', 'Pause');
    button.size(w, h);
    button.position(x, y);    
    button.mousePressed(togglePlay);

    button.hide();
    buttons['pause'] = button;

/*
    x += w * 1.1;


    button = createButton('ORBIT');
    button.size(w, h);
    button.position(x, y);
    button.mousePressed(
        function() {
            Procedural.orbitTarget(); 
        }
    );*/
}