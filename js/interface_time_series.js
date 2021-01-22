/*
    Alex Olwal, 2020, www.olwal.com

    Application for 3D visualization, playback and interaction with time series sensor data overlaid on geo maps.

    Externally defined constants/global variables in config.js
*/

var CANVAS_WIDTH = window.innerWidth; //borderless width
const CONTAINER_P5 = document.getElementById(DIV_P5);

const SENSOR_INDEX = SENSOR_INDEX_FILE;
let PATH = BINARY_DATA_PATH;
let BINARY_INDEX = PATH + 'index.txt';
const LABELS_NAME = FEATURE_COLLECTION_NAME_LANDMARKS;
let binaries;
let binariesAggregate;

let locations; //location data for labels
let sensors; //sensor index
let sensorsAggregate; 

let observations = [];
let observationsAggregate = [];
let current = 0;
let nLoaded = 0;
let nLoadedAggregate = 0;
let loadingText = "Loaded";
let radius = DEFAULT_RADIUS;
let distance = DEFAULT_DISTANCE;
let initialized = false;
let autoplay = true;

let timestamp; //keep track of time for animation
let UPDATE_MS = 100; //inter-frame delay 

let play = false;
let buttons = {};

//Time intervals to load data, either these as default, or from urlParameters (start_date and end_date)
let START_DATE_STRING = "2020-09-08";
let END_DATE_STRING = "2020-09-10";
let START_DATE = Date.parse(START_DATE_STRING);
let END_DATE = Date.parse(END_DATE_STRING);
let DEFAULT_LOCATION = "San Francisco";

let locationLabels = undefined;

let showLabels = true;
let showHelp = false;
let showGraph = true;
let showControls = SHOW_CONTROLS;

let focusOnClick = false;

showLive = false;
let lastUpdated = -1;
let timestampLive;

let SENSORS_NAME = "$";
let AVERAGE_NAME = "%";

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

let air;

function preloadLive() 
{
    air = new ObservationsRemote();
    air.preload();
    locations = Features.preload();
}

function digit(number)
{
    return ('0' + number).slice(-2);
}

