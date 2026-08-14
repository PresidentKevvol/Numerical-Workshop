var first_field;
var pyodide;

//simulation values
var array_dx = 0.04;
var hbar = 1;
var x_values;
var func_v;
var func_psi_init;

var wave_largest_amp;
var t;

var psi0_transform_clicked = false;

// number of eigenstates we are displaying
var num_eigenwaves;
// array of eigen values i.e. quantized energies
var eigen_energies;
// array of standing wave function arrays
// extracted back from python
var psi_standing;

//graph elements
var graph_v;
var graph_eigenwaves;
var graph_init_psi;
var graph_wave_progression;
var graph_prob_progression;

//the slider for eigenfunctions
var eigenfunc_slider;
// the input field for time for the animation
var time_field;


// for timer functions
if (window.performance.now) {
  console.log("Using high performance timer");
  getTimestamp = function() { return window.performance.now(); };
} else {
  if (window.performance.webkitNow) {
      console.log("Using webkit high performance timer");
      getTimestamp = function() { return window.performance.webkitNow(); };
  } else {
      console.log("Using low performance timer");
      getTimestamp = function() { return new Date().getTime(); };
  }
}

function ijs_setup() {
  pyodide_setup();

  first_field = document.getElementById("first-field");

  //for rendering static math
  //mathlive.renderMathInDocument();

  //to get the content in MathJSON, do this
  //first_field.expression.json;

  //to substitute a value for x, do this
  //first_field.expression.subs({x: 1}).N().valueOf();

  var graph_options = {
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      xAxes: [{
        ticks: {
            autoSkip: true,
            maxTicksLimit: 10,
        }
      }]
    }
  };

  graph_v = new Chart("plot-potential", {
    type: "line",
    data: {},
    options: graph_options
  });

  graph_eigenwaves = new Chart("plot-eigen-waves", {
    type: "line",
    data: {},
    options: graph_options
  });

  graph_init_psi = new Chart("plot-init-wave", {
    type: "line",
    data: {},
    options: graph_options
  });

  graph_wave_progression = new Chart("plot-wave-progression", {
    type: "line",
    data: {},
    options: graph_options
  });
  graph_wave_progression.options.animation = {duration: 0};
  graph_wave_progression.options.scales['yAxes'] = [{
    display: true,
    ticks: {
      min: -1, // minimum value
      max: 1 // maximum value
    }
  }];

  graph_prob_progression = new Chart("plot-prob-dist-progression", {
    type: "line",
    data: {},
    options: graph_options
  });
  graph_prob_progression.options.animation = {duration: 0};
  graph_prob_progression.options.scales['yAxes'] = [{
    display: true,
    ticks: {
      min: 0, // minimum value
      max: 1 // maximum value
    }
  }];

  document.getElementById("plot-v-btn").addEventListener("click", plot_v_clicked);
  document.getElementById("solve-eigenfuncs").addEventListener("click", solve_eigenwaves_clicked);
  document.getElementById("plot-init-psi-btn").addEventListener("click", plot_psi0_clicked);
  document.getElementById("plot-init-psi-transform-btn").addEventListener("click", transform_psi0_clicked);
  document.getElementById("play-wave").addEventListener("click", play_clicked);

  var add_fn_btns = document.getElementsByClassName("add-function-piece-btn");
  for (var i=0; i<add_fn_btns.length; i++) {
    add_fn_btns[i].addEventListener("click", add_fn_piece_clicked);
  }

  eigenfunc_slider = document.getElementById("eigenfunc-display-slider");
  eigenfunc_slider.addEventListener("input", eigenfunc_slider_slided);
  time_field = document.getElementById("wave-t");
  time_field.addEventListener("input", time_field_changed);
  document.getElementById("wave-anim-speed").addEventListener("input", wave_speed_changed);
}

//python function to solve the TISE given v(x) and psi(x, 0) as arrays
var solve_TISE_py = `
def solveTISE(xvec, h, potFunctVec):
    Nx = len(xvec)
    mat = -((np.tri(Nx,Nx,1)-np.tri(Nx,Nx,-2)-3.*np.eye(Nx))/h**2-np.diag(potFunctVec))
    # print(mat)
    eigenValues,eigenVectors = np.linalg.eig(mat)
    idx = eigenValues.argsort()[::1]   
    eigenValues = eigenValues[idx]
    eigenVectors = eigenVectors[:,idx]
    return eigenValues,eigenVectors
`;

