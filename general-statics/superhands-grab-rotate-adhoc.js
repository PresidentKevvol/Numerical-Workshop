/*
for adding ad hoc rotation to super-hands grabbing
since rotation is broken on super-hands 3.0.6
*/
AFRAME.registerComponent('super-hands-rotate-adhoc', {
    init: function () {
      const el = this.el;
  
      // Triggered when the controller begins grabbing the object
      el.addEventListener('grab-start', function (evt) {
        // el.setAttribute('material', 'color', 'red');
        document.getElementById("support-dodecahedron").setAttribute('color', '#ffbfbf');
        
        // Access the controller/hand entity that initiated the gesture
        var hand = evt.detail.hand;
        hand.setAttribute('color', '#bfffbf');
      });
  
      // Triggered when the controller releases the object
      el.addEventListener('grab-end', function (evt) {
        // el.setAttribute('material', 'color', 'blue');
        document.getElementById("support-dodecahedron").setAttribute('color', '#bfffff');

        // Access the controller/hand entity that initiated the gesture
        var hand = evt.detail.hand;
        hand.setAttribute('color', '#ffffff');
      });
    }
  });