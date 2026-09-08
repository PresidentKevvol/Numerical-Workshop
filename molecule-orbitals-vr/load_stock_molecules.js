function load_stock_setup_set(stock_setup_list) {
    const container = document.getElementById("stock-molecules");
    removeAllChildren(container);

    for (i=0; i<stock_setup_list.length; i++) {
        var cur_set = stock_setup_list[i];
        var clon = document.getElementById("templates").getElementsByClassName("stock-molecule-showcase")[0].cloneNode(true);

        clon.getElementsByClassName("stock-mol-name")[0].innerHTML = cur_set["name"];
        clon.getElementsByClassName("stock-mol-img")[0].style = "background-image: url(" + cur_set["img"] + ");";

        clon.addEventListener("click", generate_onclick(i, stock_setup_list));

        container.appendChild(clon);
    }
}

function load_stock_setups_default() {
    load_stock_setup_set(stock_setup_list);
}

//generate the on click eventlistener functions of the boxes
function generate_onclick(i, setup_list) {
    return function() {
        import_setup(setup_list[i]["obj"]);
        //console.log("import stock setup...");
    };
}

document.addEventListener("DOMContentLoaded", load_stock_setups_default);