function setupLive() 
{
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

    //callback for receiving updated sensor data
    air.onUpdateCallback = function(sensors) 
    {       
        if (!self.initialized) //first update
        {
            timestampLive = year() + " " + digit(month()) + " " + digit(day()) + " "  + digit(hour()) + ":"  + digit(minute()); //zero-padded YYYY-MM-DD hh:mm

            Procedural.focusOnLocation(MAP_TARGET); //focus on target position, which will also trigger a camera adjustment

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
        // let o = Features.buildFromData(callbackData, FEATURE_COLLECTION_NAME);
        let o = Observations.getFeaturesJson(self.observations, FEATURE_OPACITY);
        Procedural.addOverlay(o);

        lastUpdated = millis();
    }
}

function drawLive() 
{
    background(BACKGROUND_COLOR);

    let textString = "Preparing data...";
    let i = 0;
    let keys = Object.keys(air.observations);

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

    if (air.updatingSensors) //if updating, show percentage and progress bar
    {
        fraction = air.nSensorsUpdated/air.nSensors;
        let ts = CANVAS_HEIGHT/6; //smaller font size to fit two lines
        textSize(ts);
    
        textAlign(CENTER, CENTER);        
        //Percentage of loaded observations
        text(loadingText + " " + (100 * fraction).toFixed() + "%", centerX, ty);

    }
    else  //if not updating, show seconds since last update
    {
        if (lastUpdated >= 0 && air.updateInterval >= 0)
            textString = ((millis() - lastUpdated)/1000).toFixed(0) + "s ago";
        else
            textString = timestampLive.slice(-5); //get hours + minutes

        //display current date
        let month = int(timestampLive.slice(5, 7))
        let date_string = Observations.getMonth(month) + " " + timestampLive.slice(7, 10)
        text(date_string, centerX - dw/2, ty + pad);

        //smaller text for year and time
        textSize(ts * 2/3);

        //hour, left-centered to the right
        textAlign(LEFT, CENTER);
        fill(200);
        text(textString, centerX + dw/2 + pad, ty + pad);    
        
        textAlign(RIGHT)
        text(keys.length + " sensor" + (keys.length == 1 ? "" : "s"), CANVAS_WIDTH - pad, CANVAS_HEIGHT/10 + pad);

        let year_string = timestampLive.slice(0, 4);

        textAlign(LEFT);
        //year, right-centered to the left
        let yw = textWidth(year_string);
        text(year_string, centerX - dw/2 - yw - pad * 2, ty + pad);   
    }

    //draw a graph of the average values for all observations, and cursor for current
    for (id of keys)
    {
        let aqi = air.observations[id][0];
        let rgb = air.observations[id][3];
        if (!rgb)
            rgb = [ 0, 0, 0 ];

        let maxHeight = CANVAS_HEIGHT/2;
        let x = CANVAS_WIDTH * i/(keys.length - 1);
        let y = maxHeight * min(aqi, 600)/600;

        if (showGraph)
        {
            noStroke();
            fill(rgb[0], rgb[1], rgb[2]); //colors based on precomputed AQI color
            rect(x, maxHeight * 2, CANVAS_WIDTH/(keys.length - 1), -y);
        }

        i += 1;
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
        PATH = DATASET_PATH + dataset + "/";
        BINARY_INDEX = PATH + 'index.txt';
    }

    if (LANDMARKS.includes(landmarks))
        LANDMARKS_PATH = "data/" + landmarks + ".csv";

    locations = Features.preload();

    sensors = Observations.preload(SENSOR_INDEX);
    binaries = loadStrings(BINARY_INDEX);

    sensorsAggregate = Observations.preload('data/sensors/california_cities_selected_ids.csv');
    binariesAggregate = loadStrings('data/binary_averages/bay_area_selected/index.txt');
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
    radius = isNaN(radius) ? DEFAULT_RADIUS : radius;

    distance = parseFloat(params['distance']);
    let location = params['location'];
    if (location == undefined && params['city'])
        location = params['city'];

    if (location == undefined && (isNaN(longitude) || isNaN(latitude)))
        location = DEFAULT_LOCATION;

    loadData(start_string, end_string, longitude, latitude, radius, distance, location);

    Procedural.onFeatureClicked = function (id) //clicking on a feature 
    {

        console.log("---------------------")
        console.log("[ Clicked " + id + " ]");

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
            if (locations.rows[id])
                locationName = locations.rows[id].arr[0];
    
            if (!locationName)
                return;
            else    
                isLandmark = true;
        }
        else if (isLandmark)
        {
            locationName = id;
        }

        if (location == locationName)
        {
            console.log("Already loaded")
            return;
        }

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

        for (o of observations) //cancel any on-going loading
            o.cancel();

        loadData(START_DATE_STRING, END_DATE_STRING, longitude, latitude, radius, distance, location);
    }

    textFont("Inter");

    timestamp = millis();

    addButtons();
}

function addLocation(name, longitude, latitude, show)
{
    let row = locations.addRow();
    row.setString('name', name);
    row.setNum('longitude', longitude);
    row.setNum('latitude', latitude);
    row.setNum('show', show);
}