//fourier type basis transform to transform a function to a set of coefficients of basis functions
var wave_basis_transform_py = `
def basis_transform(p, basis_set, h):
    l = len(basis_set)
    # generate series per the basis functions
    eigenfn_weights = []
    # weight of each eigenfunction by numerical integration
    for i in range(l):
        ci = np.sum(p * basis_set[i]) * h
        eigenfn_weights.append(ci)
    return eigenfn_weights
`;

//given a series of standing waves, their eigenvalues (energies), and set of coefficients
//to multiply them with, get the state of the wave at time t
var series_at_t_py = `
def series_wavefn_attime(coeffes, psi_fns, E_vals, t):
    l = len(coeffes)
    return sum([coeffes[i] * psi_fns[i] * np.exp(-1j * E_vals[i] * t / hbar) for i in range(l)])
`;

//computes the largest possible amplitude given an initial wave in basis form
var largest_amplitude_py = `
def largest_amplitude(coeffes, psi_fns):
    l = len(coeffes)
    return sum([np.abs(coeffes[i]) * np.amax(np.abs(psi_fns[i])) for i in range(l)])
`;

//setup pyodide to be used
async function pyodide_setup() {
  //setup pyodide
  pyodide = await loadPyodide();
  await pyodide.loadPackage("numpy");
  pyodide.runPython("import numpy as np");

  //test code
  pyodide.runPython("A = np.array([[3, 4, -2], [1, 4, -1], [2, 6, -1]])"); 
  pyodide.runPython("eig = np.linalg.eig(A)");
  pyodide.runPython("print(eig[0])");
  pyodide.runPython("print(eig[1])");

  //run these to import the js arrays into python runtime
  // pyodide.runPython("from js import x_values"); 
  // pyodide.runPython("from js import func_v");
  // pyodide.runPython("from js import func_psi_init");
  // pyodide.runPython("from js import array_dx, x_values, func_v, func_psi_init");
  // pyodide.runPython("x = np.array(list(x_values))");
  // pyodide.runPython("v = np.array(list(func_v))");
  // pyodide.runPython("psi_0 = np.array(list(func_psi_init))");

  //setup the function to solve the TISE
  pyodide.runPython(solve_TISE_py);
  pyodide.runPython(wave_basis_transform_py);
  pyodide.runPython(series_at_t_py);
  pyodide.runPython(largest_amplitude_py);

  pyodide.runPython("from js import hbar");
  
  //pyodide.runPython("res = solveTISE(x, array_dx, v)");
}

//test graphing an eigenfunction from the solved set
function eigenfunc_graph_test() {
  q1 = pyodide.runPython("res[1][:,1]");
  q1j = [];
  for(var i=0; i<q1.length; i++) {q1j.push(q1.get(i));}
  graph_eigenwaves.data.datasets.push({fill: false,
    label: 'q1(x)',
    pointRadius: 0,
    borderColor: "rgba(0,255,0,0.8)",
    data: q1j}); 
  graph_eigenwaves.update(); 
}

function generate_function_array(sect, lower_bound, upper_bound, dx) {
  var pieces = sect.getElementsByClassName('equation-piece');

  var xvals = [];
  var yvals = [];

  // for each value of x in the domain space
  var total_len = (upper_bound - lower_bound)/dx;
  //x=lower_bound; x<=upper_bound; x+=dx
  for (var j=0; j<=total_len; j++) {
    var x = lower_bound + j * dx;
    var y = 0;
    //check each piecewise piece on the widget to get the y value corresponding to current x
    for (var i=0; i<pieces.length; i++) {
      var low = pieces[i].getElementsByClassName('range-low')[0].value;
      var high = pieces[i].getElementsByClassName('range-high')[0].value;

      if (low <= x && x <= high) {
        y = pieces[i].getElementsByClassName('equation-piece-field')[0].expression.subs({x: x}).N().valueOf();
        break;
      }
    }

    xvals.push(x);
    yvals.push(y);
  }
  return [xvals, yvals];
}

// normalize a wave function array so it integrates to 1 over the entire domain
function normalize_function_array(ay, dx) {
  var sum = 0;
  for(var i=0; i<ay.length; i++) {
    sum += ay[i] * ay[i];
  }
  intg = Math.sqrt(sum * dx);

  for(var i=0; i<ay.length; i++) {
    ay[i] = ay[i] / intg
  }

  return ay;
}

function plot_function_graph(vas_id, xvals, yvals) {
  var chart = new Chart(vas_id, {
    type: "line",
    data: {
      labels: xvals,
      datasets: [{
        fill: false,
        pointRadius: 0,
        borderColor: "rgba(255,0,0,0.5)",
        data: yvals
      }]
    },
    options: {
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {display: false}
      }
    }
  });
  return chart;
}

