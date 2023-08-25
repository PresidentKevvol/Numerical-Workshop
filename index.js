class Particle {
    constructor(x0, y0, z0) {
        this.init_pos = [x0, y0, z0];
        this.pos_list = [this.init_pos,];
    }

    progress_tick(dt, exps, reps) {
        //get the current (latest) position
        var cur_pos = this.pos_list[this.pos_list.length - 1];

        //repeat this many times
        for (var i=0; i<reps; i++) {
            var sub_vec = {x: cur_pos[0], y:cur_pos[1], z:cur_pos[2]};
            var x1 = cur_pos[0] + exps[0].subs(sub_vec).N().valueOf() * dt;
            var y1 = cur_pos[1] + exps[1].subs(sub_vec).N().valueOf() * dt;
            var z1 = cur_pos[2] + exps[2].subs(sub_vec).N().valueOf() * dt;
            cur_pos = [x1, y1, z1];
        }

        //console.log([x1, y1, z1]);
        // console.log(exps[0]);
        // console.log(exps[0].subs(sub_vec));
        // console.log(exps[0].subs(sub_vec).N());
        // console.log(exps[0].subs(sub_vec).N().valueOf());

        this.pos_list.push(cur_pos);
    }
}

var equation_fields;

//the current RHS of the diff equation system used in the simulation
var current_equations;
//current set of particles
var current_particles;
//time step
var time_step = 0.001;

//the setIinterval object
var render_interval_obj;

function ijs_setup() {
    //the math js fields for equations
    //access the expressions contained inside by equation_fields[i].expression
    equation_fields = document.getElementById("mid-2").getElementsByClassName('equation-field');

    document.getElementById("start-render").addEventListener("click", start_rendering_clicked);
}

function get_init_pos() {
    var init_pos_fields = document.getElementById("particles-init-pos").getElementsByClassName("particle-init-entry");
    var res = [];

    //spawn particles
    for (var i=0; i<init_pos_fields.length; i++) {
        var coords = init_pos_fields[i].getElementsByClassName("coord-init");

        var x0 = parseFloat(coords[0].value);
        var y0 = parseFloat(coords[1].value);
        var z0 = parseFloat(coords[2].value);

        var p = new Particle(x0, y0, z0);
        res.push(p);
    }

    return res;
}

//when the start button is pressed
function start_rendering_clicked() {
    //read the current equations into the equations list for usage
    current_equations = [];
    for (var i=0; i<equation_fields.length; i++) {
        current_equations.push(equation_fields[i].expression);
    }

    //initialize particles
    current_particles = get_init_pos();

    render_interval_obj = setInterval(render_interval_func, 25);
}

function render_interval_func() {
    var particle_trails = document.getElementById("vr-scene").getElementsByClassName("trajectory-lines");
    var particle_heads = document.getElementById("vr-scene").getElementsByClassName("part-heads");

    //for each particle
    for (var i=0; i<current_particles.length; i++) {
        current_particles[i].progress_tick(time_step, current_equations, 10);

        var pos_list = current_particles[i].pos_list;
        var cur_pos = pos_list[pos_list.length - 1];

        particle_heads[i].setAttribute("position", cur_pos.join(" "));

        if (current_particles[i].pos_list.length > 1) {
            var prv_pos = pos_list[pos_list.length - 2];
            //"line__2", "line__3", etc. for each segment
            var attr_name = "line__" + current_particles[i].pos_list.length;
            //value will be like "start: 0 4 -3; end: 1 5 -3; color: white;"
            var attr_valu = "start: " + prv_pos.join(" ") + "; end: " + cur_pos.join(" ") + "; color: white;";
            //console.log(attr_valu);
            particle_trails[i].setAttribute(attr_name, attr_valu);
        }
    }
}

document.addEventListener("DOMContentLoaded", ijs_setup);