function loadData(start_string, end_string, longitude, latitude, _radius, distance, location, doFocus = false)
{
    observations = [];
    observationsAggregate = [];

    current = 0;
    nLoaded = 0;
    nLoadedAggregate = 0;

    radius = _radius;

    let start = new Date(start_string);
    let end = new Date(end_string);    

    if (isValidDate(start) && isValidDate(end))
    {
        if (start.getTime() >= Date.parse("2020-01-01") && end.getTime() <= Date.parse("2021-01-01"))
        {
            START_DATE = start.getTime();
            END_DATE = end.getTime();          
            START_DATE_STRING = start_string;
            END_DATE_STRING = end_string;
        }
    }

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
        }
    }

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

    locationLabels = Features.getBayAreaFeatures(FEATURE_COLLECTION_NAME_LANDMARKS, locations, location)
    Procedural.addOverlay(locationLabels);

    loadingText = location;   

    distance = isNaN(distance) ? DEFAULT_DISTANCE : distance;

    console.log("date start: " + START_DATE_STRING);
    console.log("date end: " + END_DATE_STRING);    
    console.log("longitude: " + longitude);
    console.log("latitude: " + latitude);
    console.log("radius: " + radius);
    console.log("distance: " + distance);
    console.log("location: " + location);
    console.log("# of files to load: " + binaries.length);

    //set the map target to San Francisco
    MAP_TARGET.longitude = longitude; //-122.44198789673219;
    MAP_TARGET.latitude = latitude; //37.7591527514897;
    MAP_TARGET.distance = distance; //20000;    

    document.getElementById("location").value = location;
    document.getElementById("start_date").value = START_DATE_STRING;
    document.getElementById("end_date").value = END_DATE_STRING;
    document.getElementById("radius").value = radius;

    let count = 0;

    if (doFocus)
        initialized = false;

    if (initialized)
    {
        MAP_TARGET.longitude = longitude;
        MAP_TARGET.latitude = latitude;    
        //Procedural.focusOnLocation(MAP_TARGET);
    }

    window.setTimeout(
        function()
        {
            for (b of binaries) //b is the filename (e.g., "2020-12-13_00.bin")
            {
                let ms = Date.parse(b.slice(0, -7)); //extracts date portion and converts to UTC milliseconds

                if (ms < START_DATE || ms > END_DATE || b.length == 0) //skips this file if it is too early or too late
                    continue;

                count += 1;

                let data = PATH + b; //complete path for file to load                                      

                let o = new Observations(SENSORS_NAME, longitude, latitude, radius); //create a new Observations object, which will load and preprocess the data and overlays
                o.FEATURE_WIDTH = 1;

                let i = count;

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
                                            Procedural.focusOnLocation(MAP_TARGET);                                          
                                       setObservation(0, observations);
                                    }

                                    if (!initialized && nLoaded == observations.length && 
                                        nLoadedAggregate == observationsAggregate.length) //when completed, foucs on the desired map target
                                    {
                                        setObservations(0);
                                        initialized = true;
                                        
                                        if (autoplay)
                                            setPlay(true);
                                    }    
                                }    
                            );
                        }, count * 10); //(count / 100) * 1000);

                observations.push(o); //add each Observation object 
            }
        }, 100
    );

    window.setTimeout(
        function()
        {
            for (b of binariesAggregate) //b is the filename (e.g., "2020-12-13_00.bin")
            {
                let ms = Date.parse(b.slice(0, -7)); //extracts date portion and converts to UTC milliseconds

                if (ms < START_DATE || ms > END_DATE || b.length == 0) //skips this file if it is too early or too late
                    continue;

                count += 1;

                let PATH = 'data/binary_averages/bay_area_selected/';

                let data = PATH + b; //complete path for file to load   
                
                let o = new Observations(AVERAGE_NAME, longitude, latitude); //create a new Observations object, which will load and preprocess the data and overlays
                o.FEATURE_WIDTH = 4;
                
                let i = count;

                window.setTimeout(
                        function()
                        {
                            o.load(data, sensorsAggregate, 
                                function(observation)
                                {
                                    nLoadedAggregate++; //keep track of # of loaded Observations

                                    if (!initialized && nLoaded == observations.length && 
                                        nLoadedAggregate == observationsAggregate.length) //when completed, foucs on the desired map target
                                    {
                                        setObservations(0);
                                        initialized = true;
                                        
                                        if (autoplay)
                                            setPlay(true);
                                    }    

                                }    
                            );
                        }, count * 10); //(count / 100) * 1000);

                observationsAggregate.push(o); //add each Observation object 
            }
        }, 100
    );


}

