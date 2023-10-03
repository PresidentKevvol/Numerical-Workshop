function load_stock_setups() {
    for (i=0; i<stock_setup_list.length; i++) {
        var cur_set = stock_setup_list[i];
        var clon = document.getElementById("templates").getElementsByClassName("stock-eqn-showcase")[0].cloneNode(true);

        clon.getElementsByClassName("stock-eqn-name")[0].innerHTML = cur_set["name"];
        clon.getElementsByClassName("stock-eqn-img")[0].style = "background-image: url(" + cur_set["img"] + ");";

        clon.addEventListener("click", generate_onclick(i));

        document.getElementById("stock-eqns").appendChild(clon);
    }
}

//generate the on click eventlistener functions of the boxes
function generate_onclick(i) {
    return function() {
        import_setup(stock_setup_list[i]["obj"]);
        //console.log("import stock setup...");
    };
}

document.addEventListener("DOMContentLoaded", load_stock_setups);