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
      boxDim: {type: 'vec3', is: 'uniform', default: {x: 1.0, y: 1.0, z: 1.0}},
      posColor: {type: 'vec3', is: 'uniform', default: {x: 0.9, y: 0.5, z: 0.1}},
      negColor: {type: 'vec3', is: 'uniform', default: {x: 0.2, y: 0.6, z: 0.9}}
    },
    vertexShader: default_vertshade,
    fragmentShader: `
#define PI 3.1415926535897932384626433832795
#define SQRT_PI_INV 0.5641895835477562869480794515607725858
// Bohr radius in Angstroms
#define a0 0.529177

uniform mat4 modelMatrix;
varying vec3 vWorldPosition;

// size of the box
uniform vec3 boxDim;
// positive and negative amplitude color
uniform vec3 posColor;
uniform vec3 negColor;

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
    float rh = Z * p.x / a0;
    float R = exp(-rh);
    float Y = SQRT_PI_INV * pow(Z/a0, 1.5);
    return R*Y;
}
float orb_2s(vec3 p, float Z) {
    float rh = Z * p.x / a0;
    float R = (2.0 - rh) * exp(-rh/2.0);
    float Y = 1.0/sqrt(32.0) * SQRT_PI_INV * pow(Z/a0, 1.5);
    return R*Y;
}
float orb_2pz(vec3 p, float Z) {
    float r = p.x;
    float rh = Z * p.x / a0;
    float R = r * exp(-rh/2.0);
    float Y = 1.0/sqrt(32.0) * SQRT_PI_INV * pow(Z/a0, 2.5) * cos(p.y);
    return R*Y;
}
float orb_2px(vec3 p, float Z) {
    float r = p.x;
    float rh = Z * p.x / a0;
    float R = r * exp(-rh/2.0);
    float Y = 1.0/sqrt(32.0) * SQRT_PI_INV * pow(Z/a0, 2.5) * sin(p.y) * cos(p.z);
    return R*Y;
}
float orb_2py(vec3 p, float Z) {
    float r = p.x;
    float rh = Z * p.x / a0;
    float R = r * exp(-rh/2.0);
    float Y = 1.0/sqrt(32.0) * SQRT_PI_INV * pow(Z/a0, 2.5) * sin(p.y) * sin(p.z);
    return R*Y;
}

// wave function of 3d0 aka 3dz^2 orbital (one with 2 lobes and a hula hoop)
// real value only
float orb_3d0(vec3 p, float Z) {
    float r = p.x;
    float rh = Z * p.x;
    float R = r*r * exp(-rh/3.0);
    float cos_theta = cos(p.y);
    float Y = 1.0/(81.0*sqrt(6.0)) * SQRT_PI_INV * pow(Z, 3.5) * (3.0 * cos_theta*cos_theta - 1.0);
    return R*Y;
}

// evaluate an overall wavefunction at a point
float getWaveFunction(vec3 p) {
    p = p * 6.25;
    vec3 p_sp = cartToSphe(p);
    float psi = orb_3d0(p_sp, 8.0);

    return psi * 1.5;
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
        float dt = 0.01;   // Step size (smaller = better quality, slower render)

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