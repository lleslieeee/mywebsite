let story;
let currentNode = "start";

// --- MENU BUTTONS ---
document.getElementById("start-game").addEventListener("click", () => {
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("gameplay").style.display = "block";
    loadNode(currentNode);
});

document.getElementById("continue-game").addEventListener("click", () => {
    const saved = localStorage.getItem("vnSave");
    if(saved && story[saved]){
        currentNode = saved;
        document.getElementById("main-menu").style.display = "none";
        document.getElementById("gameplay").style.display = "block";
        loadNode(currentNode);
    } else {
        alert("No save found.");
    }
});

document.getElementById("settings").addEventListener("click", () => alert("Settings clicked"));
document.getElementById("credits").addEventListener("click", () => alert("Credits clicked"));

document.getElementById("exit").addEventListener("click", () => {
    document.body.style.transition = "opacity 0.5s";
    document.body.style.opacity = "0";
    setTimeout(() => document.body.innerHTML = "", 500);
});

document.getElementById("return-menu").addEventListener("click", () => {
    document.getElementById("ending").style.display = "none";
    document.getElementById("main-menu").style.display = "flex";
});

// --- STORY ENGINE ---
fetch("story.json")
    .then(res => res.json())
    .then(data => story = data);

function loadNode(nodeId) {
    const node = story[nodeId];
    if(!node) return;

    // Background
    document.getElementById("background").style.backgroundImage = `url(${node.bg})`;

    // Character
    document.getElementById("character").style.backgroundImage = `url(${node.character})`;

    // Dialogue
    document.getElementById("name-box").innerText = node.name || "";
    document.getElementById("dialogue-text").innerText = node.text || "";

    // Choices
    const choicesDiv = document.getElementById("choices");
    choicesDiv.innerHTML = "";

    if(node.choices){
        node.choices.forEach(choice => {
            const btn = document.createElement("button");
            btn.innerText = choice.label;
            btn.onclick = () => {
                currentNode = choice.goto;
                saveProgress();
                loadNode(currentNode);
            };
            choicesDiv.appendChild(btn);
        });
    } else if(node.goto){
        setTimeout(() => {
            currentNode = node.goto;
            saveProgress();
            loadNode(currentNode);
        }, 1000);
    } else {
        // End node
        document.getElementById("gameplay").style.display = "none";
        document.getElementById("ending").style.display = "block";
        document.getElementById("ending-text").innerText = node.text || "The End";
    }
}

// Save progress
function saveProgress() {
    localStorage.setItem("vnSave", currentNode);
}
