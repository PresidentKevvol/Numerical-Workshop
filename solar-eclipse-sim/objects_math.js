//azimuth & elevation angles to aframe vr coordinates
//inputs are in degrees instead of radians
// az=0   -> north = +x
// az=90  -> east  = +z
// az=180 -> south = -x
// az=270 -> west  = -z
function azim_elev_toaframe(az, el, r) {
    var a = az / 180 * Math.PI;
    var e = el / 180 * Math.PI;

    var x = r * Math.cos(e) * Math.cos(a);
    var y = r * Math.sin(e); //remember in aframe y is the up down axis
    var z = r * Math.cos(e) * Math.sin(a);

    return [x, y, z];
}

//an array of [x,y,z] to coord string for aframe
function to_coord_string(xyz) {
    return `${xyz[0]} ${xyz[1]} ${xyz[2]}`;
}

//get the hermite 2,2 interpolation polynomial from the 4 points
//returns the coefficients of a cubic polynomial
function hermite_2_2(f0, f1, df0, df1) {
    return [f0, df0, (-3*f0 +3*f1 -2*df0 -df1), (2*f0 -2*f1 +df0 +df1)];
}

//generates a function (code) for evaluating a cubic polynomial function (math)
function polynomial_lambda_3(c) {
    return function (x) {
        var res = 0;
        var xn = 1.0;
        for (var i=0; i<4; i++) {
            res += c[i] * xn;
            xn *= x;
        }
        return res;
        //return c[0] + c[1]*x + c[2]*x**2 + c[3]*x**3
    };
}

//generate all hermite polynomials for interpolating between the 'keyframes'
//body_angles is a [n, 4] array from nasa horizon data
function generate_hermite_polys(body_angles, delta_mins) {
    var res = [];
    for (var i=0; i<body_angles.length-1; i++) {
        var a0 = body_angles[i];
        var a1 = body_angles[i+1];

        var az_coeffs = hermite_2_2(a0[0], a1[0], a0[2]/3600*delta_mins, a1[2]/3600*delta_mins);
        var az_fn = polynomial_lambda_3(az_coeffs);

        var el_coeffs = hermite_2_2(a0[1], a1[1], a0[3]/3600*delta_mins, a1[3]/3600*delta_mins);
        var el_fn = polynomial_lambda_3(el_coeffs);

        res.push({
            az_coeffs: az_coeffs,
            az_fn: az_fn,
            el_coeffs: el_coeffs,
            el_fn: el_fn
        });
    }
    var result = {
        delta: delta_mins * 60,
        polys: res,
        get_angles: function(t) {
            //which array index to use
            var i = Math.floor(t / this.delta);
            //a value [0.0, 1.0] to interpolate with
            var x = (t - i * this.delta) / this.delta;

            var az = this.polys[i].az_fn(x);
            var el = this.polys[i].el_fn(x);
            return [az, el];
        },
    };

    return result;
}

//get the angles of a body based on hermite interpolation
//t is in seconds, counting from the beginning of the data the hermite polynomial set is based on
function get_angles_from_hermites(herm_polys, t) {

}

/*
below are for controlling the objects
*/
function set_body_pos(html_id, az, el, r) {
    var new_pos = azim_elev_toaframe(az, el, r);
    document.getElementById(html_id).setAttribute("position", to_coord_string(new_pos));
}

function set_body_pos_cart(html_id, xyz) {
    // var new_pos = azim_elev_toaframe(az, el, r);
    document.getElementById(html_id).setAttribute("position", to_coord_string(xyz));
}

function set_body_radius(html_id, r) {
    document.getElementById(html_id).setAttribute("radius", r);
}

function set_luna_color(rgb) {
    document.getElementById("Luna").setAttribute("color", rgb);
}

//the sky color at max/min brightness
var sky_max_color = [135, 206, 235];
var sky_min_color = [23, 33, 54];

//interpolate between two colors
//x range from 0 to 1
function color_interpolate(c0, c1, x) {
    var y = 1.0 - x;
    return [c0[0]*y+c1[0]*x, c0[1]*y+c1[1]*x, c0[2]*y+c1[2]*x];
}

function set_sky_color(rgb) {
    document.getElementById("sky-sphere").setAttribute("color", rgb);
}

//calculates the cover ratio (outputs 0.0 to 1.0)
//of how much luna is covering sol in viewer perspective
function calc_coverage_ratio(sol_azel, luna_azel, sol_dist, luna_dist) {
    var scale_factor = 1.0;
    var sol_radius_scaled = sol_radius / sol_dist;
    var luna_radius_scaled = luna_radius / luna_dist;

    // console.log(sol_radius_scaled);
    // console.log(luna_radius_scaled);

    //generate virtual position in a cartesian coord of sol and luna
    //i.e. assume the virtual objects are same distance from origin
    var sol_vpos = azim_elev_toaframe(sol_azel[0], sol_azel[1], scale_factor);
    var luna_vpos = azim_elev_toaframe(luna_azel[0], luna_azel[1], scale_factor);

    //get the euclidean/straight line distance
    var d = Math.hypot(Math.hypot(sol_vpos[0] - luna_vpos[0], sol_vpos[1] - luna_vpos[1]), sol_vpos[2] - luna_vpos[2]);
    //console.log(d);

    //if distance <= diff between radii -> complete cover -> total eclipse!
    if (d <= (luna_radius_scaled - sol_radius_scaled) * 2) {
        return 1.0;
    } else if (d >= sol_radius_scaled + luna_radius_scaled) { // if distance >= sum of radii -> no overlap
        return 0.0;
    }

    //then we utilize the scaled radius
    var rs = sol_radius_scaled;
    var rl = luna_radius_scaled;
    var rs2 = sol_radius_scaled * sol_radius_scaled;
    var rl2 = luna_radius_scaled * luna_radius_scaled;
    var d2 = d * d;

    var area = rs2 * Math.acos((d2 + rs2 - rl2) / 2*d*rs) + rl2 * Math.acos((d2 + rl2 - rs2) / 2*d*rl) - 0.5 * Math.sqrt((-d+rs+rl) * (d+rs-rl) * (d-rs+rl) * (d+rs+rl));

    //overlap area / sol virtual area
    return area / (Math.PI * rs2);
}