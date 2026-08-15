#version 300 es
precision highp float;

#define PI 3.1415926535897932384626433832795
#define SQRT_PI_INV 0.5641895835477562869480794515607725858
#define I vec2(0.0, 1.0)
// total number of orbital functions, change later if add more energy levels
#define NUM_ORB_FUNCS 14

precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse; // x = pitch (elevation), y = yaw (azimuth)

uniform vec2 u_orbitals_amplitudes[NUM_ORB_FUNCS];

out vec4 FragColor;

float Z = 7.0;
float densityCap = 0.25;

// Complex Multiplication: (a + bi)(c + di) = (ac - bd) + (ad + bc)i
vec2 c_mul(vec2 z1, vec2 z2) {
    return vec2(z1.x * z2.x - z1.y * z2.y, z1.x * z2.y + z1.y * z2.x);
}

// Complex Division: (z1 * conj(z2)) / |z2|^2
vec2 c_div(vec2 z1, vec2 z2) {
    float denominator = dot(z2, z2); // Equivalent to z2.x^2 + z2.y^2
    return vec2(dot(z1, z2), z1.y * z2.x - z1.x * z2.y) / denominator;
}

// Complex Conjugate: z = a + bi -> z* = a - bi
vec2 c_conj(vec2 z) {
    return vec2(z.x, -z.y);
}

vec2 expi(float x) {
    return vec2(cos(x), sin(x));
}

