![3D visualization of air quality sensor data](media/sensor_data_3d_bay_area.jpg)

# Interactive Air Quality in 3D: A Year of Hourly Sensor Data
This project visualizes air quality data overlaid onto a 3D geographical map. The map shows hourly data from thousands of sensors and allows interaction and playback of air quality pattern across various locations. The application allows specification of location in California, start and end dates and the radius of the area for the sensors area to include. These visualizations particularly highglight the significant impact that the 2020 Bay Area fires had on air quality, but can be used to explore patterns throughout the full year. 

[Live 3D demo with time-series sensor data](https://olwal.github.io/air/3d/)

[![Pan SF to San Mateo](media/sf_pan.gif)](https://olwal.github.io/air/3d?location=San%20Mateo&start_date=2020-09-08&end_date=2020-09-12&radius=30000) [![Pan to SF](media/sf_pan_2.gif)](https://olwal.github.io/air/3d?location=San%20Francisco&start_date=2020-09-08&end_date=2020-09-12&radius=30000)

Time series 3D visualization of sensor data from [PurpleAir](https://purpleair.com/), leveraging JavaScript, [procedural-gl.js](https://github.com/felixpalmer/procedural-gl-js) and [p5.js](https://p5js.org/). Data files preprocessed with Python and [Jupyter Lab](https://jupyter.org/).

## 2020 Bay Area fires
Real-time 3D visualization of air quality sensor data within a certain radius from the location, references to 3rd party material, and timelapse videos of the 3D visualizations.

### [LNU Lightning Complex Fires](https://olwal.github.io/air/3d?location=LNU%20Lightning%20Complex%20Fires&start_date=2020-08-16&end_date=2020-10-03) | Aug 17 to Oct 02
- Locations: [Napa](https://olwal.github.io/air/3d?location=Napa&start_date=2020-08-16&end_date=2020-10-11), Lake, [Sonoma](https://olwal.github.io/air/3d?location=Sonoma&start_date=2020-08-16&end_date=2020-10-11), [Yolo](https://olwal.github.io/air/3d?location=Yolo&start_date=2020-08-16&end_date=2020-10-11), Solano
- References: [SF Chronicle Fire Tracker](https://www.sfchronicle.com/projects/california-fire-map/2020-lnu-lightning-complex), [InciWeb](https://inciweb.nwcg.gov/incident/7027/), [Wikipedia](https://en.wikipedia.org/wiki/LNU_Lightning_Complex_fires)
- [Napa Video](https://youtu.be/sms1VZ-AS3k)

Interactive demo: 

[![Napa](media/napa.gif)](https://olwal.github.io/air/3d?location=LNU%20Lightning%20Complex%20Fires&start_date=2020-08-16&end_date=2020-10-03)

### [CZU August Lightning Complex Fires](http://olwal.github.io/air/3d?location=CZU%20Lightning%20Complex%20Fires&start_date=2020-08-16&end_date=2020-09-23) | Aug 17 to Sep 22
- Locations: [Santa Cruz](https://olwal.github.io/air/3d?location=Santa%20Cruz&start_date=2020-08-16&end_date=2020-09-23), [San Mateo](https://olwal.github.io/air/3d?location=San%20Mateo&start_date=2020-08-16&end_date=2020-09-23)
- References: [SF Chronicle Fire Tracker](https://www.sfchronicle.com/projects/california-fire-map/2020-cnu-august-lightning-complex), [InciWeb](https://inciweb.nwcg.gov/incident/7028/), [Wikipedia](https://en.wikipedia.org/wiki/CZU_Lightning_Complex_fires)
- [San Mateo Video](https://youtu.be/mKirhChPaWU)

Interactive demo: 

[![Santa Cruz](media/santa_cruz.gif)](https://olwal.github.io/air/3d?location=Santa%20Cruz&start_date=2020-08-16&end_date=2020-09-23)

### [SCU August Lightning Complex Fires](http://olwal.github.io/air/3d?location=SCU%20Lightning%20Complex%20Fires&start_date=2020-08-15&end_date=2020-10-03) | Aug 16 to Oct 02
- Locations: [Santa Clara](http://olwal.github.io/air/3d?location=Santa%20Clara&start_date=2020-08-15&end_date=2020-10-03), [Alameda](http://olwal.github.io/air/3d?location=Alameda&start_date=2020-08-15&end_date=2020-10-03), Contra Costa, [San Joaquin](http://olwal.github.io/air/3d?location=San%20Joaquin&start_date=2020-08-15&end_date=2020-10-03), Stanislaus
- References: [SF Chronicle Fire Tracker](https://www.sfchronicle.com/projects/california-fire-map/2020-cnu-august-lightning-complex), [InciWeb](https://inciweb.nwcg.gov/incident/7056/), [Wikipedia](https://en.wikipedia.org/wiki/SCU_Lightning_Complex_fires)
- [Santa Clara Video](https://youtu.be/gJdsuwGUNYg)

Interactive demo: 

[![Santa Clara](media/santa_clara.gif)](http://olwal.github.io/air/3d?location=Santa%20Clara&start_date=2020-08-15&end_date=2020-10-03)

## 2020 | 1-year Time Series
- [Oakland](https://olwal.github.io/air/3d/?location=Oakland&start_date=2020-01-01&end_date=2021-01-01) | [Timelapse Video](https://youtu.be/jxLtuF0n3hA) | 2020 Jan-Dec
- [Santa Cruz](https://olwal.github.io/air/3d/?location=Santa%20Cruz&start_date=2020-01-01&end_date=2021-01-01) | [Timelapse Video](https://youtu.be/fsbrf3rNnMg) | 2020 Jan-Dec
- [San Francisco](https://olwal.github.io/air/3d/?location=San%20Francisco&start_date=2020-01-01&end_date=2021-01-01) | [Timelapse Video](https://youtu.be/-bVvzHcI12I) | 2020 Jan-Dec

## 3D views

![Pan to San Francisco](media/sf_pan_to_320.gif) 
![Rotating around San Francisco](media/sf_rotate_320.gif)

![Rotating around East Bay](media/east_bay_rotate_320.gif) 
![Approaching Silicon Valley](media/silicon_valley_approach_320.gif)


