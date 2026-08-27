/*
for adding ad hoc rotation to super-hands grabbing
since rotation is broken on super-hands 3.0.6
*/

var left_gripping = false;
var right_gripping = false;

var last_entity_grabbed = null;
var grabber_rotation_values = null;

AFRAME.registerComponent('super-hands-rotate-adhoc', {
    init: function () {
        const el = this.el;

        this.el.being_grabbed = false;
    
        // Triggered when the controller begins grabbing the object
        el.addEventListener('grab-start', (evt) => {
            // el gives the entity element to which you can set its attribute
            // el.setAttribute('material', 'posColor', {x: 1.0, y: 0.1, z: 0.1});
            
            // however evt only gives an object that is {isTrusted: false}
            // and you cannot use evt.detail.hand to access the hand's info

            // var debug_div = document.getElementById("html-panel").getElementsByClassName("debug")[0];
            // var prints = `${JSON.stringify(evt)}`;
            // debug_div.innerHTML = prints + "<br>" + debug_div.innerHTML;

            this.el.being_grabbed = true;
            last_entity_grabbed = this.el;
        });
    
        // Triggered when the controller releases the object
        el.addEventListener('grab-end', (evt) => {
            // el.setAttribute('material', 'posColor', {x: 0.9, y: 0.5, z: 0.1});

            this.el.being_grabbed = false;
            last_entity_grabbed = null;
            grabber_rotation_values = null;
        });
    },

    tick: function () {
        // if it it being grabbed
        if (this.el.being_grabbed) {
            // log rotation on screen
            var debug_div = document.getElementById("html-panel").getElementsByClassName("debug")[0];
            var prints = `${left_gripping}, ${right_gripping}`;
            debug_div.innerHTML = prints + "<br>" + debug_div.innerHTML;

            var grabber;
            // if both hands gripping, no rotation
            if (left_gripping && right_gripping) {
                return;
            } else if (left_gripping) {
                grabber = document.getElementById("leftHand");
            } else if (right_gripping) {
                grabber = document.getElementById("rightHand");
            }


            // if the current latest entity being registered as grabbed is this, we proceed
            if (last_entity_grabbed === this.el) {
                // original rotation value of the entity
                var entity_rot_orig = this.el.getAttribute("rotation");

                if (grabber_rotation_values) {
                    var grabber_new = grabber.getAttribute("rotation");
                    // change in rotation between last and this tick
                    var del_theta = {
                        x: grabber_new.x - grabber_rotation_values.x,
                        y: grabber_new.y - grabber_rotation_values.y,
                        z: grabber_new.z - grabber_rotation_values.z,
                    };

                    var new_rot = {
                        x: entity_rot_orig.x + del_theta.x,
                        y: entity_rot_orig.y + del_theta.y,
                        z: entity_rot_orig.z + del_theta.z,
                    };
                    this.el.setAttribute("rotation", new_rot);
                }

                // record for next tick
                grabber_rotation_values = grabber.getAttribute("rotation");
            }
        }
    }
});

AFRAME.registerComponent('rotate-adhoc', {
    schema: {
        hand: {type: "string"}
    },
    init: function () {
        // const el = this.el;
        // these following code just does not work at all
        // grab-start event is not fired for the hand entity when it grabs an object

        // Triggered when the controller begins grabbing the object
        this.el.addEventListener('gripdown', (evt) => {
            if (this.data.hand === "left") {
                left_gripping = true;
            } else if (this.data.hand === "right") {
                right_gripping = true;
            }

            // var debug_div = document.getElementById("html-panel").getElementsByClassName("debug")[0];
    
            // var rotDeg = document.getElementById("rightHand").getAttribute('rotation');
            // var prints = `event: ${this.data.hand}, down` + "<br>" + `Rotation - X: ${rotDeg.x.toFixed(2)}, Y: ${rotDeg.y.toFixed(2)}, Z: ${rotDeg.z.toFixed(2)}`;
            // debug_div.innerHTML = prints + "<br>" + debug_div.innerHTML;
        });
    
        // Triggered when the controller releases the object
        this.el.addEventListener('gripup', (evt) => {
            if (this.data.hand === "left") {
                left_gripping = false;
            } else if (this.data.hand === "right") {
                right_gripping = false;
            }

            // var debug_div = document.getElementById("html-panel").getElementsByClassName("debug")[0];
    
            // var rotDeg = this.el.getAttribute('rotation');
            // var prints = `event: ${this.data.hand}, up` + "<br>" + `Rotation - X: ${rotDeg.x.toFixed(2)}, Y: ${rotDeg.y.toFixed(2)}, Z: ${rotDeg.z.toFixed(2)}`;
            // debug_div.innerHTML = prints + "<br>" + debug_div.innerHTML;
        });
    },
    update: function() {},
    tick: function() {},
    remove : function() {}
});