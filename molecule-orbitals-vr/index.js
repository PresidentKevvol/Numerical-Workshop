function ijs_setup() {
    document.getElementById("btn").addEventListener("click", () => {
        document.getElementById("info").innerText = "Button Clicked!";
    });
}

document.addEventListener("DOMContentLoaded", ijs_setup);