// ======================================================
// SAVE SYSTEM
// ======================================================

function loadSave() {
    const raw = localStorage.getItem("vn_save");
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch { return null; }
}

function writeSave(data) {
    localStorage.setItem("vn_save", JSON.stringify(data));
}

// Called whenever we enter a node
function saveProgress(nodeId) {
    let save = loadSave();

    if (!save) {
        save = {
            lastNode: nodeId,
            visited: [],
            playedChoices: {}
        };
    }

    // Add visited node if new
    if (!save.visited.includes(nodeId)) save.visited.push(nodeId);

    save.lastNode = nodeId;
    writeSave(save);
}

function recordChoice(nodeId, choiceIndex) {
    let save = loadSave();

    if (!save) {
        save = {
            lastNode: nodeId,
            visited: [nodeId],
            playedChoices: {}
        };
    }

    if (!save.playedChoices[nodeId]) {
        save.playedChoices[nodeId] = [];
    }

    if (!save.playedChoices[nodeId].includes(choiceIndex)) {
        save.playedChoices[nodeId].push(choiceIndex);
    }

    writeSave(save);
}

// Smart branching — pick first node with unplayed choices
function smartStart(story) {
    const save = loadSave();
    if (!save) return "start";

    const visited = save.visited || [];

    for (let nodeId of visited) {
        const node = story[nodeId];
        if (!node || !node.choices) continue;

        const totalChoices = node.choices.length;
        const played = (save.playedChoices[nodeId] || []).length;

        if (played < totalChoices) {
            return nodeId; // still playable
        }
    }

    // Everything played → reset!
    localStorage.removeItem("vn_save");
    return "start";
}


// ======================================================
// GLOBALS
// ======================================================

let story = {};
let currentNode = "start";


// ======================================================
// MENU BUTTONS
// ======================================================

document.getElementById("start-game").addEventListener("click", () => {
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("gameplay").style.display = "block";

    const startNode = smartStart(story);
    currentNode = startNode;
    loadNode(startNode);
});

document.getElementById("continue-game").addEventListener("click", () => {
    const save = loadSave();
    if (!save) {
        alert("No save found.");
        return;
    }

    currentNode = save.lastNode;
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("gameplay").style.display = "block";
    loadNode(currentNode);
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


// ======================================================
// STORY LOADING
// ======================================================

fetch("story.json")
    .then(res => res.json())
    .then(json => story = json);


// ======================================================
// NODE LOADER
// ======================================================

function loadNode(nodeId) {
    const node = story[nodeId];
    if (!node) return;

    currentNode = nodeId;
    saveProgress(nodeId);

    // background
    document.getElementById("background").style.backgroundImage =
        node.bg ? `url(${node.bg})` : "";

    // character
    document.getElementById("character").style.backgroundImage =
        node.character ? `url(${node.character})` : "";

    // name + dialogue
    document.getElementById("name-box").innerText = node.name || "";
    document.getElementById("dialogue-text").innerText = node.text || "";

    // choices
    const choiceBox = document.getElementById("choices");
    choiceBox.innerHTML = "";

    if (node.choices) {
        node.choices.forEach((choice, index) => {
            const btn = document.createElement("button");
            btn.innerText = choice.label;
            btn.onclick = () => {
                recordChoice(nodeId, index);
                loadNode(choice.goto);
            };
            choiceBox.appendChild(btn);
        });
    } 
    
    else if (node.goto) {
        // auto-advance
        setTimeout(() => {
            loadNode(node.goto);
        }, 1000);
    } 
    
    else {
        // END NODE
        document.getElementById("gameplay").style.display = "none";
        document.getElementById("ending").style.display = "block";
        document.getElementById("ending-text").innerText = node.text || "The End";
    }
}
