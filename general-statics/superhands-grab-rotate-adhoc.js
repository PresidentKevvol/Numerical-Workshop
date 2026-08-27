/*
for adding ad hoc rotation to super-hands grabbing
since rotation is broken on super-hands 3.0.6
*/

var left_gripping = false;
var right_gripping = false;

AFRAME.registerComponent('super-hands-rotate-adhoc', {
    init: function () {
        const el = this.el;

        this.el.being_grabbed = false;
    
        // Triggered when the controller begins grabbing the object
        el.addEventListener('grab-start', function (evt) {
            // el gives the entity element to which you can set its attribute
            // el.setAttribute('material', 'posColor', {x: 1.0, y: 0.1, z: 0.1});
            
            // however evt only gives an object that is {isTrusted: false}
            // and you cannot use evt.detail.hand to access the hand's info

            // var debug_div = document.getElementById("html-panel").getElementsByClassName("debug")[0];
            // debug_div.innerHTML += `Rotation - X: ${rotDeg.x}, Y: ${rotDeg.y}, Z: ${rotDeg.z}`;

            this.el.being_grabbed = true;
        });
    
        // Triggered when the controller releases the object
        el.addEventListener('grab-end', function (evt) {
            // el.setAttribute('material', 'posColor', {x: 0.9, y: 0.5, z: 0.1});

            this.el.being_grabbed = false;
        });
    },

    tick: function () {
        // if it it being grabbed
        if (this.el.being_grabbed) {
            // log rotation on screen

            // var debug_div = document.getElementById("html-panel").getElementsByClassName("debug")[0];
            // debug_div.innerHTML = JSON.stringify(this.gabber_hand);
            // debug_div.innerHTML += `Rotation - X: ${rotDeg.x}, Y: ${rotDeg.y}, Z: ${rotDeg.z}`;

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
        this.el.addEventListener('gripdown', this.gripdown);
    
        // Triggered when the controller releases the object
        this.el.addEventListener('gripup', this.gripup);
    },
    update: function() {},
    tick: function() {},
    gripdown: function (evt) {
        var debug_div = document.getElementById("html-panel").getElementsByClassName("debug")[0];

        var rotDeg = document.getElementById("rightHand").getAttribute('rotation');
        var prints = `event: down` + "<br>" + `Rotation - X: ${rotDeg.x}, Y: ${rotDeg.y}, Z: ${rotDeg.z}`;
        debug_div.innerHTML = prints + "<br>" + debug_div.innerHTML;
    },
    gripup: function (evt) {
        var debug_div = document.getElementById("html-panel").getElementsByClassName("debug")[0];

        var prints = `${JSON.stringify(this.data)}, event: up`;
        debug_div.innerHTML = prints + "<br>" + debug_div.innerHTML;
    },
    remove : function() {}
});