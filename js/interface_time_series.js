/*
    Alex Olwal, 2020, www.olwal.com

    Application for 2D/3D visualization, playback and interaction with time series sensor data overlaid on geo maps.

    Externally defined constants/global variables in config.js
*/

var CANVAS_WIDTH = window.innerWidth; //borderless width
const CONTAINER_P5 = document.getElementById(DIV_P5);

const SENSOR_INDEX = SENSOR_INDEX_FILE;
const PATH = BINARY_DATA_PATH;
const BINARY_INDEX = BINARY_DATA_PATH + 'index.txt';
const LABELS_NAME = FEATURE_COLLECTION_NAME_LANDMARKS;
let binaries;

let cities; //city data for labels
let sensors; //sensor index

let observations = [];
let current = 0;
let nLoaded = 0;

let timestamp; //keep track of time for animation
let UPDATE_MS = 100; //inter-frame delay 

let play = false;
let showHelp = true;

//Time intervals to load data, either these as default, or from urlParameters (start_date and end_date)
let START_DATE_STRING = "2020-08-19";
let END_DATE_STRING = "2020-09-15";
let START_DATE = Date.parse(START_DATE_STRING);
let END_DATE = Date.parse(END_DATE_STRING);

let DEFAULT_LONGITUDE = -122.44198789673219;
let DEFAULT_LATITUDE = 37.7591527514897;
let DEFAULT_RADIUS = 7500; //m

let DEFAULT_DISTANCE = 20000;

let cityLabels = undefined;
let showLabels = true;

function preload()
{
    sensors = Observations.preload(SENSOR_INDEX);
    binaries = loadStrings(BINARY_INDEX);
    cities = Features.preload();
}

function setup()
{
    //Attempt to parse URL parameters for start_date and end_date. If successful, load that interval, otherwise load default
	let params = getURLParams();		    
    let start_string = params['start_date'];
    let end_string = params['end_date'];
    let longitude = parseFloat(params['longitude']);
    let latitude = parseFloat(params['latitude']);
    let radius = parseFloat(params['radius']);    
    let distance = parseFloat(params['distance']);
    let city = params['city'];

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

    if (city != undefined)
    {
        city = city.replace(/%20/g, " ");
        let rows = cities.findRows(city, "name");

        let row = undefined;

        for (r of rows)
        {
            print(rows);
            if (r.get("name") == city)
            {
                city = r.get("name");
                row = r;
                break;
            }
        }

        print(row);

        if (row != undefined)
        {
            latitude = parseFloat(row.get("latitude"));
            longitude = parseFloat(row.get("longitude"));
        }
    }    

    longitude = isNaN(longitude) ? DEFAULT_LONGITUDE : longitude;
    latitude = isNaN(latitude) ? DEFAULT_LATITUDE : latitude;
    distance = isNaN(distance) ? DEFAULT_DISTANCE : distance;
    radius = isNaN(radius) ? DEFAULT_RADIUS : radius;

    console.log(radius + " " + distance + " " + binaries.length);

    //create p5.js canvas
    let can = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    can.parent(CONTAINER_P5);

    //set the map target to San Francisco
    MAP_TARGET.longitude = longitude; //-122.44198789673219;
    MAP_TARGET.latitude = latitude; //37.7591527514897;
    MAP_TARGET.distance = distance; //20000;

    Procedural.displayLocation(MAP_TARGET);
    Procedural.focusOnLocation(MAP_TARGET);

    window.setTimeout(
        function()
        {
            for (b of binaries) //b is the filename (e.g., "2020-12-13_00.bin")
            {
                let ms = Date.parse(b.slice(0, -7)); //extracts date portion and converts to UTC milliseconds

                if (ms < START_DATE || ms > END_DATE || b.length == 0) //skips this file if it is too early or too late
                    continue;

                let data = PATH + b; //complete path for file to load

                o = new Observations(longitude, latitude, radius); //create a new Observations object, which will load and preprocess the data and overlays
                o.load(data, sensors, 
                    function(observation)
                    {
        //                console.log('Loaded ' + observation.filename + " " + observation.count + " sensors (" + observation.errors + " errors, " + observation.notInIndex + ")");
                        nLoaded++; //keep track of # of loaded Observations

                        if (nLoaded == 1)
                        {
                            Procedural.focusOnLocation(MAP_TARGET);
                            setObservation(0);
                        }

                        if (nLoaded == observations.length) //when completed, foucs on the desired map target
                        {
                            Procedural.focusOnLocation(MAP_TARGET);
                            //play = true;
                        }    
                    }    
                );

                observations.push(o); //add each Observation object 
            }
        }, 1000);

    //add city names overlays
    cityLabels = Features.getBayAreaFeatures(FEATURE_COLLECTION_NAME_LANDMARKS, cities, city)
    Procedural.addOverlay(cityLabels);

    Procedural.onFeatureClicked = function (id) //clicking on a feature 
    {
        let o = observations[current];
        if (o)
        {
            let p = o.observations[id];
            if (p)
                print(id + " " + p[0] + " " + p[1] + " " + p[2]);
        }
    }

    //set the text size to 1/4 of the height to fit 2 lines + progress bar
    textFont("Inter");

    timestamp = millis();
}

