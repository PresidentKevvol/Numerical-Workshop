AFRAME.registerComponent('sim-update', {
    schema: {
    },
  
    init: function () {
      this.directionVec3 = new THREE.Vector3();
      this.default_interval = 0;
      this.tick_ct = 0;
    },

    tick: function (time, timeDelta) {
        if (animation_playing) {
            //update every n frame
            if (this.tick_ct === 0) {
                render_interval_func();
            }

            this.tick_ct += 1;
            if (this.tick_ct % 2 === 0) {
                this.tick_ct = 0;
            }
        }
    }
  });