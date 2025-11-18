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

function saveProgress(nodeId) {
    let save = loadSave();
    if (!save) {
        save = { lastNode: nodeId, visited: [], playedChoices: {} };
    }

    if (!save.visited.includes(nodeId)) save.visited.push(nodeId);
    save.lastNode = nodeId;
    writeSave(save);
}

function recordChoice(nodeId, choiceIndex) {
    let save = loadSave();
    if (!save) save = { lastNode: nodeId, visited: [nodeId], playedChoices: {} };

    if (!save.playedChoices[nodeId]) save.playedChoices[nodeId] = [];
    if (!save.playedChoices[nodeId].includes(choiceIndex)) save.playedChoices[nodeId].push(choiceIndex);

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
        if (played < totalChoices) return nodeId; // still playable
    }

    // All branches completed → prompt user
    const reset = confirm(
        "All story branches have been unlocked! Do you want to reset your progress and start over?"
    );

    if (reset) {
        localStorage.removeItem("vn_save");
        return "start";
    } else {
        return null;
    }
}

// ======================================================
// GLOBALS
// ======================================================
let autoAdvance = false;
let autoTimer = null;

let story = {};
let currentNode = "start";

// ======================================================
// MENU BUTTONS
// ======================================================
document.getElementById("start-game").addEventListener("click", () => {
    const startNode = smartStart(story);
    if (startNode === null) {
        alert("Progress not reset. Returning to main menu.");
        return;
    }

    document.getElementById("main-menu").style.display = "none";
    document.getElementById("gameplay").style.display = "block";
    currentNode = startNode;
    loadNode(startNode);
});

document.getElementById("continue-game").addEventListener("click", () => {
    const nextNode = smartStart(story);
    if (nextNode === null) {
        alert("All branches unlocked. Returning to main menu.");
        return;
    }

    document.getElementById("main-menu").style.display = "none";
    document.getElementById("gameplay").style.display = "block";
    currentNode = nextNode;
    loadNode(nextNode);
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

// Auto-advance toggle
document.getElementById("auto-toggle").addEventListener("click", () => {
    autoAdvance = !autoAdvance;
    document.getElementById("auto-toggle").innerText = `Auto-Advance: ${autoAdvance ? "ON" : "OFF"}`;
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

    if (autoTimer) clearTimeout(autoTimer);

    document.getElementById("background").style.backgroundImage = node.bg ? `url(${node.bg})` : "";
    document.getElementById("character").style.backgroundImage = node.character ? `url(${node.character})` : "";
    document.getElementById("name-box").innerText = node.name || "";
    document.getElementById("dialogue-text").innerText = node.text || "";

    const choiceBox = document.getElementById("choices");
    choiceBox.innerHTML = "";

    if (node.choices) {
        node.choices.forEach((choice, index) => {
            const btn = document.createElement("button");
            btn.innerText = choice.label;
            btn.onclick = () => {
                if (autoTimer) clearTimeout(autoTimer);
                recordChoice(nodeId, index);
                loadNode(choice.goto);
            };
            choiceBox.appendChild(btn);
        });
    } else if (node.goto) {
        if (autoAdvance) {
            autoTimer = setTimeout(() => loadNode(node.goto), 4000);
        }
    } else {
        document.getElementById("gameplay").style.display = "none";
        document.getElementById("ending").style.display = "block";
        document.getElementById("ending-text").innerText = node.text || "The End";
    }
}
