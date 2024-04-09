var sol;
var corona;
var luna;

var animation_playing = false;

//the current time in the simulation world
//a float representing seconds from start time
var cur_simulation_time = 0.0;
var cur_simulation_speed = 1;

//the list of hermite polynomials for interpolating the angles of sol and luna
var sol_angle_hermites;
var luna_angle_hermites;

//the sky color at max/min brightness
var sky_max_color = [135, 206, 235];
var sky_min_color = [23, 33, 54];

AFRAME.registerShader('custom-shader-1', {
    schema: {
      color: {type: 'color', is: 'uniform', default: 'red'},
      opacity: {type: 'number', is: 'uniform', default: 1.0},
      timeMsec: {type: 'time', is: 'uniform'}
    },
    fragmentShader: custom1_fragmentShader, 
    vertexShader: default_vertexShader
});

AFRAME.registerShader('corona', {
    schema: {
      color: {type: 'color', is: 'uniform', default: 'white'},
      opacity: {type: 'number', is: 'uniform', default: 1.0},
      cutoff: {type: 'number', is: 'uniform', default: 0.0},
      timeMsec: {type: 'time', is: 'uniform'},
      trueTimeMsec: {type: 'number', is: 'uniform', default: 0.0}
    },
    fragmentShader: corona_fragmentShader, 
    vertexShader: default_vertexShader
});

var cam_fov = 80;
var cam_zoom = 1;

//the current setup and data
//contains the dataset loaded from NASA horizons, the hermite polynomials,
//actual dist of sol & luna, and the time offset to render clock & load data at pointx of time from arrays
var cur_setup_data = false;

//when the simulation speed slider is changed
function sim_speed_change(e) {
    document.getElementById("sim-speed-span").innerHTML = e.target.value + 'x';
    cur_simulation_speed = parseFloat(e.target.value);
}

//when the simulation speed slider is changed
function cam_fov_change(e) {
    cam_fov = e.target.value;
    document.getElementById("sim-camfov-span").innerHTML = e.target.value;
    document.getElementById("aframe-camera").setAttribute("camera", `fov: ${cam_fov}; zoom: ${cam_zoom};`);

    //trigger resize event to fix aspect ratio in embed mode
    window.dispatchEvent(new Event('resize'));
}
function cam_zoom_change(e) {
    cam_zoom = e.target.value;
    document.getElementById("sim-camzoom-span").innerHTML = e.target.value + 'x';
    document.getElementById("aframe-camera").setAttribute("camera", `fov: ${cam_fov}; zoom: ${cam_zoom};`);

    //trigger resize event to fix aspect ratio in embed mode
    window.dispatchEvent(new Event('resize'));
}

// manually change zoom, called by other code
function change_zoom(z) {
    cam_zoom = z;
    document.getElementById("sim-camzoom-span").innerHTML = z + 'x';
    document.getElementById("aframe-camera").setAttribute("camera", `fov: ${cam_fov}; zoom: ${cam_zoom};`);

    document.getElementById("sim-camzoom").value = z;

    //trigger resize event to fix aspect ratio in embed mode
    window.dispatchEvent(new Event('resize'));
}

//when sim time i.e. the play progress bar dragged
function sim_time_change(e) {
    if (cur_setup_data === false) {
        return;
    }

    var time_new = parseFloat(e.target.value);
    set_play_bar(time_new, cur_setup_data.start_time_local, false);

    cur_simulation_time = time_new;
    render_simworld_at_time(cur_simulation_time);
}

var prev_time = 0.0;
//true time delta of the page from load
var trueTime = 0.0;
//the function called each frame tick to advance the simulation
//time and timedelta are in milliseconds
function render_interval_func(time, timeDelta) {
    //test code
    // console.log("t: " + time + "\n td: " + timeDelta);
    // prev_time = time;
    trueTime = time;

    cur_simulation_time += (timeDelta/1000.0 * cur_simulation_speed);
    set_play_bar(cur_simulation_time, cur_setup_data.start_time_local, true);

    render_simworld_at_time(cur_simulation_time);
}

//update_slider to true if we want to manually change the slider
//delta is how much to add to the <span> containing the time
function set_play_bar(t, delta, update_slider) {
    if (update_slider) {
        document.getElementById("sim-time").value = t;
    }

    t = t + delta;

    h = Math.floor(t / 3600);
    h = (h<10) ? '0' + h : '' + h;
    t = t - h * 3600;
    m = Math.floor(t / 60);
    m = (m<10) ? '0' + m : '' + m;
    t = t - m * 60;
    s = Math.floor(t);
    s = (s<10) ? '0' + s : '' + s;


    document.getElementById("sim-time-span").innerHTML = `${h}:${m}:${s}`;
}

