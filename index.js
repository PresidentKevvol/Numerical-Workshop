//the compute engine
var ce;

class Particle {
    constructor(x0, y0, z0, head_c, trail_c) {
        this.init_pos = [x0, y0, z0];
        this.pos_list = [this.init_pos,];

        this.head_color = head_c;
        this.trail_color = trail_c;
    }

    progress_tick(dt, exps, reps) {
        //get the current (latest) position
        var cur_pos = this.pos_list[this.pos_list.length - 1];

        //repeat this reps number of times
        for (var i=0; i<reps; i++) {
            var sub_vec = {x: cur_pos[0], y:cur_pos[1], z:cur_pos[2]};
            
            var x1 = cur_pos[0] + exps[0].subs(sub_vec).N().valueOf() * dt;
            var y1 = cur_pos[1] + exps[1].subs(sub_vec).N().valueOf() * dt;
            var z1 = cur_pos[2] + exps[2].subs(sub_vec).N().valueOf() * dt;
            
            // ce.set(sub_vec);
            // var x1 = cur_pos[0] + exps[0].N().valueOf() * dt;
            // var y1 = cur_pos[1] + exps[1].N().valueOf() * dt;
            // var z1 = cur_pos[2] + exps[2].N().valueOf() * dt;

            cur_pos = [x1, y1, z1];
        }

        //console.log(cur_pos);

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
//how many simulation ticks per animation frame
var skip_tick = 10;
//length of the trail of each particle in the animation
var trail_length = 0;

//flag for to pre compute the function values or not
var precompute = false;
//how many ticks to pre compute
var precompute_count;

//the setIinterval object (setInterval id)
var render_interval_obj;
//is animation playing?
var animation_playing = false;

var cur_frame = 0;

function ijs_setup() {
    //the math js fields for equations
    //access the expressions contained inside by equation_fields[i].expression
    equation_fields = document.getElementById("mid-2").getElementsByClassName('equation-field');

    document.getElementById("add-item").addEventListener("click", add_item_clicked);

    //create the first particle entry
    add_item_clicked();

    document.getElementById("start-render").addEventListener("click", start_rendering_clicked);
    document.getElementById("pause-render").addEventListener("click", pause_rendering_clicked);
    document.getElementById("reset-sim").addEventListener("click", reset_simulation_clicked);

    document.getElementById("export-sim").addEventListener("click", export_btn_clicked);
    document.getElementById("export-sim-url").addEventListener("click", export_url_btn_clicked);
    document.getElementById("export-sim-url").addEventListener("mouseout", outFunc);
    document.getElementById("import-sim").addEventListener("click", import_btn_clicked);

    //call when all math fields properly loaded
    equation_fields[2].addEventListener('mount', load_url_setup);
}

//load setup described in url param if there is any
function load_url_setup(){
    //when fully loaded, check if there is url params for settings
    var urlParams = new URLSearchParams(window.location.search);
    var setup_obj = urlParams.get('s');
    if (setup_obj) {
        import_setup(JSON.parse(setup_obj));
    }
}

//add an initial particle to the simulation space
function add_item_clicked() {
    var clon = document.getElementById("templates").getElementsByClassName("particle-init-entry")[0].cloneNode(true);

    clon.getElementsByClassName("remove-x")[0].addEventListener("click", function(e){
        var entry_div = e.target.parentNode;
        var parent_div = entry_div.parentNode

        parent_div.removeChild(entry_div)
    });

    document.getElementById("particles-init-pos").appendChild(clon);
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

        var particle_color = init_pos_fields[i].getElementsByClassName("particle-color")[0].value;
        var trail_color = init_pos_fields[i].getElementsByClassName("trail-color")[0].value;

        var p = new Particle(x0, y0, z0, particle_color, trail_color);
        res.push(p);
    }

    return res;
}

//when the start button is pressed
function start_rendering_clicked() {
    reset_simulation_clicked();

    //read the current equations into the equations list for usage
    current_equations = [];
    for (var i=0; i<equation_fields.length; i++) {
        current_equations.push(equation_fields[i].expression);
    }

    //adjust base settings
    time_step = parseFloat(document.getElementById("num-time-step").value);
    skip_tick = parseFloat(document.getElementById("anim-frame-step").value);
    trail_length = parseFloat(document.getElementById("anim-trail-length").value);
    //precompute = document.getElementById("chkbox-precompute").checked;

    precompute_count = 1000;
    
    //initialize particles
    current_particles = get_init_pos();
    var scene = document.getElementById("vr-scene");
    //var templates = document.getElementById("vr-templates");
    for (var i=0; i<current_particles.length; i++) {
        //var trail_color = current_particles[i].trail_color;
        var cur_line = document.createElement('a-entity');
        cur_line.setAttribute("class", "trajectory-lines");
        //cur_line.setAttribute("material", "color:" + trail_color + ";");

        var head_color = current_particles[i].head_color;
        var cur_head = document.createElement('a-entity');
        cur_head.setAttribute("class", "part-heads");
        cur_head.setAttribute("geometry", "primitive: cone; radiusBottom: 0.06; radiusTop: 0.0; height:0.12; segmentsRadial:3; ");
        cur_head.setAttribute("material", "color:" + head_color + ";");
        cur_head.setAttribute("position", "0 0 0");

        scene.appendChild(cur_line);
        scene.appendChild(cur_head);
    }

    if (precompute) {
        var t_start = window.performance.now();

        for (var j=0; j<precompute_count; j++) {
            for (var i=0; i<current_particles.length; i++) {
                current_particles[i].progress_tick(time_step, current_equations, skip_tick);
            }
        }

        var t_end = window.performance.now();

        console.log("precompute " + precompute_count + " frames takes:" + (t_end - t_start));

        //test codes
        //var worker = new Worker('worker_threads.js'); 

        return;
    }

    cur_frame = 0;
    render_interval_obj = setInterval(render_interval_func, 25);
    animation_playing = true;
}

function pause_rendering_clicked(e) {
    if (animation_playing) { //if it is playing
        clearInterval(render_interval_obj);
        e.target.innerHTML = "Resume";
        animation_playing = false;
    } else { //if it is already paused
        render_interval_obj = setInterval(render_interval_func, 25);
        e.target.innerHTML = "Pause";
        animation_playing = true;
    }
}

function reset_simulation_clicked() {
    clearInterval(render_interval_obj);
    animation_playing = false;

    var scene = document.getElementById("vr-scene");
    var heads = scene.getElementsByClassName("part-heads");
    var lines = scene.getElementsByClassName("trajectory-lines");

    while(heads.length > 0){
        scene.removeChild(heads[0]);
    }
    while(lines.length > 0){
        scene.removeChild(lines[0]);
    }

    current_particles = [];
    current_equations = [];
    cur_frame = 0;
}

function render_interval_func() {
    var particle_trails = document.getElementById("vr-scene").getElementsByClassName("trajectory-lines");
    var particle_heads = document.getElementById("vr-scene").getElementsByClassName("part-heads");

    //for each particle
    for (var i=0; i<current_particles.length; i++) {
        current_particles[i].progress_tick(time_step, current_equations, skip_tick);

        var pos_list = current_particles[i].pos_list;
        var cur_pos = pos_list[pos_list.length - 1];

        //if NaN value encountered i.e. the sysyem numerically exploded
        //stop the simulation
        if (isNaN(cur_pos[0]) || isNaN(cur_pos[1]) || isNaN(cur_pos[2])) {
            clearInterval(render_interval_obj);
        }

        particle_heads[i].setAttribute("position", cur_pos.join(" "));

        if (current_particles[i].pos_list.length > 1) {
            var prv_pos = pos_list[pos_list.length - 2];
            //"line__2", "line__3", etc. for each segment
            var attr_name = "line__" + current_particles[i].pos_list.length;
            //value will be like "start: 0 4 -3; end: 1 5 -3; color: white;"
            var attr_valu = "start: " + prv_pos.join(" ") + "; end: " + cur_pos.join(" ") + "; color: " + current_particles[i].trail_color + ";";
            //var attr_valu = "start: " + prv_pos.join(" ") + "; end: " + cur_pos.join(" ") + ";";
            //console.log(attr_valu);
            particle_trails[i].setAttribute(attr_name, attr_valu);

            if (trail_length > 0 && pos_list.length + 1 > trail_length) { //if non infinite trail length
                particle_trails[i].removeAttribute("line__" + (current_particles[i].pos_list.length + 1 - trail_length));
            }
        }
    }

    cur_frame ++;
}

function export_btn_clicked() {
    var obj = export_setup();
    var obj_str = JSON.stringify(obj, null, 2);
    document.getElementById("setting-json").value = obj_str;
}

//export the current settings as a url with argument
function export_url_btn_clicked() {
    var obj = export_setup();
    var url_arg = encodeURIComponent(JSON.stringify(obj));
    var res = window.location.href.split(/[?#]/)[0] + "?s=" + url_arg;
    //put in clipboard
    navigator.clipboard.writeText(res);
    var tooltip = document.getElementById("url-copied-tooltip");
    tooltip.innerHTML = "Copied url of current setup to clipboard";
}
function outFunc() {
    var tooltip = document.getElementById("url-copied-tooltip");
    tooltip.innerHTML = "Copy to clipboard";
}

function import_btn_clicked() {
    //import from the text field
    var obj_str = document.getElementById("setting-json").value;
    var obj = JSON.parse(obj_str);
    import_setup(obj);
}

//export the equation, initial particle positions, settings, etc. as a json object
function export_setup() {
    //equations
    var eqns = {
        'x': equation_fields[0].value, 
        'y': equation_fields[1].value, 
        'z': equation_fields[2].value
    };

    //particles
    var prts = [];
    var init_pos_fields = document.getElementById("particles-init-pos").getElementsByClassName("particle-init-entry");
    //read particles inits
    for (var i=0; i<init_pos_fields.length; i++) {
        var coords = init_pos_fields[i].getElementsByClassName("coord-init");

        var x0 = parseFloat(coords[0].value);
        var y0 = parseFloat(coords[1].value);
        var z0 = parseFloat(coords[2].value);

        var particle_color = init_pos_fields[i].getElementsByClassName("particle-color")[0].value;
        var trail_color = init_pos_fields[i].getElementsByClassName("trail-color")[0].value;

        var p = {
            'x': x0, 
            'y': y0, 
            'z': z0,
            'particle_color': particle_color,
            'trail_color': trail_color
        };
        prts.push(p);
    }

    //resulting object
    var res = {
        'equations': eqns,
        'particle_inits': prts,
        'dt': parseFloat(document.getElementById("num-time-step").value),
        'skips': parseFloat(document.getElementById("anim-frame-step").value)
    };
    return res;
}

function import_setup(ob) {
    //start with the equation fields
    if (ob.equations){
        equation_fields[0].value = ob.equations.x;
        equation_fields[1].value = ob.equations.y;
        equation_fields[2].value = ob.equations.z;
    }

    //then particles
    if (ob.particle_inits) {
        var init_pos_contain = document.getElementById("particles-init-pos");
        //clear existing ones
        while (init_pos_contain.firstChild) {
            init_pos_contain.removeChild(init_pos_contain.lastChild);
        }
        //insert new particle init entry cards
        for (var i=0; i<ob.particle_inits.length; i++) {
            var cur_p = ob.particle_inits[i];
            add_item_clicked();
            //object color in the VR space
            if (cur_p.particle_color) {
                var particle_color = init_pos_contain.lastChild.getElementsByClassName("particle-color")[0];
                particle_color.value = cur_p.particle_color;
            }
            if (cur_p.trail_color) {
                var trail_color = init_pos_contain.lastChild.getElementsByClassName("trail-color")[0];
                trail_color.value = cur_p.trail_color;
            }
            //coord values
            var coords = init_pos_contain.lastChild.getElementsByClassName("coord-init");
            if (cur_p.x) { coords[0].value = cur_p.x; }
            if (cur_p.y) { coords[1].value = cur_p.y; }
            if (cur_p.z) { coords[2].value = cur_p.z; }
        }
    }
    

    //then numerical settings
    if (ob.dt) { document.getElementById("num-time-step").value = ob.dt; }
    if (ob.skips) { document.getElementById("anim-frame-step").value = ob.skips; }
    if (ob.trail_length) { document.getElementById("anim-trail-length").value = ob.trail_length; }
}

document.addEventListener("DOMContentLoaded", ijs_setup);
