/*
for adding ad hoc rotation to super-hands grabbing
since rotation is broken on super-hands 3.0.6
*/
AFRAME.registerComponent('super-hands-rotate-adhoc', {
    init: function () {
        const el = this.el;

        this.el.being_grabbed = false;
    
        // Triggered when the controller begins grabbing the object
        el.addEventListener('grab-start', function (evt) {
            el.setAttribute('material', 'posColor', {x: 1.0, y: 0.1, z: 0.1});
            // document.getElementById("support-dodecahedron").setAttribute('color', '#ffbfbf');
            
            var hand = evt;
            var debug_div = document.getElementById("html-panel").getElementsByClassName("debug")[0];
            // debug_div.innerHTML = JSON.stringify(hand);
            debug_div.innerHTML = Object.hasOwn(evt, "detail");
            // debug_div.innerHTML += `Rotation - X: ${rotDeg.x}, Y: ${rotDeg.y}, Z: ${rotDeg.z}`;

            this.el.being_grabbed = true;
        });
    
        // Triggered when the controller releases the object
        el.addEventListener('grab-end', function (evt) {
            el.setAttribute('material', 'posColor', {x: 0.9, y: 0.5, z: 0.1});
            // document.getElementById("support-dodecahedron").setAttribute('color', '#bfffff');

            // var hand = evt.detail.hand;
            this.el.gabber_hand = null;
            this.el.being_grabbed = false;
        });
    },

    tick: function () {
        // if it it being grabbed
        if (this.el.being_grabbed) {
            // log rotation on screen
            const rotDeg = this.el.gabber_hand.getAttribute('rotation');

            var debug_div = document.getElementById("html-panel").getElementsByClassName("debug")[0];
            debug_div.innerHTML = JSON.stringify(this.el.gabber_hand);
            debug_div.innerHTML += `Rotation - X: ${rotDeg.x}, Y: ${rotDeg.y}, Z: ${rotDeg.z}`;

        }
    }
});

AFRAME.registerComponent('super-hands-rotate-adhoc-hands', {
    init: function () {
        const el = this.el;

        this.el.gabber_hand = null;
        this.el.being_grabbed = false;
    
        // Triggered when the controller begins grabbing the object
        el.addEventListener('grab-start', function (evt) {
            if (el.id === "leftHand") {
                document.getElementById("support-dodecahedron").setAttribute('color', '#ffbfbf');
            } else if (el.id === "rightHand") {
                document.getElementById("support-dodecahedron").setAttribute('color', '#ffffbf');
            } else {
                document.getElementById("support-dodecahedron").setAttribute('color', '#bfbfbf');
            }
        });
    
        // Triggered when the controller releases the object
        el.addEventListener('grab-end', function (evt) {
            document.getElementById("support-dodecahedron").setAttribute('color', '#bfffff');

        });
    },

    tick: function () {
        // if it it being grabbed
        if (this.el.being_grabbed) {
            // log rotation on screen
            const rotDeg = this.el.gabber_hand.getAttribute('rotation');

            var debug_div = document.getElementById("html-panel").getElementsByClassName("debug")[0];
            debug_div.innerHTML = JSON.stringify(this.el.gabber_hand);
            debug_div.innerHTML += `Rotation - X: ${rotDeg.x}, Y: ${rotDeg.y}, Z: ${rotDeg.z}`;

        }
    }
});