//given a time t in seconds (counting from start of simulation)
//render the simulation world with sol and luna's position, sky color, etc.
function render_simworld_at_time(t) {
    if (cur_setup_data === false) {
        return;
    }

    //TODO: set position of sol and luna
    //the U0 time of the current simulation frame
    var array_time_greenwich = cur_setup_data.start_time_dataset + t;
    var sol_a = sol_angle_hermites.get_angles(array_time_greenwich)
    var lun_a = luna_angle_hermites.get_angles(array_time_greenwich)
    set_body_pos("Sol", sol_a[0], sol_a[1], cur_setup_data.sol_dist / scale_factor);
    set_body_pos("Luna", lun_a[0], lun_a[1], cur_setup_data.luna_dist / scale_factor);

    //TODO: calculate coverage ratio and change sky color accordingly
    var coverage = calc_coverage_ratio(sol_a, lun_a, cur_setup_data.sol_dist, cur_setup_data.luna_dist);
    //test code
    //console.log(coverage);
    //thus, calculate the sky's color and match luna's color to it
    var sky_color = color_interpolate(sky_max_color, sky_min_color, coverage);
    var color_str = to_color_str(sky_color);
    set_sky_color(color_str);
    set_luna_color(color_str);

    //TODO: if coverage ratio >= 0.98, show corona
    var corona_opacity = (coverage - 0.98) / (1.0 - 0.98);
    if (corona_opacity <= 0.0) {
        corona_opacity = 0.0;
    }
    //corona_opacity = Math.round(corona_opacity * 20) / 20;
    
    // var mat = corona.getAttributeNode("material").nodeValue;
    // var spl = mat.split("opacity:");
    // var spl2 = spl[1].split(";");
    // var new_mat = spl[0] + "opacity:" + corona_opacity + spl2.slice(1).join(';');
    // corona.setAttribute("material", new_mat);
    // corona.getObject3D('mesh').material.opacity = corona_opacity;
    // corona.getObject3D('mesh').material.needsUpdate = true;
    corona.setAttribute("material", "opacity:" + corona_opacity + ";" + "trueTimeMsec:" + trueTime + ";");
}

function set_sol_luna_size(fudge) {
    set_body_radius("Sol", sol_radius / (scale_factor / fudge));
    set_body_radius("Sol-corona", sol_radius * 5 / (scale_factor / fudge));
    set_body_radius("Luna", luna_radius / (scale_factor / fudge));
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
function export_setup() {}

function import_setup(ob) {}

//load a new setup object
function load_setup(setup_obj) {
    cur_setup_data = setup_obj;
    setup_obj.sol_pos_ary = observer_ephemeris_toarray(setup_obj.sol_pos_data);
    setup_obj.luna_pos_ary = observer_ephemeris_toarray(setup_obj.luna_pos_data);
    sol_angle_hermites = generate_hermite_polys(setup_obj.sol_pos_ary, 5);
    luna_angle_hermites = generate_hermite_polys(setup_obj.luna_pos_ary, 5);
    document.getElementById("sim-time").setAttribute("max", setup_obj.duration);
}

function load_sim_pressed() {
    var checked = document.getElementById("caution-understood").checked;
    if (checked) {
        //load the corresponding setup data
        var selection = document.getElementById("select-eclipse").value;
        load_setup(setups_map[selection]);
        //initial setup
        cur_simulation_time = 0;
        set_play_bar(cur_simulation_time, cur_setup_data.start_time_local, true);
        render_simworld_at_time(cur_simulation_time);

        //point the camera at sun
        document.getElementById("aframe-camera").setAttribute('look-controls', {enabled: false});
        var sol_pos = document.getElementById("Sol").getAttribute("position");
        document.getElementById("aframe-camera").sceneEl.camera.lookAt(sol_pos.x, sol_pos.y, sol_pos.z);
        document.getElementById("aframe-camera").setAttribute('look-controls', {enabled: true});

        //focus on sol
        change_zoom(4.5);
    }
}

function ijs_setup() {
    sol = document.getElementById("Sol");
    corona = document.getElementById("Sol-corona");
    luna = document.getElementById("Luna");

    document.getElementById("sim-speed").addEventListener("input", sim_speed_change);
    document.getElementById("sim-camfov").addEventListener("input", cam_fov_change);
    document.getElementById("sim-camzoom").addEventListener("input", cam_zoom_change);
    
    document.getElementById("sim-time").addEventListener("input", sim_time_change);

    document.getElementById("pause-render").addEventListener("click", function() {
        if (cur_setup_data === false) {
            return;
        }    
        animation_playing = false;
    });
    document.getElementById("play-sim").addEventListener("click", function() {
        if (cur_setup_data === false) {
            return;
        }    
        animation_playing = true;
    });

    document.getElementById("start-render").addEventListener("click", load_sim_pressed);

    //for collapsables
    var coll = document.getElementsByClassName("collapsible");
    for (var i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function() {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.display === "block") {
                content.style.display = "none";
                this.getElementsByClassName("collapsible-indicator")[0].innerHTML = "+";
            } else {
                content.style.display = "block";
                this.getElementsByClassName("collapsible-indicator")[0].innerHTML = "-";
            }
        });
    }

    //setup the body's sizes
    set_sol_luna_size(1.0);

    //place them under the floor for start
    set_body_pos("Sol", 0, -90, sol_distance_2024_04_08_totality / scale_factor);
    set_body_pos("Luna", 0, -90, luna_distance_2024_04_08_totality / scale_factor);
}

document.addEventListener("DOMContentLoaded", ijs_setup);