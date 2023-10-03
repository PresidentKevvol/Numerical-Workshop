/**
 * file for the stock settings
 * i.e. selections for users to play with
 */

var lorenz = {
    "equations": {
      "x": "10(y-x)",
      "y": "x(28-z)-y",
      "z": "xy-\\frac{8}{3}z"
    },
    "particle_inits": [
      {
        "x": 0,
        "y": 1,
        "z": 0,
        "particle_color": "#66ff66",
        "trail_color": "#ffffff"
      }
    ],
    "dt": 0.001,
    "skips": 10,
    "trail_length": 4800
};

var thomas = {
    "equations": {
      "x": "\\sin\\left(y\\right)-0.194x",
      "y": "\\sin\\left(z\\right)-0.194y",
      "z": "\\sin\\left(x\\right)-0.194z"
    },
    "particle_inits": [
      {
        "x": 0,
        "y": 0.1,
        "z": 0,
        "particle_color": "#66ff66",
        "trail_color": "#80ff80"
      },
      {
        "x": 0.1,
        "y": 0,
        "z": 0,
        "particle_color": "#ff8080",
        "trail_color": "#ff8080"
      },
      {
        "x": 0,
        "y": 0,
        "z": 0.1,
        "particle_color": "#0080ff",
        "trail_color": "#0080ff"
      },
      {
        "x": 0,
        "y": -0.1,
        "z": 0,
        "particle_color": "#ffff80",
        "trail_color": "#ffff80"
      },
      {
        "x": -0.1,
        "y": 0,
        "z": 0,
        "particle_color": "#80ffff",
        "trail_color": "#80ffff"
      },
      {
        "x": 0,
        "y": 0,
        "z": -0.1,
        "particle_color": "#ff80ff",
        "trail_color": "#ff80ff"
      }
    ],
    "dt": 0.05,
    "skips": 2,
    "trail_length": 1200
};

var aizawa = {
  "equations": {
    "x": "(y-0.7)x-3.5z",
    "y": "0.65+0.95y-\\frac{y^3}{3}-\\left(x^2+z^2\\right)\\left(1+0.25y\\right)+0.1yx^3",
    "z": "3.5x+(y-0.7)z"
  },
  "particle_inits": [
    {
      "x": 0.1,
      "y": 0,
      "z": 0,
      "particle_color": "#66ff66",
      "trail_color": "#80ff80"
    },
    {
      "x": 0.11,
      "y": 0,
      "z": 0,
      "particle_color": "#ff8080",
      "trail_color": "#ff8080"
    },
    {
      "x": 0.09,
      "y": 0,
      "z": 0,
      "particle_color": "#0080ff",
      "trail_color": "#0080ff"
    }
  ],
  "dt": 0.02,
  "skips": 1,
  "trail_length": 2400
};

var sprott_b = {
    "equations": {
      "x": "0.4yz",
      "y": "x-1.2y",
      "z": "1-xy"
    },
    "particle_inits": [
      {
        "x": 0,
        "y": 0.1,
        "z": 0,
        "particle_color": "#66ff66",
        "trail_color": "#80ff80"
      },
      {
        "x": 0.1,
        "y": 0,
        "z": 0,
        "particle_color": "#ff8080",
        "trail_color": "#ff8080"
      },
      {
        "x": 0,
        "y": -0.1,
        "z": 0,
        "particle_color": "#ffff80",
        "trail_color": "#ffff80"
      },
      {
        "x": -0.1,
        "y": 0,
        "z": 0,
        "particle_color": "#80ffff",
        "trail_color": "#80ffff"
      }
    ],
    "dt": 0.02,
    "skips": 2,
    "trail_length": 1800
};

var sprott_linz_f = {
    "equations": {
      "x": "y+z",
      "y": "-x+0.5y",
      "z": "x^2-z"
    },
    "particle_inits": [
      {
        "x": 0.1,
        "y": 0.02,
        "z": 0,
        "particle_color": "#66ff66",
        "trail_color": "#ffffff"
      },
      {
        "x": 0.1,
        "y": 0,
        "z": 0,
        "particle_color": "#ff8080",
        "trail_color": "#ffffff"
      },
      {
        "x": 0.12,
        "y": 0,
        "z": 0.02,
        "particle_color": "#0080ff",
        "trail_color": "#ffffff"
      }
    ],
    "dt": 0.01,
    "skips": 5,
    "trail_length": 1800
};


var stock_setup_list = [
    {"name": "Lorenz", "obj": lorenz, "img": "scrshots/lorenz.png"},
    {"name": "Thomas", "obj": thomas, "img": "scrshots/thomas.png"},
    {"name": "Aizawa", "obj": aizawa, "img": "scrshots/aizawa.png"},
    {"name": "Sprott B", "obj": sprott_b, "img": "scrshots/sprott_b.png"},
    {"name": "Sprott-Linz F", "obj": sprott_linz_f, "img": "scrshots/sprott_linz_f.png"},
];
