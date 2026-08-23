var MARCH_MAX_STEP = 50;

// use ajax request to load fragment shader
async function loadShader(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load shader: ${url}`);
    }
    return await response.text();
}

const default_vertshade = `
varying vec3 vWorldPosition;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

AFRAME.registerShader('volumetric', {
    schema: {
        opacity: {type: 'number', is: 'uniform', default: 1.0},
        boxDim: {type: 'vec3', is: 'uniform', default: {x: 5.0, y: 5.0, z: 5.0}},
        posColor: {type: 'vec3', is: 'uniform', default: {x: 0.9, y: 0.5, z: 0.1}},
        negColor: {type: 'vec3', is: 'uniform', default: {x: 0.2, y: 0.6, z: 0.9}},
        orbitalChoice: {type: 'int', is: 'uniform', default: 9}
    },
    vertexShader: default_vertshade,
    fragmentShader: `
#define PI 3.1415926535897932384626433832795
#define SQRT_PI_INV 0.5641895835477562869480794515607725858

#define MARCH_MAX_STEP 100.0
// #define BOX_COORD_DT length(boxDim) / MARCH_MAX_STEP

uniform mat4 modelMatrix;
varying vec3 vWorldPosition;

// size of the box
uniform vec3 boxDim;
// positive and negative amplitude color
uniform vec3 posColor;
uniform vec3 negColor;

// which standalone real valued orbital to render
uniform int orbitalChoice;

float densityCap = 0.25;

// convert a vec3 in cartesian to spherical coordinates
// note: in the cartesian here, z is up
// in the returning vec3, x will be r, radial distance; y will be theta, azimuth angle; z will be phi, polar angle
vec3 cartToSphe(vec3 p) {
    float r = length(p);
    float t = acos(p.z / r);
    float ph = atan(p.y, p.x);
    return vec3(r, t, ph);
}

// functions for the orbitals
// all of these takes in a vector point in spherical coordinate and gives a complex
float orb_1s(vec3 p, float Z) {
    float rh = Z * p.x;
    float Z_1_5 = Z * sqrt(Z);
    float R = exp(-rh);
    float Y = SQRT_PI_INV * Z_1_5;
    return R*Y;
}
float orb_2s(vec3 p, float Z) {
    float rh = Z * p.x;
    float Z_1_5 = Z * sqrt(Z);
    float R = (2.0 - rh) * exp(-rh/2.0);
    float Y = 1.0/sqrt(32.0) * SQRT_PI_INV * Z_1_5;
    return R*Y;
}
float orb_2pz(vec3 p, float Z) {
    float rh = Z * p.x;
    float Z_1_5 = Z * sqrt(Z);
    float R = rh * exp(-rh/2.0);
    float Y = 1.0/sqrt(32.0) * SQRT_PI_INV * Z_1_5 * cos(p.y);
    return R*Y;
}
float orb_2px(vec3 p, float Z) {
    float rh = Z * p.x;
    float Z_1_5 = Z * sqrt(Z);
    float R = rh * exp(-rh/2.0);
    float Y = 1.0/sqrt(32.0) * SQRT_PI_INV * Z_1_5 * sin(p.y) * cos(p.z);
    return R*Y;
}
float orb_2py(vec3 p, float Z) {
    float rh = Z * p.x;
    float Z_1_5 = Z * sqrt(Z);
    float R = rh * exp(-rh/2.0);
    float Y = 1.0/sqrt(32.0) * SQRT_PI_INV * Z_1_5 * sin(p.y) * sin(p.z);
    return R*Y;
}

float orb_3s(vec3 p, float Z) {
    float rh = Z * p.x;
    float Z_1_5 = Z * sqrt(Z);
    float R = (27.0 - 18.0 * rh + 2.0 * rh*rh) * exp(-rh/3.0);
    float Y = 1.0/(81.0*sqrt(3.0)) * SQRT_PI_INV * Z_1_5;
    return R*Y;
}
float orb_3pz(vec3 p, float Z) {
    float rh = Z * p.x;
    float Z_1_5 = Z * sqrt(Z);
    float R = rh * (6.0 - rh) * exp(-rh/3.0);
    float Y = sqrt(2.0)/81.0 * SQRT_PI_INV * Z_1_5 * cos(p.y);
    return R*Y;
}
float orb_3px(vec3 p, float Z) {
    float rh = Z * p.x;
    float Z_1_5 = Z * sqrt(Z);
    float R = rh * (6.0 - rh) * exp(-rh/3.0);
    float Y = sqrt(2.0)/81.0 * SQRT_PI_INV * Z_1_5 * sin(p.y) * cos(p.z);
    return R*Y;
}
float orb_3py(vec3 p, float Z) {
    float rh = Z * p.x;
    float Z_1_5 = Z * sqrt(Z);
    float R = rh * (6.0 - rh) * exp(-rh/3.0);
    float Y = sqrt(2.0)/81.0 * SQRT_PI_INV * Z_1_5 * sin(p.y) * sin(p.z);
    return R*Y;
}
// wave function of 3d0 aka 3dz^2 orbital (one with 2 lobes and a hula hoop)
// real value only
float orb_3dz2(vec3 p, float Z) {
    float rh = Z * p.x;
    float Z_1_5 = Z * sqrt(Z);
    float R = rh*rh * exp(-rh/3.0);
    float cos_theta = cos(p.y);
    float Y = 1.0/(81.0*sqrt(6.0)) * SQRT_PI_INV * Z_1_5 * (3.0 * cos_theta*cos_theta - 1.0);
    return R*Y;
}
float orb_3dxz(vec3 p, float Z) {
    float rh = Z * p.x;
    float Z_1_5 = Z * sqrt(Z);
    float R = rh*rh * exp(-rh/3.0);
    float cos_theta = cos(p.y);
    float Y = sqrt(2.0)/81.0 * SQRT_PI_INV * Z_1_5 * sin(p.y) * cos(p.y) * cos(p.z);
    return R*Y;
}
float orb_3dyz(vec3 p, float Z) {
    float rh = Z * p.x;
    float Z_1_5 = Z * sqrt(Z);
    float R = rh*rh * exp(-rh/3.0);
    float cos_theta = cos(p.y);
    float Y = sqrt(2.0)/81.0 * SQRT_PI_INV * Z_1_5 * sin(p.y) * cos(p.y) * sin(p.z);
    return R*Y;
}
float orb_3dx2y2(vec3 p, float Z) {
    float rh = Z * p.x;
    float Z_1_5 = Z * sqrt(Z);
    float R = rh*rh * exp(-rh/3.0);
    float cos_theta = cos(p.y);
    float sin_theta = sin(p.y);
    float Y = 1.0/(81.0*sqrt(2.0)) * SQRT_PI_INV * Z_1_5 * sin_theta * sin_theta * cos(2.0 * p.z);
    return R*Y;
}
float orb_3dxy(vec3 p, float Z) {
    float rh = Z * p.x;
    float Z_1_5 = Z * sqrt(Z);
    float R = rh*rh * exp(-rh/3.0);
    float cos_theta = cos(p.y);
    float sin_theta = sin(p.y);
    float Y = 1.0/(81.0*sqrt(2.0)) * SQRT_PI_INV * Z_1_5 * sin_theta * sin_theta * sin(2.0 * p.z);
    return R*Y;
}

// evaluate an overall wavefunction at a point
float getWaveFunction(vec3 p) {
    vec3 p_sp = cartToSphe(p);
    float Z = 10.0;

    switch (orbitalChoice) {
        case 0:  return orb_1s(p_sp, Z);
        case 1:  return orb_2s(p_sp, Z);
        case 2:  return orb_2pz(p_sp, Z);
        case 3:  return orb_2px(p_sp, Z);
        case 4:  return orb_2py(p_sp, Z);
        case 5:  return orb_3s(p_sp, Z);
        case 6:  return orb_3pz(p_sp, Z);
        case 7:  return orb_3px(p_sp, Z);
        case 8:  return orb_3py(p_sp, Z);
        case 9:  return orb_3dz2(p_sp, Z);
        case 10: return orb_3dxz(p_sp, Z);
        case 11: return orb_3dyz(p_sp, Z);
        case 12: return orb_3dx2y2(p_sp, Z);
        case 13: return orb_3dxy(p_sp, Z);
        default: return 0.0;
    }

    return 0.0;
}

void main() {
    vec3 worldRayDir = normalize(vWorldPosition - cameraPosition);
    
    // Transform ray origin and direction into the box's local space
    mat4 inverseModel = inverse(modelMatrix);
    vec3 local_ro = (inverseModel * vec4(cameraPosition, 1.0)).xyz;
    vec3 local_rd = normalize((inverseModel * vec4(worldRayDir, 0.0)).xyz);

    // the local boundaries of the A-Frame box
    vec3 boxMin = boxDim * -0.5;
    vec3 boxMax = boxDim * 0.5;

    // calculate inverse ray direction to prevent division by zero issues
    vec3 invRd = 1.0 / local_rd;

    // find intersections with the X, Y, and Z planes
    vec3 t0 = (boxMin - local_ro) * invRd;
    vec3 t1 = (boxMax - local_ro) * invRd;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);

    // find the largest entry distance (tNear) and smallest exit distance (tFar)
    float tNear = max(max(tmin.x, tmin.y), tmin.z);
    float tFar = min(min(tmax.x, tmax.y), tmax.z);

    if (tNear > tFar || tFar < 0.0) {
        // out of bounds, discard the pixel
        gl_FragColor = vec4(0.0);
    } else {
        // resulting color of this pixel
        vec3 acc_color = vec3(0.0);
        float transmittance = 1.0;
        // float densityTotal = 0.0;
        float dt = length(boxDim) / MARCH_MAX_STEP;   // Step size (smaller = better quality, slower render)

        float tStart = max(0.0, tNear);

        // raymarching loop
        for(int i = 0; i <= 180; i++) {
            // ray length from local_ro
            float t = tStart + dt * float(i);
            // Calculate current position in 3D space
            vec3 p = local_ro + local_rd * t;
        
            // (real valued) wave function amplitude and calculate probability density
            float psi = getWaveFunction(p);
            float density = psi * psi;

            // Accumulate density if it's significant
            if (density > 0.001) {
                // Multiply by step size for numerical integration over the volume
                // densityTotal += density * dt;

                vec3 phase = vec3(0.0);
                if (psi > 0.0) {
                    phase = posColor;
                }
                else {
                    phase = negColor;
                }

                float step_alpha = 1.0 - exp(-density * dt * 50.0);
                acc_color += phase * step_alpha * transmittance;
                transmittance *= (1.0 - step_alpha);
                // color += phase * density * dt * max(densityCap - densityTotal, 0.0) / densityCap * 8.0;
            }

            // early exit if the color quota is filled or  ray has passed the area of interest
            if (t > tFar || transmittance < 0.002) {
                // color = vec3(0.0, 1.0, 0.0);
                break;
            }
        }

        // float bright = dot(color, vec3(0.299, 0.587, 0.114)) * 3.0;
        float total_alpha = 1.0 - transmittance;
        // If we don't divide the alpha back out, the edges will still look slightly dark.
        if (total_alpha > 0.001) {
            acc_color /= total_alpha;
        }

        gl_FragColor = vec4(acc_color, total_alpha);
    }
}    
    `
});

const atomic_orbital_indices = {0: "1s", 1: "2s", 2: "2px", 3: "2py", 4: "2pz"};

// code injection to create a new custom glsl shader and register it to aframe
// using code generated from a template
async function register_shader_injection(atoms, spatial_scale, orbital_indices) {
    // discard old ones
    try{
        delete AFRAME.shaders['volumetric-new'];
    } finally {}

    // fetch the code template
    var shader_code_template = await loadShader("frag-template.glsl");
    shader_code_template = shader_code_template.replaceAll("%%ORB_ARRAY_SIZE%%", atoms.length);
    shader_code_template = shader_code_template.replaceAll("%%SPATIAL_SCALE%%", spatial_scale);
    
    // now for the nuclei positions, we can hard code them as NUC_0, NUC_1, etc. since we are generate a new code every time anyways
    var nuclei_pos_hardcode = "";
    for (var i=0; i<atoms.length; i++) {
        var atom = atoms[i];
        nuclei_pos_hardcode += `#define NUC_${i} vec3(${atom.coord[0]}, ${atom.coord[1]}, ${atom.coord[2]})\n`;
    }
    shader_code_template = shader_code_template.replaceAll("%%NUC_POS_DEFS%%", nuclei_pos_hardcode);

    var schema = {
        opacity: {type: 'number', is: 'uniform', default: 1.0},
        boxDim: {type: 'vec3', is: 'uniform', default: {x: 1.0, y: 1.0, z: 1.0}},
        posColor: {type: 'vec3', is: 'uniform', default: {x: 0.9, y: 0.5, z: 0.1}},
        negColor: {type: 'vec3', is: 'uniform', default: {x: 0.2, y: 0.6, z: 0.9}}
    };

    // for the code evaluating the wave function at a point
    // skip the for loop, we can hard code a direct waterfall of code since we know exactly how many orbitals we are adding
    var wavefunction_add_hardcode = "";
    // hardcoded uniforms as aframe cannot plug arrays to uniforms
    var mo_coeff_uniforms_hardcode = "";
    shader_code_template = shader_code_template.replaceAll("%%NUC_POS_DEFS%%", nuclei_pos_hardcode);
    for (var i=0; i<orbital_indices.length; i++) {
        const atom_ind = orbital_indices[i][0];
        const atomic_number = atoms[atom_ind].elem;
        const orb_ind = orbital_indices[i][1];
        const orb_name = atomic_orbital_indices[orb_ind];
        // an if statement to prevent wasted cycle then evaluate directly
        // evaluate the wave function of <name> orbital centered at <atom> at the point in space, keeping in regard that the atom has atomic number/nucleus charge of this many
        wavefunction_add_hardcode += `if (mo_coeff_${i} != 0.0) {psi += mo_coeff_${i} * orb_${orb_name}(cartToSphe(p - NUC_${atom_ind}), ${atomic_number.toFixed(1)});} \n`;

        // define a hard coded uniform and add to schema too
        mo_coeff_uniforms_hardcode += `uniform float mo_coeff_${i};\n`;
        schema[`mo_coeff_${i}`] = {type: 'float', is: 'uniform', default: 0.0};
    }
    shader_code_template = shader_code_template.replaceAll("%%WAVE_FUNCTION_CODE%%", wavefunction_add_hardcode);
    shader_code_template = shader_code_template.replaceAll("%%MO_COEFF_UNIFORMS%%", mo_coeff_uniforms_hardcode);

    console.log(shader_code_template);

    AFRAME.registerShader('volumetric-new', {
        schema: schema,
        vertexShader: default_vertshade,
        fragmentShader: shader_code_template
    });
}

// code injection to create a new custom glsl shader and register it to aframe
// using code generated from a template
// this one's for a specific atomic/molecular orbital
async function register_shader_injection_specific(atoms, orbital_indices, box_diag, sh_name, mo_coeffs) {
    // discard old ones
    try{
        delete AFRAME.shaders['volumetric-new-' + sh_name];
    } finally {}

    // fetch the code template
    var shader_code_template = await loadShader("frag-template.glsl");
    // spaatial scale not needed, every length normalized to bohr units
    
    // we use marching step settings instead
    shader_code_template = shader_code_template.replaceAll("%%MARCH_MAX_STEP%%", MARCH_MAX_STEP);
    shader_code_template = shader_code_template.replaceAll("%%BOX_COORD_DT%%", box_diag / MARCH_MAX_STEP);


    // now for the nuclei positions, we can hard code them as NUC_0, NUC_1, etc. since we are generate a new code every time anyways
    var nuclei_pos_hardcode = "";
    for (var i=0; i<atoms.length; i++) {
        var atom = atoms[i];
        nuclei_pos_hardcode += `#define NUC_${i} vec3(${atom.coord[0]}, ${atom.coord[1]}, ${atom.coord[2]})\n`;
    }
    shader_code_template = shader_code_template.replaceAll("%%NUC_POS_DEFS%%", nuclei_pos_hardcode);

    var schema = {
        opacity: {type: 'number', is: 'uniform', default: 1.0},
        boxDim: {type: 'vec3', is: 'uniform', default: {x: 1.0, y: 1.0, z: 1.0}},
        posColor: {type: 'vec3', is: 'uniform', default: {x: 0.9, y: 0.5, z: 0.1}},
        negColor: {type: 'vec3', is: 'uniform', default: {x: 0.2, y: 0.6, z: 0.9}}
    };

    // for the code evaluating the wave function at a point
    // skip the for loop, we can hard code a direct waterfall of code since we know exactly how many orbitals we are adding
    var wavefunction_add_hardcode = "";
    // hardcoded uniforms as aframe cannot plug arrays to uniforms
    var mo_coeff_uniforms_hardcode = "";
    // keep track of atoms whose spherical coordinates we had calculated already
    var cached_sphe_coord_atoms = new Set();
    for (var i=0; i<orbital_indices.length; i++) {
        // this shader will be specific to a combination of mo_coeffs,
        // so we literally hard code each line
        if (mo_coeffs[i] === 0) {
            // skip if just 0 weight
            continue;
        }

        const atom_ind = orbital_indices[i][0];
        const atomic_number = atoms[atom_ind].elem;
        const orb_ind = orbital_indices[i][1];
        const orb_name = atomic_orbital_indices[orb_ind];

        // cache the spherical coord so the code only need to call it once
        if (!cached_sphe_coord_atoms.has(atom_ind)) {
            cached_sphe_coord_atoms.add(atom_ind);
            wavefunction_add_hardcode += `vec3 nuc_${atom_ind}_sphe = cartToSphe(p - NUC_${atom_ind}); \n`;
        }
        // an if statement to prevent wasted cycle then evaluate directly
        // evaluate the wave function of <name> orbital centered at <atom> at the point in space, keeping in regard that the atom has atomic number/nucleus charge of this many
        wavefunction_add_hardcode += `psi += ${mo_coeffs[i].toFixed(9)} * orb_${orb_name}(nuc_${atom_ind}_sphe, ${atomic_number.toFixed(1)}); \n`;

        // not used in specific code gen
        // define a hard coded uniform and add to schema too
        // mo_coeff_uniforms_hardcode += `uniform float mo_coeff_${i};\n`;
        // schema[`mo_coeff_${i}`] = {type: 'float', is: 'uniform', default: 0.0};
    }
    shader_code_template = shader_code_template.replaceAll("%%WAVE_FUNCTION_CODE%%", wavefunction_add_hardcode);
    // not used in specific code gen
    shader_code_template = shader_code_template.replaceAll("%%MO_COEFF_UNIFORMS%%", mo_coeff_uniforms_hardcode);

    // console.log(shader_code_template);

    AFRAME.registerShader('volumetric-new-' + sh_name, {
        schema: schema,
        vertexShader: default_vertshade,
        fragmentShader: shader_code_template
    });
}