function focusOn(longitude, latitude)
{
    /*
    let target = {
        latitude: latitude, longitude: longitude,
        distance: distance,
        angle: 35, bearing: 70,
        animationDuration: 2
    };    */

    let target = MAP_TARGET;
    target.longitude = longitude;
    target.latitude = latitude;

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

        //next observation
        case '{': 
        case 'N': 
        case '<':   
            delta = 10;
        case '[': 
        case 'n': 
        case ',': 
            changeObservation(-delta);
            return false;

        //previous observation
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
            UPDATE_MS /= 2;
            break;

        case 'X': 
            UPDATE_MS *= 2;     
            break;

        case 's':
            Procedural.autoRotateSpeed += 1;
            console.log(Procedural.autoRotateSpeed);
            break;

        case 'h':
            showHelp = !showHelp;
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
            Procedural.focusOnLocation(MAP_TARGET);
            break;

        case 'u': //focus on default location
            ORBIT_AFTER_FOCUS = false;
            console.log(MAP_TARGET_0);
            Procedural.focusOnLocation(MAP_TARGET_0);
            break;            
    }
}

function drawTimeSeries()
{
    background(BACKGROUND_COLOR);

    let i = 0;

    //draw month names for the first and last observations, as well as all months that start inbetween
    stroke(125);
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

    if (showHelp)
    {
        textSize(CANVAS_HEIGHT/6);
        textAlign(RIGHT)
        //text("[P]LAY/PAUSE   [O]RBIT   [F]OCUS   [L]ABELS   olwal.com | 2021 | 00.02 ", CANVAS_WIDTH, CANVAS_HEIGHT/10 );
        text("[P]LAY/PAUSE   [O]RBIT  <" + mouseX + "," + mouseY + "> DPR: " + window.devicePixelRatio.toFixed(2) + "   ", CANVAS_WIDTH, CANVAS_HEIGHT/10);
    }

    //draw a graph of the average values for all observations, and cursor for current
    for (o of observations)
    {
        let maxHeight = CANVAS_HEIGHT/2;
        let x = CANVAS_WIDTH * i/(observations.length - 1);
        let y = maxHeight * min(o.aqiAverage, 600)/600;
        let cursorWidth = CANVAS_WIDTH/(observations.length - 1);

        if (showGraph)
        {
            noStroke();
            fill(o.rgb[0], o.rgb[1], o.rgb[2]); //colors based on precomputed AQI color
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
           ellipse(x + cursorWidth/2, maxHeight, cursorWidth/3);           
        }



        i += 1;
    }
    strokeWeight(1);
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

    if (nLoaded < observations.length) //show progress information, if not loaded yet
    {
        let ts = CANVAS_HEIGHT/6; //smaller font size to fit two lines
        textSize(ts);
    
        textAlign(CENTER, CENTER);        
        //Percentage of loaded observations
        text(loadingText + " " + (100 * nLoaded/observations.length).toFixed() + "%", centerX, ty);
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
    text(oc.hour_string + ":00", centerX + dw/2 + pad, ty + pad);    
    
    if (oc.count && !showHelp)
    {
        textSize(CANVAS_HEIGHT/10);
    //    text(oc.count + " sensor" + (oc.count == 1 ? "" : "s"), centerX + dw + 4 * pad, ty + pad);    
        textAlign(RIGHT)
        text(loadingText, CANVAS_WIDTH - pad/2, CANVAS_HEIGHT/10 + pad);
        text(oc.count + " sensor" + (oc.count == 1 ? "" : "s") + " (" + radius/1000 + " km)", CANVAS_WIDTH - pad/2, 2.2 * CANVAS_HEIGHT/10 + pad);    

    }

    textSize(ts * 2/3);
    textAlign(LEFT);
    //year, right-centered to the left
    let yw = textWidth("2020");
    text(oc.year_string, centerX - dw/2 - yw - pad * 2, ty + pad);    

    //update timestamp and advance observation if playing
    if (millis() - timestamp > UPDATE_MS)
    {
        if (play)
            changeObservation();

        timestamp = millis();
    }
}

function setObservation(index, observations) //set current observation
{
    index = index.toFixed() % observations.length;

    if (!isNaN(index) && index >= 0 && index < observations.length)
    {
        current = index;
        let json = observations[current].json;
        
        if (!json)
        {
            console.log("setObservation(index): broken json: " + current);
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
    setObservation(index, observations);
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
    if (mouseY < CANVAS_HEIGHT/2 || mouseY > CANVAS_HEIGHT)
        return;

    setObservationFromX(mouseX);
}

function mouseDragged() //update observation based on timeline drag
{
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