//test codes
function test_run() {
  jam = document.getElementById("equation-pieces-set-psi");
  b = generate_function_array(jam, -10, 10, 0.02);
  plot_function_graph("plot-potential-init-wave", b[0], b[1]);
}

function plot_v_clicked() {
  v_field = document.getElementById("equation-pieces-set-v");
  v = generate_function_array(v_field, -10, 10, array_dx);

  x_values = v[0];
  func_v = v[1];

  //plot_function_graph("plot-potential-init-wave", b[0], b[1]);
  graph_v.data.labels = x_values;
  graph_v.data.datasets = [{
    fill: false,
    label: 'V(x)',
    pointRadius: 0,
    borderColor: "rgba(191,191,0,0.8)",
    data: func_v
  }];
  graph_v.update();
}

function plot_psi0_clicked() {
  psi_field = document.getElementById("equation-pieces-set-psi");
  psi = generate_function_array(psi_field, -10, 10, array_dx);
  psi[1] = normalize_function_array(psi[1], array_dx);

  func_psi_init = psi[1];

  //plot_function_graph("plot-potential-init-wave", b[0], b[1]);
  graph_init_psi.data.labels = x_values;
  graph_init_psi.data.datasets = [{
    fill: false,
    label: 'Ψ(x, t=0)',
    pointRadius: 0,
    borderColor: "rgba(0,31,255,0.8)",
    data: func_psi_init
  }];
  graph_init_psi.update();
}

// when 'Solve for standing waves' button is clicked
async function solve_eigenwaves_clicked() {
  // import the arrays
  pyodide.runPython("from js import array_dx, x_values, func_v");
  // convert to numpy arrays
  pyodide.runPython("x = np.array(list(x_values))");
  pyodide.runPython("v = np.array(list(func_v))");

  console.log("function arrays loaded");

  //pyodide.runPython(solve_TISE_py);

  var t1 = getTimestamp();
  //use the function to solve the TISE
  pyodide.runPython("eigEnergies, eigFuncs = solveTISE(x, array_dx, v)");
  var t2 = getTimestamp();
  console.log("solver method finished, time taken: " + (t2 - t1));

  // pyodide.runPython("l = int(eigFuncs.shape[0] ** 0.5)");
  pyodide.runPython("l = int(eigFuncs.shape[0] / 8)");
  // pyodide.runPython("l = np.sum(eigEnergies < np.amax(v))");
  // extract and normalize the standing waves
  pyodide.runPython("Psi_standing = [eigFuncs[:,i] / (array_dx ** 0.5) for i in range(l)]");

  // transfer variables to js
  num_eigenwaves = pyodide.runPython("l");
  psi_standing = [];
  psi_standing_py = pyodide.runPython("Psi_standing");
  eigen_energies = pyodide.runPython("eigEnergies[:l]");
  // load each eigen state function from python np array to js array
  for (var i=0; i<num_eigenwaves; i++) {
    var cur_wave = psi_standing_py.get(i);
    var cur_wave_j = [];
    for(var j=0; j<cur_wave.length; j++) {cur_wave_j.push(cur_wave.get(j));}
    psi_standing.push(cur_wave_j);
  }

  console.log("eigenstates loaded to js");

  graph_eigenwaves.data.labels = x_values;
  eigenfunc_slider.setAttribute("max", num_eigenwaves - 1);
  eigenfunc_slider.dispatchEvent(new Event("input"));
}

async function transform_psi0_clicked() {
  // import the arrays
  pyodide.runPython("from js import func_psi_init");
  // convert to numpy arrays
  pyodide.runPython("psi_0 = np.array(list(func_psi_init))");

  console.log("function arrays loaded");

  //basis transform psi(x, 0) to coefficients
  pyodide.runPython("eig_fn_weights = basis_transform(psi_0, Psi_standing, array_dx)");
  //display the wave in the animation graph
  graph_wave_progression.data.labels = x_values;
  graph_prob_progression.data.labels = x_values;
  //calculate the largest amplitude to fit wave in box of graph
  wave_largest_amp = pyodide.runPython("largest_amplitude(eig_fn_weights, Psi_standing)");
  
  psi0_transform_clicked = true;
  
  // graph_wave_progression.options.scales.yAxes.min = -wave_largest_amp;
  // graph_wave_progression.options.scales.yAxes.max = wave_largest_amp;
  time_field.dispatchEvent(new Event("input"));
}