function focusOn(longitude, latitude)
{
    let target = {
        latitude: latitude, longitude: longitude,
        distance: 50000,
        angle: 35, bearing: -20
    };    

    Procedural.focusOnLocation(target);
}

function keyPressed() //handle keyboard presses
{
    let delta = 1;

    switch (keyCode)
    {        
        //stop loading observations
        case ESCAPE:
            for (o of observations)
                o.cancel();
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
            play = !play;
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
                Procedural.addOverlay(cityLabels);
            else
                Procedural.removeOverlay(FEATURE_COLLECTION_NAME_LANDMARKS);

        case 'x': 
            UPDATE_MS /= 2;
            break;

        case 'X': 
            UPDATE_MS *= 2;     
            break;

        case 'h':
            showHelp = !showHelp;
            break; 

        case 'r': //rewind to beginning
            current = 0;    
            break;

        case 'O': //toggle whether a focus will trigger an immediate orbit to start
            ORBIT_AFTER_FOCUS = !ORBIT_AFTER_FOCUS;
            break;

        case 'f': //focus on default location
            Procedural.focusOnLocation(MAP_TARGET);
            break;
    }
}

function draw()
{
    background("#666666");

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
                text(oj.month_text + " " + oj.day_string, x + 5, CANVAS_HEIGHT/2);
            }
            else if (last) // month + day
            {
                textAlign(RIGHT, TOP); //right-centered and (x - 5) to not get cut off at right edge
                text(oj.month_text + " " + oj.day_string, x - 5, CANVAS_HEIGHT/2);
            }
            else // month
            {
                textAlign(CENTER, TOP); //centered
                text(oj.month_text, x, CANVAS_HEIGHT/2);                       
            }
        }
    }

    if (showHelp)
    {
        textAlign(RIGHT)
        text("[P]LAY/PAUSE   [O]RBIT START   [F]OCUS   [L]ABELS   [H]ELP ", CANVAS_WIDTH, CANVAS_HEIGHT/10 );
    }

    //draw a graph of the average values for all observations, and cursor for current
    for (o of observations)
    {
        let maxHeight = CANVAS_HEIGHT/2;
        let x = CANVAS_WIDTH * i/(observations.length - 1);
        let y = maxHeight * min(o.aqiAverage, 600)/600;

        if (i == current) //cursor for current value
        {
            stroke(200);
            line(x, maxHeight * 2, x, 0);
        }

        noStroke();
        fill(o.rgb[0], o.rgb[1], o.rgb[2]); //colors based on precomputed AQI color
        rect(x, maxHeight * 2, CANVAS_WIDTH/(observations.length - 1), -y);

        i += 1;
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

    if (nLoaded < observations.length) //show progress information, if not loaded yet
    {
        let ts = CANVAS_HEIGHT/6; //smaller font size to fit two lines
        textSize(ts);
    
        textAlign(CENTER, CENTER);        
        //Percentage of loaded observations
        text("Prepared " + (100 * nLoaded/observations.length).toFixed() + "%", centerX, ty);
        //Second line that shows the time span to load        
        textSize(ts * 0.75);
        fill(150);
        text(START_DATE_STRING + " to " + END_DATE_STRING, centerX, ts * 1.1 + ty);

        return;
    }

    if (current >= observations.length)
        return;

    let oc = observations[current]; //get current observation

    //display the current date in center
    text(oc.date_string, centerX - dw/2, ty + pad);

    //smaller text for year and time
    textSize(ts * 2/3);

    //hour, left-centered to the right
    textAlign(LEFT, CENTER);
    fill(200);
    text(oc.hour_string + ":00", centerX + dw/2 + pad, ty + pad);    

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

function setObservation(index) //set current observation
{
    current = (index) % observations.length;
    Procedural.addOverlay(observations[current].json);
}

function changeObservation(delta = 1) //change observations with +/- delta
{
    setObservation(current + delta + observations.length);
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

function setObservationFromX(x) //set observation given X value (e.g, from mouse/touch)
{
    let c = getObservation(x);
    
    if (c >= 0)
        setObservation(c);    
}

function mousePressed() //update observation based on timeline click
{
    if (mouseY > CANVAS_HEIGHT)
        return;

    setObservationFromX(mouseX);
}

function mouseDragged() //update observation based on timeline drag
{
    if (mouseY > CANVAS_HEIGHT)
        return;

    setObservationFromX(mouseX);
}

function mouseWheel(event) //update observation based on scroll events
{
    if (mouseY > CANVAS_HEIGHT)
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