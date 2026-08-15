var canvas;
var gl;

const NUM_ORB_FUNCS = 14;

var program;
var vertices;
var buffer;
var positionLocation;
var resolutionLocation;
var timeLocation;
var mouseLocation;
var orbAmplitudesLocation;

// Resize canvas to fit screen
function resize() {
    canvas.width = window.innerWidth * 0.6;
    canvas.height = window.innerHeight * 0.8;
    gl.viewport(0, 0, canvas.width, canvas.height);

    requestAnimationFrame(render);
}

// simple vertex shader that covers the whole screen
const vsSource = `#version 300 es

out vec2 texcoords; // texcoords are in the normalized [0,1] range for the viewport-filling quad part of the triangle
void main() {
        vec2 vertices[3]=vec2[3](vec2(-1,-1), vec2(3,-1), vec2(-1, 3));
        gl_Position = vec4(vertices[gl_VertexID],0,1);
        texcoords = 0.5 * gl_Position.xy + vec2(0.5);
}
`;
// fragment shader will be loaded with ajax request
var fsSource;
// use ajax request to load fragment shader
async function loadShader(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load shader: ${url}`);
    }
    return await response.text();
}


// WebGL boilerplate to compile and run
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }
    return shader;
}

// Render loop
function render(time) {
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(timeLocation, time * 0.001); // Pass time in seconds
    gl.uniform2f(mouseLocation, pitch, yaw);;

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

var dragOrig;
var canvasDragging = false;
var yaw = 0.0;
var pitch = 0.0;
var sensitivity = 0.005;
// for dragging mouse over the canvas, spins view angle
function canvasMouseDown(event)
{
    dragOrig = {x: event.clientX, y: event.clientY};
    // console.log(dragOrig);
    canvasDragging = true;
}
function canvasMouseUp(event)
{
    canvasDragging = false;
}
function canvasMouseMove(event)
{
    if (canvasDragging)
    {
        const dx = event.clientX - dragOrig.x;
        const dy = event.clientY - dragOrig.y;

        // pitch and yaw angle
        yaw += dx * sensitivity;
        pitch -= dy * sensitivity;
        pitch = Math.max(-Math.PI / 2 + 0.0001, Math.min(Math.PI / 2 - 0.0001, pitch));

        dragOrig = {x: event.clientX, y: event.clientY};
        requestAnimationFrame(render);
    }
}

// below are for extracting numerical values from latex boxes
var equation_fields;

function mid2_render_pressed() {
    // equation fields for orbital function amplitudes are ordered
    // 1s, 2s, 2p0, 2p1-, 2p1+, 3s, ...

    var ampls = [];
    for (var i=0; i<equation_fields.length; i++) {
        // for each equation field, we extract the value
        // note: it can be complex
        var expr = equation_fields[i].expression;
        // todo: handle variable symbol substitution if exists...

        // extract real and imaginary values
        var re = expr.N().re;
        var im = expr.N().im;
        
        if (Number.isNaN(re)) {
            re = 0;
        }
        if (Number.isNaN(im)) {
            im = 0;
        }

        ampls.push(re);
        ampls.push(im);
    }

    // flattened array of complex number amplitudes
    const amplitudes_c_f = new Float32Array(ampls);
    gl.uniform2fv(orbAmplitudesLocation, amplitudes_c_f);

    requestAnimationFrame(render);
}

var standard_orbitals_realvalue = [];

function select_orbitals_basic(event) {
    var targ = event.target;
    // trace back to parent until we are at the button element
    // (not the elems for latex rendering inside)
    while (!targ.classList.contains("select-orbitals")) {
        targ = targ.parentElement;
    }
    // then we can select the attribute
    var orb = targ.getAttribute("orbital");

    // reset the latex fields
    for (var i=0; i<equation_fields.length; i++) {
        equation_fields[i].setValue("0");
    }

    // the resulting amplitudes array to be plugged into the amplitudes uniform in glsl
    var res = new Float32Array(NUM_ORB_FUNCS * 2); 
    if (orb[0] === "a") {
        // orbitals that are superposed into real value
        // by adding 2 raw spherical harmonics
        var sp = orb.split(',');
        // they look like "a,7,8" for adding 7th and 8th orbital
        var i1 = parseInt(sp[1]);
        var i2 = parseInt(sp[2]);

        equation_fields[i1].setValue("\\frac{1}{\\sqrt{2}}");
        equation_fields[i2].setValue("\\frac{1}{\\sqrt{2}}");

        // assign 1/sqrt(2) to real amplitude
        res[i1 * 2] = Math.SQRT1_2;
        res[i2 * 2] = Math.SQRT1_2;
    } else if (orb[0] === "s") {
        // orbitals that are superposed into real value
        // by subtracting 2 raw spherical harmonics and multiplying i
        var sp = orb.split(',');
        // they look like "s,7,8" for subtracting 7th and 8th orbital
        var i1 = parseInt(sp[1]);
        var i2 = parseInt(sp[2]);

        equation_fields[i1].setValue("\\frac{1}{\\sqrt{2}}i");
        equation_fields[i2].setValue("-\\frac{1}{\\sqrt{2}}i");

        // assign (+/-) 1/sqrt(2) to complex amplitude
        res[i1 * 2 + 1] = Math.SQRT1_2;
        res[i2 * 2 + 1] = -Math.SQRT1_2;
    } else {
        // raw orbitals
        var i = parseInt(orb);
        equation_fields[i].setValue("1");
        res[i * 2] = 1.0;
    }

    // send to shader
    gl.uniform2fv(orbAmplitudesLocation, res);
    // update render
    requestAnimationFrame(render);
}

async function ijs_setup() {
    //the cortex js fields for latex expressions
    //access the expressions contained inside by equation_fields[i].expression
    equation_fields = document.getElementById("mid-2").getElementsByClassName('equation-field');

    canvas = document.getElementById('gl-canvas');
    gl = canvas.getContext('webgl2');

    fsSource = await loadShader('frag.glsl');

    program = gl.createProgram();
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    gl.useProgram(program);

    // Define a fullscreen quad (two triangles)
    vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // link up uniforms for js code to change values
    positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    timeLocation = gl.getUniformLocation(program, "u_time");
    mouseLocation = gl.getUniformLocation(program, "u_mouse");
    orbAmplitudesLocation = gl.getUniformLocation(program, "u_orbitals_amplitudes");

    window.addEventListener('resize', resize);
    resize();

    canvas.addEventListener('mousedown', canvasMouseDown);
    canvas.addEventListener('mouseup', canvasMouseUp);
    canvas.addEventListener('mouseleave', canvasMouseUp);
    canvas.addEventListener('mousemove', canvasMouseMove);

    // select orbital buttons of basic mode
    var select_orbs = document.getElementsByClassName('select-orbitals');
    for (var i=0; i<select_orbs.length; i++) {
        select_orbs[i].addEventListener('click', select_orbitals_basic);
    }

    document.getElementById("render").addEventListener("click", mid2_render_pressed);

    // default image: 3dz^2 orbital
    var res = new Float32Array(NUM_ORB_FUNCS * 2);
    res[18] = 1.0;
    gl.uniform2fv(orbAmplitudesLocation, res);
    requestAnimationFrame(render);
}

document.addEventListener("DOMContentLoaded", ijs_setup);