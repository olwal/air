p5.prototype.loadArrayBuffer = function(file, callback, errorCallback) {
    const ret = {};
  
    const self = this;
    this.httpDo(
      file,
      'GET',
      'arrayBuffer',
      arrayBuffer => {
        //ret.bytes = new Uint8Array(arrayBuffer);
        ret.bytes = arrayBuffer;
  
        if (typeof callback === 'function') {
          callback(ret);
        }
  
        self._decrementPreload();
      },
      err => {
        // Error handling
        p5._friendlyFileLoadError(6, file);
  
        if (errorCallback) {
          errorCallback(err);
        } else {
          throw err;
        }
      }
    );
    return ret;
  };