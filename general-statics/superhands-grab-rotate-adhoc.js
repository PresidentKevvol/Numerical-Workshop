/*
for adding ad hoc rotation to super-hands grabbing
since rotation is broken on super-hands 3.0.6
*/
AFRAME.registerComponent('super-hands-rotate-adhoc', {
    init: function () {
      const el = this.el;
  
      // Triggered when the controller begins grabbing the object
      el.addEventListener('grab-start', function (evt) {
        el.setAttribute('material', 'posColor', {x: 1.0, y: 0.1, z: 0.1});
        document.getElementById("support-dodecahedron").setAttribute('color', '#ffbfbf');
        
        // Access the controller/hand entity that initiated the gesture
        var hand = evt.detail.hand;
        hand.setAttribute('color', '#bfffbf');
      });
  
      // Triggered when the controller releases the object
      el.addEventListener('grab-end', function (evt) {
        el.setAttribute('material', 'posColor', {x: 0.9, y: 0.5, z: 0.1});
        document.getElementById("support-dodecahedron").setAttribute('color', '#bfffff');

        // Access the controller/hand entity that initiated the gesture
        var hand = evt.detail.hand;
        hand.setAttribute('color', '#ffffff');
      });
    }
  });