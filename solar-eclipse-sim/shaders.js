var default_vertexShader =
`
// attribute vec3 aPosition;
// attribute vec2 aTexCoord;

varying vec2 pos;

void main() {
    pos = uv;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

var custom1_fragmentShader = 
`
// Use medium precision.
precision mediump float;

// This receives the color value from the schema, which becomes a vec3 in the shader.
uniform vec3 color;
// This receives the opacity value from the schema, which becomes a number.
uniform float opacity;

uniform float timeMsec; // A-Frame time in milliseconds.

// the position vector variable passed from vertex shader
varying vec2 pos;

// This is the shader program.
// A fragment shader can set the color via gl_FragColor,
// or decline to draw anything via discard.
void main () {

    // Note that this shader doesn't use texture coordinates.
    // Set the RGB portion to our color,
    // and the alpha portion to our opacity.
    // if (pos.x > 0.5) {
    //     gl_FragColor = vec4(color, opacity / 3.);
    // } else {
    //     gl_FragColor = vec4(color, opacity);
    // }

    float rx = (pos.x - 0.5);
    float ry = pos.y - 0.5;

    float dist = sqrt(rx * rx + ry * ry);
    float angl = atan(ry, rx);

    float op = (sin(dist*30. - timeMsec /1000.) / 2. + 0.5) * opacity;

    float angl_scaled = angl / (3.1415926535897932384626433832795 * 2.0) + 0.5;
    gl_FragColor = vec4(angl_scaled, angl_scaled, color.z, op);
}
`;

var corona_fragmentShader = 
`
// Use medium precision.
precision mediump float;

#define PI 3.1415926535897932384626433832795

// This receives the color value from the schema, which becomes a vec3 in the shader.
uniform vec3 color;
// This receives the opacity value from the schema, which becomes a number.
uniform float opacity;
//the cutoff between 0.0 and 1.0, denotes where from the center does opacity starts decaying
uniform float cutoff;

uniform float timeMsec; // A-Frame time in milliseconds.

uniform float trueTimeMsec; //true aframe time, does not get reset when 'material' attribute change

// the position vector variable passed from vertex shader
varying vec2 pos;

//seeded random function, give a vec2 and return a float
float rand(vec2 c){
	return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

//noise generation using the above random fn
//using mix() for linear interpolation
float noise(vec2 p, float freq ){
	float unit = 1./freq;
	vec2 ij = floor(p/unit);
	vec2 xy = mod(p,unit)/unit;

	xy = .5*(1.-cos(PI*xy));
	float a = rand((ij+vec2(0.,0.)));
	float b = rand((ij+vec2(1.,0.)));
	float c = rand((ij+vec2(0.,1.)));
	float d = rand((ij+vec2(1.,1.)));
	float x1 = mix(a, b, xy.x);
	float x2 = mix(c, d, xy.x);
	return mix(x1, x2, xy.y);
}

//2d perlin noise using the linear noise above
float pNoise(vec2 p, int res){
	float persistance = .5;
	float n = 0.;
	float normK = 0.;
	float f = 4.;
	float amp = 1.;
	int iCount = 0;
	for (int i = 0; i<50; i++){
		n+=amp*noise(p, f);
		f*=2.;
		normK+=amp;
		amp*=persistance;
		if (iCount == res) break;
		iCount++;
	}
	float nf = n/normK;
	return nf*nf*nf*nf;
}

//shift an angle in [0, 2*pi] by d amount
//looping back
//this is to prevent the ugly 'border' where 0 and 2pi meet
//on a radial perlin noise
float angleShift(float t, float d) {
    float res = t + d;
    return (res >= 2.*PI) ? res - 2.*PI : res;
}

// This is the shader program.
// A fragment shader can set the color via gl_FragColor,
// or decline to draw anything via discard.
void main () {
    // get the polar coordinate values
    float rx = (pos.x - 0.5) * 2.;
    float ry = (pos.y - 0.5) * 2.;
    float dist = sqrt(rx * rx + ry * ry);
    float angl = atan(ry, rx) + PI;

    //generate a perlin noise value
    float a1 = angleShift(angl, 4.2134);
    float a2 = angleShift(angl, 0.3645);
    float a3 = angleShift(angl, 1.9701);
    vec2 p1 = vec2(a1, (trueTimeMsec /1000. /30.) + 12.45);
    vec2 p2 = vec2(a2, (trueTimeMsec /1000. /60.) - 7.401);
    vec2 p3 = vec2(a3, (trueTimeMsec /1000. /90.) - 66.93);
    float perl1 = pNoise(p1, 5);
    float perl2 = pNoise(p2, 4);
    float perl3 = pNoise(p3, 3);

    //edge smoothening to prevent ugly edge at angle = 0
    a1 = (a1 > PI) ? 2.*PI - a1 : a1;
    if (a1 < 0.1) {
        perl1 = perl1 * (a1 / 0.1);
    }
    a2 = (a2 > PI) ? 2.*PI - a2 : a2;
    if (a2 < 0.1) {
        perl2 = perl2 * (a2 / 0.1);
    }
    a3 = (a3 > PI) ? 2.*PI - a3 : a3;
    if (a3 < 0.1) {
        perl3 = perl3 * (a3 / 0.1);
    }

    float perl = perl1 + perl2 + perl3;

    //use the cutoff
    float dist_s = (dist < cutoff) ? 0.0 : (dist - cutoff) / (1.0 - cutoff);

    float op = perl * 1.8 * (pow(6., -dist_s*3.0)) * opacity;

    // if (dist > 0.98) {
    //     op = 1.;
    // }

    gl_FragColor = vec4(color, op);
}
`;
