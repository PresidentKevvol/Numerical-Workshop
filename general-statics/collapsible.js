function setup_collapsibles() {
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

document.addEventListener("DOMContentLoaded", setup_collapsibles);
