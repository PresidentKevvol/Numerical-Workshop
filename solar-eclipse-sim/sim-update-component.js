AFRAME.registerComponent('sim-update', {
    schema: {
    },
  
    init: function () {
      this.directionVec3 = new THREE.Vector3();
      this.default_interval = 0;
      this.tick_ct = 0;
      this.real_timedelta = 0;

      this.frameskip_ratio = 2;
    },

    tick: function (time, timeDelta) {
        if (animation_playing) {
            //add to previous cumulative time delta
            this.real_timedelta += timeDelta;

            //update every n frame
            if (this.tick_ct === 0) {
                render_interval_func(time, this.real_timedelta);
                this.real_timedelta = 0;
            }

            this.tick_ct += 1;
            //reset tick_ct when n is reached (next tick will call render_interval_func)
            if (this.tick_ct % this.frameskip_ratio === 0) {
                this.tick_ct = 0;
            }
        }
    }
  });