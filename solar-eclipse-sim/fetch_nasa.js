var SOL_ID = '10';
var LUNA_ID = '301';

var sol_radius = 695700000;
var luna_radius = 1737400;

//url to get observer table from nasa horizon api
var nasa_horizons_observer_url = "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=%27{{id}}%27&OBJ_DATA=%27NO%27&CENTER=%27COORD%27&SITE_COORD=%27{{long}},{{lat}},0%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&START_TIME=%272024-04-08%27&STOP_TIME=%272024-04-09%27&EXTRA_PREC=%27yes%27&STEP_SIZE=%27{{step}}%27&CSV_FORMAT=%27YES%27&ANG_FORMAT=%27deg%27&QUANTITIES=%274,5%27";

function get_observer_ephemeris(body_id, lat, long, step, callback) {
    var url = nasa_horizons_observer_url.replace("{{id}}", body_id).replace("{{lat}}", lat).replace("{{long}}", long).replace("{{step}}", step);
    httpGetAsync(url, callback);
}

function httpGetAsync(theUrl, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

function observer_ephemeris_toarray(text) {
    //get the core file
    var csv = text.split('$$SOE\n')[1].split('\n$$EOE')[0];

    var rows = csv.split('\n');
    var res = [];
    for (var i=0; i<rows.length; i++) {
        var sp = rows[i].split(',');
        var r = [parseFloat(sp[3]), parseFloat(sp[4]), parseFloat(sp[5]), parseFloat(sp[6])];
        res.push(r);
    }

    return res;
}

//from midnight between 04-07 and 04-08 to the next midnight
//data are stored in 5 minute intervals
var sol_data_test = observer_ephemeris_toarray(test_sol_data_20240408);
var luna_data_test = observer_ephemeris_toarray(test_luna_data_20240408);

//the distances from earth to sol/luna at totality 
var sol_distance_2024_04_08_totality = 149825144253.51667;
var luna_distance_2024_04_08_totality = 359883990.08684483;

//scale universe distance by this factor and use it for the vr world's coords
var scale_factor = 20000;

//the latitude and longitude of buffalo, NY
var buffalo = [-78.8784, 42.8864];
