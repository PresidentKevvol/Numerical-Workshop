#define PI 3.1415926535897932384626433832795
#define SQRT_PI_INV 0.5641895835477562869480794515607725858
// Bohr radius in Angstroms
// not used, all length units ar now in bohr
// #define a0 0.529177

// #define ORB_ARRAY_SIZE %%ORB_ARRAY_SIZE%%
// #define SPATIAL_SCALE %%SPATIAL_SCALE%%
// #define AMPLITUDE_SCALE pow(SPATIAL_SCALE, 1.0/3.0)

// the marching step length of each step in each ray
// should be a hard code injection where the longest ray should not be more than MARCH_MAX_STEP steps
// i.e. BOX_COORD_DT = bounding_box_diagonal / MARCH_MAX_STEP
#define MARCH_MAX_STEP %%MARCH_MAX_STEP%%
#define BOX_COORD_DT %%BOX_COORD_DT%%

%%NUC_POS_DEFS%%

uniform mat4 modelMatrix;
varying vec3 vWorldPosition;

%%MO_COEFF_UNIFORMS%%

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
// Z_1_5 should be pow(Z, 1.5) = Z * sqrt(Z)
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
    float psi = 0.0;

    %%WAVE_FUNCTION_CODE%%

    return psi;
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
        float dt = BOX_COORD_DT;   // Step size (smaller = better quality, slower render)

        float tStart = max(0.0, tNear);

        // raymarching loop
        for(int i = 0; i <= 80; i++) {
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