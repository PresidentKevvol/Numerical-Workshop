import current_equations from './index.js';


self.addEventListener('message', function(e) {
    var payload = e.data;
    //self.postMessage(message);

    if (payload['type'] && payload['type'] === 'add-exprs') {
        //self.equations = payload['objs'];
        
    } else if (payload['type'] && payload['type'] === 'add-particle-objs') {
        self.particles = payload['objs'];
    } else if (payload['type'] && payload['type'] === 'log-exprs') {
        //console.log(self.equations[0]);
        console.log(current_equations[0]);
    }

    //console.log(ce);
});