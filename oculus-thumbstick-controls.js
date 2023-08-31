AFRAME.registerComponent('oculus-thumbstick-controls', {
    schema: {
        acceleration: { default: 45 },
        rigSelector: {default: "#rig"},
        fly: { default: false },
        controllerOriented: { default: false },
        adAxis: {default: 'x', oneOf: ['x', 'y', 'z']},
        wsAxis: {default: 'z', oneOf: ['x', 'y', 'z']},
        qzAxis: {default: 'y', oneOf: ['x', 'y', 'z']},
        enabled: {default: true},
        adEnabled: {default: true},
        adInverted: {default: false},
        wsEnabled: {default: true},
        wsInverted: {default: false},
        qzEnabled: {default: true},
        qzInverted: {default: false}
    },
    init: function () {
        this.easing = 1.1;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.tsData = new THREE.Vector2(0, 0);
        this.vertical_input = 0;

        this.thumbstickMoved = this.thumbstickMoved.bind(this)
        this.el.addEventListener('thumbstickmoved', this.thumbstickMoved);

        //add trigger and grip/AB/XY button clicked event listener
        this.el.addEventListener('triggerdown', this.triggerDown);
        this.el.addEventListener('triggerup', this.triggerUp);
        this.el.addEventListener('gripdown', this.gripDown);
        this.el.addEventListener('gripup', this.gripUp);
    },
    update: function() {
        this.rigElement = document.querySelector(this.data.rigSelector)
    },
    tick: function (time, delta) {
        if (!this.el.sceneEl.is('vr-mode')) return;
        var data = this.data;
        var el = this.rigElement
        var velocity = this.velocity;
        //console.log("here", this.tsData, this.tsData.length())
        if (!velocity[data.adAxis] && !velocity[data.wsAxis] && !velocity[data.qzAxis] && !this.tsData.length()) { return; }

        // Update velocity.
        delta = delta / 1000;
        this.updateVelocity(delta);

        if (!velocity[data.adAxis] && !velocity[data.wsAxis] && !velocity[data.qzAxis]) { return; }

        // Get movement vector and translate position.
        el.object3D.position.add(this.getMovementVector(delta));
    },
    updateVelocity: function (delta) {
        var acceleration;
        var adAxis;
        var adSign;
        var data = this.data;
        var velocity = this.velocity;
        var wsAxis;
        var wsSign;
        var qzAxis;
        var qzSign;
        const CLAMP_VELOCITY = 0.00001;

        adAxis = data.adAxis;
        wsAxis = data.wsAxis;
        qzAxis = data.qzAxis;

        // If FPS too low, reset velocity.
        if (delta > 0.2) {
            velocity[adAxis] = 0;
            velocity[wsAxis] = 0;
            velocity[qzAxis] = 0;
            return;
        }

        // https://gamedev.stackexchange.com/questions/151383/frame-rate-independant-movement-with-acceleration
        var scaledEasing = Math.pow(1 / this.easing, delta * 60);
        // Velocity Easing.
        if (velocity[adAxis] !== 0) {
            velocity[adAxis] = velocity[adAxis] * scaledEasing;
        }
        if (velocity[wsAxis] !== 0) {
            velocity[wsAxis] = velocity[wsAxis] * scaledEasing;
        }
        if (velocity[qzAxis] !== 0) {
            velocity[qzAxis] = velocity[qzAxis] * scaledEasing;
        }

        // Clamp velocity easing.
        if (Math.abs(velocity[adAxis]) < CLAMP_VELOCITY) { velocity[adAxis] = 0; }
        if (Math.abs(velocity[wsAxis]) < CLAMP_VELOCITY) { velocity[wsAxis] = 0; }
        if (Math.abs(velocity[qzAxis]) < CLAMP_VELOCITY) { velocity[qzAxis] = 0; }

        if (!data.enabled) { return; }

        // Update velocity using keys pressed.
        acceleration = data.acceleration;
        if (data.adEnabled && this.tsData.x) {
            adSign = data.adInverted ? -1 : 1;
            velocity[adAxis] += adSign * acceleration * this.tsData.x * delta; 
        }
        if (data.wsEnabled) {
            wsSign = data.wsInverted ? -1 : 1;
            velocity[wsAxis] += wsSign * acceleration * this.tsData.y * delta;
        }
        if (data.qzEnabled) {
            qzSign = data.qzInverted ? -1 : 1;
            velocity[qzAxis] += qzSign * acceleration * this.vertical_input * delta;
        }
    },
    getMovementVector: (function () {
        var directionVector = new THREE.Vector3(0, 0, 0);
        var rotationEuler = new THREE.Euler(0, 0, 0, 'YXZ');

        return function (delta) {
            var rotation = this.el.sceneEl.camera.el.object3D.rotation
            var velocity = this.velocity;
            var xRotation;

            directionVector.copy(velocity);
            directionVector.multiplyScalar(delta);
            // Absolute.
            if (!rotation) { return directionVector; }
            xRotation = this.data.fly ? rotation.x : 0;

            // Transform direction relative to heading.
            rotationEuler.set(xRotation, rotation.y, 0);
            directionVector.applyEuler(rotationEuler);
            return directionVector;
        };
    })(),
    thumbstickMoved: function (evt) {
        this.tsData.set(evt.detail.x, evt.detail.y);
        document.getElementById("test-output-2").innerHTML += `ts: ${this.tsData.x}, ${this.tsData.y}; vi:${this.vertical_input} <br>`;
    },
    triggerDown: function (evt) {
        this.vertical_input = 1;
        document.getElementById("test-output").innerHTML = "trigger down";
    },
    triggerUp: function (evt) {
        this.vertical_input = 0;
        document.getElementById("test-output").innerHTML = "trigger up";
    },
    gripDown: function (evt) {
        this.vertical_input = -1;
        document.getElementById("test-output").innerHTML = "grip down";
    },
    gripUp: function (evt) {
        this.vertical_input = 0;
        document.getElementById("test-output").innerHTML = "grip up";
    },
    remove: function () {
        this.el.removeEventListener('thumbstickmoved', this.thumbstickMoved);
    }
});