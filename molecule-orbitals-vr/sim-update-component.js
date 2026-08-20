AFRAME.registerComponent('sim-update', {
    schema: {
    },
  
    init: function () {
      this.directionVec3 = new THREE.Vector3();
      this.default_interval = 0;
      this.tick_ct = 0;
    },

    tick: function (time, timeDelta) {
        
    }
  });