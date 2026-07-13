# Legacy viewer (2020)

The original Bay Area air-quality app, built with
[procedural-gl.js](https://github.com/felixpalmer/procedural-gl-js) and
[p5.js](https://p5js.org/). It has been superseded by the MapLibre + deck.gl
viewer in [`../viewer/`](../viewer/) — `procedural-gl.js` is no longer
maintained — and is kept here for reference.

It still runs: serve the repo root over HTTP and open `/legacy/index.htm`
(sensor data is loaded from `../data`). Note the real-time PurpleAir mode no
longer works, as the endpoint it used was retired — see the main
[README](../README.md#future-work) for details.
