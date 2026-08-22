var cur_molecule_mo_coeffs = [];

/*
the molecule template object will have the following fields
atoms: list of objects that look like {"elem": int, "coord": vec3}
box: the bounding box, [[-x, +x], [-y, +y], [-z, +z]]
mo_coeffs: list of list of floats, each are a list of what amplitudes to multiply which atomic orbital to get the molecular orbital
orbital_indices: list of list of 2 ints representing which index in mo_coeffs is which atomic orbital, first number is index of atom, second number is index of orbital of that atom
*/
async function import_setup(ob) {
    // first center the bounding box since all aframe a-box have (0, 0, 0) as the half the width/height/depth
    var shifts = [];
    var dims = [];
    for (var i=0; i<ob.box.length; i++) {
        // the range of this dimension
        var dim_range = ob.box[i];
        var size = dim_range[1] - dim_range[0];
        // center of space of the 'original' bounding box, if we shift by -ve of this to make center 0
        var old_center = (dim_range[0] + dim_range[1]) / 2;

        shifts.push(-old_center);
        dims.push(size);
    }

    // get the 3d diagonal of the bounding box
    var diag = Math.hypot(...dims);
    // we want to scale it down such that the diagonal i.e. length of the potential longest ray does not exceed 2.0
    // in the box's perspective coordinates (if you strech or shrinks it it changes the scale aframe param but the box's size to itself does not change)
    var scale_factor = 2.0 / diag;

    var new_box = {x: dims[0]*scale_factor, y: dims[1]*scale_factor, z: dims[2]*scale_factor};

    // we are putting the molecule into this a-box
    const targ = document.getElementById('orbital-box');

    //set its a-box dimensions as well as the shader's uniform
    targ.setAttribute("width", new_box.x);
    targ.setAttribute("height", new_box.y);
    targ.setAttribute("depth", new_box.z);
    targ.setAttribute("material", {boxDim: new_box});

    // shift the atoms to this new 0 centered bounding box
    var atoms_new = [];
    for (var i=0; i<ob.atoms.length; i++) {
        var a = ob.atoms[i];
        var a1 = {elem: a.elem, coord: [a.coord[0] + shifts[0], a.coord[1] + shifts[1], a.coord[2] + shifts[2]]};
        atoms_new.push(a1);
    }

    // code injection for efficiency!
    // we essentially create a nnew shader
    await register_shader_injection(atoms_new, diag/2.0, ob.orbital_indices);

    targ.setAttribute("material", {shader: "volumetric-new"});
    // cache for later function call access
    cur_molecule_mo_coeffs = ob.mo_coeffs;

    // set the box to have first MO
    set_box_mo_coeffs(ob.mo_coeffs[0]);

    create_choose_orbital_panel(ob.mo_coeffs.length);
}

function generate_select_mo_eventlistener(i) {
    return function () {set_box_mo_coeffs(cur_molecule_mo_coeffs[i]);};
}

function generate_select_ao_eventlistener(i, num_ao) {
    return function () {var a = new Float32Array(num_ao); a[i] = 1.0; set_box_mo_coeffs(a);};
}

//generate the panel for choosing which mo to visualize
function create_choose_orbital_panel(num_mo) {
    var panel = document.getElementById('html-panel');
    var mo_container_div = panel.getElementsByClassName("mo-selection")[0];
    mo_container_div.replaceChildren();
    for (var i=0; i<num_mo; i++) {
        var btn = document.createElement('button');
        btn.innerHTML = i;
        btn.addEventListener('click', generate_select_mo_eventlistener(i));
        mo_container_div.appendChild(btn);
    }

    // for pure ao too
    var ao_container_div = panel.getElementsByClassName("ao-selection")[0];
    ao_container_div.replaceChildren();
    for (var i=0; i<num_mo; i++) {
        var btn = document.createElement('button');
        btn.innerHTML = i;
        btn.addEventListener('click', generate_select_ao_eventlistener(i, num_mo));
        ao_container_div.appendChild(btn);
    }
}

// set the AO to MO coefficients to visualize by setting the shader box's shader's uniforms
function set_box_mo_coeffs(coeffs) {
    const targ = document.getElementById('orbital-box');
    var mo_schema = {};
    for (var i=0; i<coeffs.length; i++) {
        mo_schema[`mo_coeff_${i}`] = coeffs[i];
    }
    targ.setAttribute("material", mo_schema);
}

function ijs_setup() {

}

document.addEventListener("DOMContentLoaded", ijs_setup);