// rotation matrix in 2d
mat2 rot2d(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

// convert a vec3 in cartesian to spherical coordinates
// note: in the cartesian here, y is up
// in the returning vec3, x will be r, radial distance; y will be theta, azimuth angle; z will be phi, polar angle
vec3 cartToSphe(vec3 p) {
    float r = length(p);
    float t = acos(p.y / r);
    float ph = atan(p.z, p.x);
    return vec3(r, t, ph);
}

// reference: https://gist.github.com/983/e170a24ae8eba2cd174f
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// functions for the orbitals
// all of these takes in a vector point in spherical coordinate and gives a complex
vec2 orb_1s(vec3 p) {
    float rh = Z * p.x;
    float R = exp(-rh);
    float Y = SQRT_PI_INV * pow(Z, 1.5);
    return vec2(R*Y, 0.0);
}

vec2 orb_2s(vec3 p) {
    float rh = Z * p.x;
    float R = (2.0 - rh) * exp(-rh/2.0);
    float Y = 1.0/sqrt(32.0) * SQRT_PI_INV * pow(Z, 1.5);
    return vec2(R*Y, 0.0);
}

vec2 orb_2p0(vec3 p) {
    float r = p.x;
    float rh = Z * p.x;
    float R = r * exp(-rh/2.0);
    float Y = 1.0/sqrt(32.0) * SQRT_PI_INV * pow(Z, 2.5) * cos(p.y);
    return vec2(R*Y, 0.0);
}

vec2 orb_2p1(vec3 p, float sg) {
    float r = p.x;
    float rh = Z * p.x;
    float R = r * exp(-rh/2.0);
    vec2 Y = 1.0/8.0 * SQRT_PI_INV * pow(Z, 2.5) * sin(p.y) * expi(sg * p.z);
    return R*Y;
}

vec2 orb_3s(vec3 p) {
    float rh = Z * p.x;
    float R = (27.0 - 18.0 * rh + 2.0 * rh*rh) * exp(-rh/3.0);
    float Y = 1.0/(81.0*sqrt(3.0)) * SQRT_PI_INV * pow(Z, 1.5);
    return vec2(R*Y, 0.0);
}

vec2 orb_3p0(vec3 p) {
    float r = p.x;
    float rh = Z * p.x;
    float R = r * (6.0 - rh) * exp(-rh/3.0);
    float Y = sqrt(2.0)*1.0/81.0 * SQRT_PI_INV * pow(Z, 2.5) * cos(p.y);
    return vec2(R*Y, 0.0);
}

vec2 orb_3p1(vec3 p, float sg) {
    float r = p.x;
    float rh = Z * p.x;
    float R = r * (6.0 - rh) * exp(-rh/3.0);
    vec2 Y = 1.0/81.0 * SQRT_PI_INV * pow(Z, 2.5) * sin(p.y) * expi(sg * p.z);
    return R*Y;
}

vec2 orb_3d0(vec3 p) {
    float r = p.x;
    float rh = Z * p.x;
    float R = r*r * exp(-rh/3.0);
    float cos_theta = cos(p.y);
    float Y = 1.0/(81.0*sqrt(6.0)) * SQRT_PI_INV * pow(Z, 3.5) * (3.0 * cos_theta*cos_theta - 1.0);
    return vec2(R*Y, 0.0);
}

vec2 orb_3d1(vec3 p, float sg) {
    float r = p.x;
    float rh = Z * p.x;
    float R = r*r * exp(-rh/3.0);
    vec2 Y = 1.0/81.0 * SQRT_PI_INV * pow(Z, 3.5) * sin(p.y) * cos(p.y) * expi(sg * p.z);
    return R*Y;
}

vec2 orb_3d2(vec3 p, float sg) {
    float r = p.x;
    float rh = Z * p.x;
    float R = r*r * exp(-rh/3.0);
    float sin_theta = sin(p.y);
    vec2 Y = 1.0/162.0 * SQRT_PI_INV * pow(Z, 3.5) * sin_theta * sin_theta * expi(sg * 2.0 * p.z);
    return R*Y;
}

// call orbital function by index
// 0 = 1s, 1 = 2s, 2 = 2p0, 3 = 2p1-, ...
vec2 orb_by_index(vec3 p, int i) {
    switch (i) {
        case 0:  return orb_1s(p);
        case 1:  return orb_2s(p);
        case 2:  return orb_2p0(p);
        case 3:  return orb_2p1(p, -1.0);
        case 4:  return orb_2p1(p, 1.0);
        case 5:  return orb_3s(p);
        case 6:  return orb_3p0(p);
        case 7:  return orb_3p1(p, -1.0);
        case 8:  return orb_3p1(p, 1.0);
        case 9:  return orb_3d0(p);
        case 10: return orb_3d1(p, -1.0);
        case 11: return orb_3d1(p, 1.0);
        case 12: return orb_3d2(p, -1.0);
        case 13: return orb_3d2(p, 1.0);
        default: return vec2(0.0, 0.0);
    }
    // if (i == 9) {
    //     return orb_3d0(p);
    // }
    return vec2(0.0, 0.0);
}

// Mathematical function to evaluate the orbital amplitude at point p
vec2 getWaveFunction(vec3 p) {
    // orbital centered at (0.0, 0.0, 0.0)
    vec3 p_sp = cartToSphe(p);

    // vec2 psi = orb_by_index(p_sp, 8);

    vec2 psi = vec2(0.0, 0.0);
    // call every orbital function and sum the spatial wave function amplitude value at this point
    for (int i = 0 ; i < NUM_ORB_FUNCS; i++) {
        vec2 weight = u_orbitals_amplitudes[i];
        // if amplitude is 0, skip to save time
        if (weight.x == 0.0 && weight.y == 0.0) {
            continue;
        }
        psi += c_mul(weight, orb_by_index(p_sp, i));
    }
    
    return psi;
}

void main() {
    // Normalize screen coordinates from -1.0 to 1.0
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    // Camera Setup
    vec3 ro = vec3(0.0, 0.0, 7.16452); // Camera origin (z = 7)
    vec3 rd = normalize(vec3(uv, -1.0)); // Ray direction shooting into the screen

    // Rotate camera origin and ray direction by Pitch (X-axis) and Yaw (Y-axis)
    // Pitch: rotates Y and Z planes
    ro.yz *= rot2d(u_mouse.x);
    rd.yz *= rot2d(u_mouse.x);

    // Yaw: rotates X and Z planes
    ro.xz *= rot2d(u_mouse.y);
    rd.xz *= rot2d(u_mouse.y);
    
    // Volumetric Accumulation Variables
    float densityTotal = 0.0;
    float t = 0.0;     // Distance traveled along ray
    float dt = 0.1;   // Step size (smaller = better quality, slower render)
    // start accumulating color
    vec3 color = vec3(0.0, 0.0, 0.0);
    
    // Raymarching Loop
    for(int i = 0; i <= 150; i++) {
        // Calculate current position in 3D space
        vec3 p = ro + rd * dt * float(i);
        
        // Get (complex) wave function amplitude and calculate probability density
        vec2 psi = getWaveFunction(p);
        float density = dot(psi, psi);
        
        // Accumulate density if it's significant
        if (density > 0.001) {
            // Multiply by step size for numerical integration over the volume
            densityTotal += density * dt;

            // the complex phase of the amplitude at this point in space
            // this will be used for color
            float phase = atan(psi.y, psi.x) / (2.0 * PI);
            color += hsv2rgb(vec3(phase, 1.0, 1.0)) * density * dt * max(densityCap - densityTotal, 0.0) / densityCap * 8.0;
        }
        
        // Early exit if the ray has passed the area of interest
        if (densityTotal > densityCap) {
            // color = vec3(0.0, 1.0, 0.0);
            break;
        }
    }
    
    // Apply simple tone mapping so the center doesn't blow out to pure white instantly
    color = 1.0 - exp(-color * 2.0);

    FragColor = vec4(color, 1.0);
}