function eigenfunc_slider_slided(event) {
  if (!psi_standing) {
    return;
  }

  var slider_val = parseInt(event.target.value);
  graph_eigenwaves.data.datasets = [{
    fill: false,
    label: 'Eigen state ' + slider_val + ' (E = ' + eigen_energies.get(slider_val) + ')',
    pointRadius: 0,
    borderColor: "rgba(0,191,31,0.9)",
    data: psi_standing[slider_val]
  }];
  graph_eigenwaves.update();
}

function time_field_changed(event) {
  if (!psi0_transform_clicked) {
    return;
  }

  //get t value
  t = parseFloat(event.target.value);
  //within the python runtime, calculate the wave at time t
  pyodide.runPython("from js import t");
  pyodide.runPython("wave_at_t = series_wavefn_attime(eig_fn_weights, Psi_standing, eigEnergies, t)");
  pyodide.runPython("wave_at_t_real = np.real(wave_at_t)");
  pyodide.runPython("wave_at_t_imag = np.imag(wave_at_t)");
  pyodide.runPython("prob_at_t = np.real(wave_at_t * np.conj(wave_at_t))");
  // pyodide.runPython("prob_at_t = wave_at_t_real ** 2 + wave_at_t_imag ** 2");

  //convert them to js array to display on graph
  var wave_real = pyodide.runPython("wave_at_t_real");
  var wave_imag = pyodide.runPython("wave_at_t_imag");
  var prob_fn = pyodide.runPython("prob_at_t");
  var wave_real_j = [];
  for(var j=0; j<wave_real.length; j++) {wave_real_j.push(wave_real.get(j));}
  var wave_imag_j = [];
  for(var j=0; j<wave_imag.length; j++) {wave_imag_j.push(wave_imag.get(j));}
  var prob_fn_j = [];
  for(var j=0; j<prob_fn.length; j++) {prob_fn_j.push(prob_fn.get(j));}

  // console.log(prob_fn_j);

  if (graph_wave_progression.data.datasets.length > 0) {
    graph_wave_progression.data.datasets[0].data = wave_real_j;
    graph_wave_progression.data.datasets[1].data = wave_imag_j;

  } else {
    graph_wave_progression.data.datasets = [{
      fill: false,
      label: 'real',
      pointRadius: 0,
      borderColor: "rgba(0,31,255,0.9)",
      data: wave_real_j
    },
    {
      fill: false,
      label: 'imag',
      pointRadius: 0,
      borderColor: "rgba(255,127,0,0.9)",
      data: wave_imag_j
    }];
  }
  graph_wave_progression.update();

  if (graph_prob_progression.data.datasets.length > 0) {
    graph_prob_progression.data.datasets[0].data = prob_fn_j;
  } else {
    graph_prob_progression.data.datasets = [{
      fill: false,
      label: 'probability distribution function',
      pointRadius: 0,
      borderColor: "rgba(239,0,0,0.9)",
      data: prob_fn_j
    }];
  }
  graph_prob_progression.update();
}

function add_fn_piece_clicked(event) {
  var targ_div = event.target.parentElement.getElementsByClassName("equation-pieces-set")[0];
  var template = document.getElementById("templates").getElementsByClassName("equation-piece")[0];
  var clon = template.cloneNode(true);

  clon.getElementsByClassName("remove-x")[0].addEventListener("click", remove_x_clicked);

  targ_div.appendChild(clon);
}

function remove_x_clicked(event) {
  var piece_div = event.target.parentElement;
  var parent = piece_div.parentElement;
  parent.removeChild(piece_div);
}

var wave_anim_playing = false;
var wave_anim_interval;

function play_clicked(event) {
  if (!psi0_transform_clicked) {
    return;
  }

  var btn = event.target;
  if (wave_anim_playing) {
    clearInterval(wave_anim_interval);
    btn.innerHTML = 'play';
    wave_anim_playing = false;
  } else {
    wave_anim_interval = setInterval(wave_animation, 40);
    btn.innerHTML = 'stop';
    wave_anim_playing = true;
  }
}

//interval function for animating the wave function
function wave_animation() {
  //time_field.value = parseFloat(time_field.value) + parseFloat(time_field.getAttribute('step'));
  time_field.stepUp();
  time_field.dispatchEvent(new Event("input"));
}

//when animation speed changed
function wave_speed_changed(event) {
  var val = event.target.value;
  time_field.setAttribute('step', val);
}

document.addEventListener("DOMContentLoaded", ijs_setup);
