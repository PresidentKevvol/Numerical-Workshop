var sol;
var luna;

var animation_playing = false;

//the current time in the simulation world
//a float representing seconds from start time
var cur_simulation_time = 0.0;
var cur_simulation_speed = 1;

//test value, the simulation for buffalo starts at 1:30pm at U -4 time zone
var buffalo_2024_04_08_start_time = (1.5+12 + 4) * 3600;

//the list of hermite polynomials for interpolating the angles of sol and luna
var sol_angle_hermites;
var luna_angle_hermites;

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
      timeMsec: {type: 'time', is: 'uniform'}
    },
    fragmentShader: corona_fragmentShader, 
    vertexShader: default_vertexShader
});

var cam_fov = 80;
var cam_zoom = 1;

//when the simulation speed slider is changed
function sim_speed_change(e) {
    document.getElementById("sim-speed-span").innerHTML = e.target.value + 'x';
    cur_simulation_speed = parseFloat(e.target.value);
}

//when the simulation speed slider is changed
function cam_fov_change(e) {
    cam_fov = e.target.value;
    document.getElementById("sim-camfov-span").innerHTML = e.target.value;
    document.getElementById("aframe-camera").setAttribute("camera", `far: 120000000; fov: ${cam_fov}; zoom: ${cam_zoom};`);
}
function cam_zoom_change(e) {
    cam_zoom = e.target.value;
    document.getElementById("sim-camzoom-span").innerHTML = e.target.value + 'x';
    document.getElementById("aframe-camera").setAttribute("camera", `far: 120000000; fov: ${cam_fov}; zoom: ${cam_zoom};`);
}

function sim_time_change(e) {
    var time_new = parseFloat(e.target.value);
    set_play_bar(time_new, false);

    cur_simulation_time = time_new;
    render_simworld_at_time(cur_simulation_time);
}

var prev_time = 0.0;
//the function called each frame tick to advance the simulation
//time and timedelta are in milliseconds
function render_interval_func(time, timeDelta) {
    //test code
    // console.log("t: " + time + "\n td: " + timeDelta);
    // prev_time = time;

    cur_simulation_time += (timeDelta/1000.0 * cur_simulation_speed);
    set_play_bar(cur_simulation_time, true);

    render_simworld_at_time(cur_simulation_time);
}

//update_slider to true if we want to manually change the slider
function set_play_bar(t, update_slider) {
    if (update_slider) {
        document.getElementById("sim-time").value = t;
    }

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
    //TODO: set position of sol and luna
    //the U0 time of the current simulation frame
    var array_time_greenwich = buffalo_2024_04_08_start_time + t;
    var sol_a = sol_angle_hermites.get_angles(array_time_greenwich)
    var lun_a = luna_angle_hermites.get_angles(array_time_greenwich)
    set_body_pos("Sol", sol_a[0], sol_a[1], sol_distance_2024_04_08_totality / scale_factor);
    set_body_pos("Luna", lun_a[0], lun_a[1], luna_distance_2024_04_08_totality / scale_factor);

    //TODO: calculate coverage ratio and change sky color accordingly
    var coverage = calc_coverage_ratio(sol_a, lun_a, sol_distance_2024_04_08_totality, luna_distance_2024_04_08_totality);
    //test code
    console.log(coverage);

    //TODO: if coverage ratio > 0.96, show corona
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
function export_setup() {
}

function import_setup(ob) {
}

function ijs_setup() {
    sol = document.getElementById("Sol");
    luna = document.getElementById("Luna");

    //generate the hermite polynomials
    sol_angle_hermites = generate_hermite_polys(sol_data_test, 5);
    luna_angle_hermites = generate_hermite_polys(luna_data_test, 5);

    document.getElementById("sim-speed").addEventListener("input", sim_speed_change);
    document.getElementById("sim-camfov").addEventListener("input", cam_fov_change);
    document.getElementById("sim-camzoom").addEventListener("input", cam_zoom_change);
    
    document.getElementById("sim-time").addEventListener("input", sim_time_change);

    //animation_playing = true;
    //simulate_interval = setInterval(page_update_interval, 25);

    document.getElementById("pause-render").addEventListener("click", function() {animation_playing = false;});
    document.getElementById("play-sim").addEventListener("click", function() {animation_playing = true;});


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

    //place them under the floor
    set_body_pos("Sol", 0, -90, sol_distance_2024_04_08_totality / scale_factor);
    set_body_pos("Luna", 0, -90, luna_distance_2024_04_08_totality / scale_factor);

}

document.addEventListener("DOMContentLoaded", ijs_setup);