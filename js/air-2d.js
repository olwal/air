/*
    Alex Olwal, 2020, www.olwal.com

    Application logic for retrieving air quality sensor data and displaying it on a 3D map
*/

const CANVAS_WIDTH = window.innerWidth; //borderless width
const CONTAINER_P5 = document.getElementById(DIV_P5);

let air; //object that manages updates through server
let lastUpdated = -1; //keep track of last update (seconds)
let timestamp; //used for the first update
let focusOnClick = false;
let cities; 

function preload() 
{
    air = new Air();
    air.preload();
    cities = Features.preload();
}

function digit(number)
{
    return ('0' + number).slice(-2);
}

function setup() 
{
    air.TIME_BETWEEN_REQUESTS = TIME_BETWEEN_REQUESTS;
    air.TIME_BETWEEN_REQUESTS_FIRST = TIME_BETWEEN_REQUESTS_FIRST;
    air.FEATURE_OPACITY = FEATURE_OPACITY;

    air.init(UPDATE_INTERVAL);    
    self = air;

    //add city names overlays
    Procedural.addOverlay(Features.getBayAreaFeatures(cities));

    //callback for receiving updated sensor data
    air.onUpdateCallback = function(sensors) 
    {       
        if (!self.initialized) //first update
        {
            timestamp = year() + " " + digit(month()) + " " + digit(day()) + " "  + digit(hour()) + ":"  + digit(minute()); //zero-padded YYYY-MM-DD hh:mm

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

        let callbackData = [] //clear data for overlays
        for (let r = 0; r < sensors.getRowCount(); r++) //add all rows from updates
            callbackData.push(sensors.rows[r].arr);     
    
        //generate and add sensor overlays
        let o = Features.buildFromData(callbackData, FEATURE_COLLECTION_NAME); 
        Procedural.addOverlay(o);

        lastUpdated = millis();
    }

    //create p5.js canvas
    let can = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    can.parent(CONTAINER_P5);

    //set the text size to 1/4 of the height to fit 2 lines + progress bar
    textSize(CANVAS_HEIGHT * 0.25);
    textFont("Inter");
    textAlign(LEFT);
}

function draw() 
{
    background(255); //white background

    let textString = "Preparing data...";

    noStroke();
    fill(100, 100);

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
            textString = "Air quality sensor data | " + timestamp; 
    }

    fill(100);
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
        
        fill(100);
        text(info, radius * 2.5 + textSize()/4, textSize() * 2.7);        
    }
}

function keyPressed() //handle keyboard presses
{
    switch (key) 
    {
        case 'm': //orbit any target
            focusOnClick = !focusOnClick;
            break;

        case 'o': //orbit any target
            ORBIT_AFTER_FOCUS = !ORBIT_AFTER_FOCUS;
            break;

        case ' ': 
            Procedural.orbitTarget();
            break;

        case 'r': //reset focus to original location
            Procedural.focusOnLocation(MAP_TARGET);
            break;

        case 'c': //clear selection
            air.selected = undefined;
            break;

        case 'f': //focus on current selection
            if (air.selected != undefined)
                focusOn(air.selected[1], air.selected[2]);

            break;
    }
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

function windowResized() //adjust canvas size when window is resized
{
    resizeCanvas(windowWidth, CANVAS_HEIGHT);
}
