// ======================================================
// GLOBALS & STORY LOADING
// ======================================================
let autoAdvance = false;
let autoTimer = null;

let story = {};
let currentNode = "start";

fetch("story.json")
    .then(res => res.json())
    .then(json => story = json)
    .catch(err => console.error("Failed to load story:", err));

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

// ======================================================
// REVAMPED START & CONTINUE LOGIC
// ======================================================

function smartContinue(story) {
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

function handleNewGame(story) {
    const save = loadSave();
    
    if (save && save.visited && save.visited.length > 0) {
        const reset = confirm(
            "You have existing progress. Starting a new game will reset your save. Continue?"
        );
        
        if (reset) {
            localStorage.removeItem("vn_save");
        }

    }
    
    return "start";
}

// ======================================================
// TYPEWRITER SYSTEM
// ======================================================
let isTyping = false;
let fullText = "";
let revealedText = "";
let charIndex = 0;
let typingStartTime = 0;
let typingEndTime = 0;
let pendingAutoOnDuringTyping = false;
let postTypingActions = []; // NEW: Store actions to run after typing

function typewriter(text, onComplete, postCompleteActions = []) { // MODIFIED: Added postCompleteActions
    const box = document.getElementById("dialogue-text");
    fullText = text || "";
    revealedText = "";
    charIndex = 0;
    isTyping = true;
    pendingAutoOnDuringTyping = false;
    postTypingActions = postCompleteActions; // NEW: Store post-typing actions

    box.innerText = "";
    box.style.transition = "";

    const baseSpeed = 28;
    const minSpeed = 12;
    const maxSpeed = 45;
    const lengthFactor = Math.min(fullText.length / 120, 1);
    let speed = baseSpeed - lengthFactor * 12;
    speed = Math.max(minSpeed, Math.min(maxSpeed, speed));

    typingStartTime = Date.now();

    function tick() {
        if (charIndex >= fullText.length) {
            isTyping = false;
            typingEndTime = Date.now();
            
            // NEW: Execute post-typing actions first
            postTypingActions.forEach(action => action());
            postTypingActions = [];
            
            onComplete?.();
            return;
        }

        const c = fullText[charIndex];
        revealedText += c;
        box.innerText = revealedText;

        box.style.transform = "scale(1)";
        setTimeout(() => {
            box.style.transform = "scale(1.0)";
        }, 45);

        charIndex++;

        let delay = speed;
        if (".!?".includes(c)) delay += 180;
        else if (",;:".includes(c)) delay += 80;

        autoTimer = setTimeout(tick, delay);
    }

    tick();
}

function finishTyping() {
    if (!isTyping) return;
    const box = document.getElementById("dialogue-text");
    isTyping = false;

    clearTimeout(autoTimer);
    charIndex = fullText.length;
    revealedText = fullText;
    box.innerText = fullText;
    typingEndTime = Date.now();
    
    // NEW: Execute post-typing actions when manually finishing
    postTypingActions.forEach(action => action());
    postTypingActions = [];
}

// ======================================================
// AUTO-READ TIMING
// ======================================================

// returns estimated human read time in milliseconds (not clamped)
function computeReadingTimeMs(text) {
    if (!text) return 2000;
    const words = text.trim().split(/\s+/).length;
    const WPM = 200; // default, user-setting later
    const msPerWord = (60 / WPM) * 1000;
    return words * msPerWord;
}

// compute the delay AFTER typing finishes before auto-advancing
// formula: extraNeeded = readTimeMs - typingDurationMs
// finalDelayMs = clamp(max(extraNeeded, 2000), 10000)
function computeAutoDelayAfterTyping(text) {
    const readMs = computeReadingTimeMs(text);
    const typingDurationMs = Math.max(0, (typingEndTime || Date.now()) - (typingStartTime || Date.now()));
    const extraNeeded = readMs - typingDurationMs;
    const finalDelay = Math.min(Math.max(extraNeeded, 2000), 10000);
    return finalDelay;
}

// ======================================================
// UPDATED MENU BUTTONS
// ======================================================

document.getElementById("start-game").addEventListener("click", () => {
    const startNode = handleNewGame(story);
    
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("gameplay").style.display = "block";
    currentNode = startNode;
    loadNode(startNode);
});

document.getElementById("continue-game").addEventListener("click", () => {
    const nextNode = smartContinue(story);
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


document.getElementById("auto-toggle").addEventListener("click", () => {
    autoAdvance = !autoAdvance;

    document.getElementById("auto-toggle").innerText =
        `Auto-Advance: ${autoAdvance ? "ON" : "OFF"}`;

    const node = story[currentNode];

    // If turning auto ON while typing -> set a pending flag so we treat it specially when typing ends
    if (autoAdvance && isTyping) {
        pendingAutoOnDuringTyping = true;
        return;
    }

    // If turning auto ON and not typing: if node has linear goto, compute delay and start timer
    if (autoAdvance && node && !node.choices && node.goto && !isTyping) {
        clearTimeout(autoTimer);
        // compute delay based on read time; typingDuration is zero because we're not typing now
        const readMs = computeReadingTimeMs(node.text || "");
        const finalDelay = Math.min(Math.max(readMs, 2000), 10000);
        autoTimer = setTimeout(() => loadNode(node.goto), finalDelay);
    }

    // Turning auto OFF cancels any pending timer
    if (!autoAdvance) {
        pendingAutoOnDuringTyping = false;
        clearTimeout(autoTimer);
    }
});

// ======================================================
// NODE LOADER
// ======================================================
function loadNode(nodeId) {
    const node = story[nodeId];
    if (!node) return;

    currentNode = nodeId;
    saveProgress(nodeId);

    clearTimeout(autoTimer);
    pendingAutoOnDuringTyping = false;
    postTypingActions = []; // NEW: Clear any pending actions

    // Display background/character/name (name appears instantly per your choice A)
    document.getElementById("background").style.backgroundImage = node.bg ? `url(${node.bg})` : "";
    document.getElementById("character").style.backgroundImage = node.character ? `url(${node.character})` : "";
    document.getElementById("name-box").innerText = node.name || "";

    // Clear choices container immediately
    const choiceBox = document.getElementById("choices");
    choiceBox.innerHTML = "";

    // NEW: Function to render choices (will be called after typing)
    const renderChoices = () => {
        if (node.choices) {
            node.choices.forEach((choice, index) => {
                const btn = document.createElement("button");
                btn.innerText = choice.label;
                btn.onclick = () => {
                    clearTimeout(autoTimer);
                    recordChoice(nodeId, index);
                    loadNode(choice.goto);
                };
                choiceBox.appendChild(btn);
            });
        }
    };

    // MODIFIED: Pass renderChoices as post-typing action
    typewriter(node.text || "", () => {
        // typing finished callback
        // if user toggled auto ON during typing -> use a 2s wait before advancing
        if (pendingAutoOnDuringTyping && autoAdvance && node.goto && !node.choices) {
            pendingAutoOnDuringTyping = false;
            clearTimeout(autoTimer);
            autoTimer = setTimeout(() => loadNode(node.goto), 2000);
            return;
        }

        // if auto is enabled, schedule auto-advance using hybrid formula
        if (autoAdvance && node.goto && !node.choices) {
            const delay = computeAutoDelayAfterTyping(node.text || "");
            clearTimeout(autoTimer);
            autoTimer = setTimeout(() => loadNode(node.goto), delay);
        }
    }, node.choices ? [renderChoices] : []); // NEW: Pass choices rendering as post-typing action

    // REMOVED: The old immediate choice rendering code

    // If node has a linear goto but auto is off, do nothing here — advancement handled by clicks or auto timer
    if (node.goto && !node.choices) {
        // If auto is on, a timer will be scheduled after typing finishes (above)
        return;
    }

    // END NODE
    if (!node.goto && !node.choices) {
        document.getElementById("gameplay").style.display = "none";
        document.getElementById("ending").style.display = "block";
        document.getElementById("ending-text").innerText = node.text || "The End";
    }
}

// ======================================================
// CLICK-TO-SKIP / CLICK-TO-ADVANCE
// ======================================================
document.getElementById("dialogue-box").addEventListener("click", () => {
    const node = story[currentNode];

    // If typing → finish instantly
    if (isTyping) {
        finishTyping();
        return;
    }

    // If choices exist → do nothing (player must choose)
    if (node && node.choices) return;

    // If there's a next node → advance manually
    if (node && node.goto) {
        clearTimeout(autoTimer);
        loadNode(node.goto);
    }
});