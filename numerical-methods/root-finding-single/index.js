//the compute engine
var ce;

function ijs_setup() {
    //the math js fields for equations
    //access the expressions contained inside by equation_fields[i].expression
    equation_fields = document.getElementById("mid-2").getElementsByClassName('equation-field');

    //call when all math fields properly loaded
    //equation_fields[2].addEventListener('mount', load_url_setup);

    //for collapsables
    var coll = document.getElementsByClassName("collapsible");
    for (var i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function() {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.display === "block") {
            content.style.display = "none";
            this.getElementsByClassName("collapsible-indicator")[0].innerHTML = "+";
        } else {
            content.style.display = "block";
            this.getElementsByClassName("collapsible-indicator")[0].innerHTML = "-";
        }
        });
    } 
}

//load setup described in url param if there is any
function load_url_setup(){
    //when fully loaded, check if there is url params for settings
    var urlParams = new URLSearchParams(window.location.search);
    var setup_obj = urlParams.get('s');
    if (setup_obj) {
        import_setup(JSON.parse(setup_obj));
    }
}

document.addEventListener("DOMContentLoaded", ijs_setup);