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
// TYPEWRITER SYSTEM - NUCLEAR FIX
// ======================================================
let isTyping = false;
let fullText = "";
let revealedText = "";
let charIndex = 0;
let typingStartTime = 0;
let typingEndTime = 0;
let pendingAutoOnDuringTyping = false;
let postTypingActions = [];

function typewriter(text, onComplete, postCompleteActions = []) {
    console.log("🎬 TYPEWRITER START - isTyping:", isTyping, "text length:", text?.length);
    
    // NUCLEAR: Complete reset
    clearTimeout(autoTimer);
    isTyping = false;
    pendingAutoOnDuringTyping = false;
    
    // Use completely local variables to avoid any state corruption
    const localFullText = text || "";
    let localRevealedText = "";
    let localCharIndex = 0;
    let localIsTyping = true;
    const localPostActions = [...postCompleteActions]; // Copy array
    
    const box = document.getElementById("dialogue-text");
    box.innerText = "";
    box.style.transition = "";

    // Update globals for external systems only
    fullText = localFullText;
    revealedText = localRevealedText;
    charIndex = localCharIndex;
    isTyping = localIsTyping;
    postTypingActions = localPostActions;

    const baseSpeed = 28;
    const minSpeed = 12;
    const maxSpeed = 45;
    const lengthFactor = Math.min(localFullText.length / 120, 1);
    let speed = baseSpeed - lengthFactor * 12;
    speed = Math.max(minSpeed, Math.min(maxSpeed, speed));

    typingStartTime = Date.now();

    function tick() {
        console.log("⏰ TICK - localCharIndex:", localCharIndex, "localFullText length:", localFullText.length);
        
        if (localCharIndex >= localFullText.length || !localIsTyping) {
            console.log("✅ TYPEWRITER COMPLETE");
            localIsTyping = false;
            isTyping = false;
            typingEndTime = Date.now();
            
            // Execute post-typing actions
            localPostActions.forEach(action => action());
            
            onComplete?.();
            return;
        }

        const c = localFullText[localCharIndex];
        localRevealedText += c;
        box.innerText = localRevealedText;

        // Update globals
        revealedText = localRevealedText;
        charIndex = localCharIndex;

        box.style.transform = "scale(1)";
        setTimeout(() => {
            box.style.transform = "scale(1.0)";
        }, 45);

        localCharIndex++;

        let delay = speed;
        if (".!?".includes(c)) delay += 180;
        else if (",;:".includes(c)) delay += 80;

        console.log("➡️ Next char in", delay, "ms - current:", c);
        autoTimer = setTimeout(tick, delay);
    }

    tick();
}

function finishTyping() {
    if (!isTyping) return;
    console.log("🚀 FINISH TYPING MANUALLY");
    
    const node = story[currentNode]; // 🆕 Get current node
    const box = document.getElementById("dialogue-text");
    isTyping = false;

    clearTimeout(autoTimer);
    charIndex = fullText.length;
    revealedText = fullText;
    box.innerText = fullText;
    typingEndTime = Date.now();
    
    // Execute post-typing actions
    postTypingActions.forEach(action => action());
    postTypingActions = [];
    
    // 🆕 CHECK FOR AUTO-ADVANCE AFTER MANUAL SKIP
    if (autoAdvance && node && node.goto && !node.choices) {
        console.log("🚨 MANUAL SKIP -> AUTO ADVANCE TRIGGERED");
        const delay = computeAutoDelayAfterTyping(node.text || "");
        clearTimeout(autoTimer);
        autoTimer = setTimeout(() => loadNode(node.goto), delay);
    }
}

// ======================================================
// AUTO-READ TIMING - DEBUG VERSION
// ======================================================

function computeReadingTimeMs(text) {
    if (!text) {
        console.log("📖 READING TIME: No text, returning default 2000ms");
        return 2000;
    }
    
    const words = text.trim().split(/\s+/).length;
    const WPM = 200;
    const msPerWord = (60 / WPM) * 1000;
    const readingTime = words * msPerWord;
    
    console.log(`📖 READING TIME: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
    console.log(`   Words: ${words}, WPM: ${WPM}, msPerWord: ${Math.round(msPerWord)}ms`);
    console.log(`   Calculated: ${readingTime}ms (${Math.round(readingTime/1000)}s)`);
    
    return readingTime;
}

function computeAutoDelayAfterTyping(text) {
    console.log("⏱️  AUTO DELAY CALCULATION START");
    
    const readMs = computeReadingTimeMs(text);
    const typingDurationMs = Math.max(0, (typingEndTime || Date.now()) - (typingStartTime || Date.now()));
    
    console.log(`⏱️  TYPING DURATION: ${typingDurationMs}ms`);
    console.log(`⏱️  READING TIME: ${readMs}ms`);
    
    const extraNeeded = readMs - typingDurationMs;
    console.log(`⏱️  EXTRA NEEDED (read - type): ${extraNeeded}ms`);
    
    const afterClamp = Math.max(extraNeeded, 2000);
    console.log(`⏱️  AFTER MIN CLAMP (max with 2000ms): ${afterClamp}ms`);
    
    const finalDelay = Math.min(afterClamp, 10000);
    console.log(`⏱️  FINAL DELAY (min with 10000ms): ${finalDelay}ms`);
    
    console.log(`⏱️  FINAL RESULT: Wait ${finalDelay}ms before auto-advance`);
    console.log("⏱️  AUTO DELAY CALCULATION END");
    
    return finalDelay;
}

// ======================================================
// CLEANUP FUNCTION
// ======================================================

function cleanupGameState() {
    console.log("🧹 CLEANING UP GAME STATE");
    
    // Clear any pending timers
    clearTimeout(autoTimer);
    
    // Reset typing state
    isTyping = false;
    pendingAutoOnDuringTyping = false;
    postTypingActions = [];
    
    // Reset timing variables
    typingStartTime = 0;
    typingEndTime = 0;
    
    console.log("🧹 Game state cleaned up - timers cleared, typing reset");
}

// ======================================================
// UPDATED MENU BUTTONS
// ======================================================

document.getElementById("start-game").addEventListener("click", () => {
    cleanupGameState();
    const startNode = handleNewGame(story);
    
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("gameplay").style.display = "block";
    currentNode = startNode;
    loadNode(startNode);
});

document.getElementById("continue-game").addEventListener("click", () => {
    cleanupGameState();
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

// Back buttons for Settings and Credits
document.getElementById("back-from-settings").addEventListener("click", () => {
    document.getElementById("settings-menu").style.display = "none";
    document.getElementById("main-menu").style.display = "flex";
});

document.getElementById("back-from-credits").addEventListener("click", () => {
    document.getElementById("credits-menu").style.display = "none";
    document.getElementById("main-menu").style.display = "flex";
});
document.getElementById("settings").addEventListener("click", () => {
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("settings-menu").style.display = "flex";
});

document.getElementById("credits").addEventListener("click", () => {
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("credits-menu").style.display = "flex";
});
document.getElementById("exit").addEventListener("click", () => {
    cleanupGameState();
    document.body.style.transition = "opacity 0.5s";
    document.body.style.opacity = "0";
    setTimeout(() => document.body.innerHTML = "", 500);
});

document.getElementById("return-menu").addEventListener("click", () => {
    console.log("🏠 RETURNING TO MENU - Cleaning up...");
    cleanupGameState();
    document.getElementById("ending").style.display = "none";
    document.getElementById("main-menu").style.display = "flex";
});

document.getElementById("auto-toggle").addEventListener("click", () => {
    autoAdvance = !autoAdvance;

    document.getElementById("auto-toggle").innerText =
        `Auto-Advance: ${autoAdvance ? "ON" : "OFF"}`;

    const node = story[currentNode];

    if (autoAdvance && isTyping) {
        pendingAutoOnDuringTyping = true;
        return;
    }

    if (autoAdvance && node && !node.choices && node.goto && !isTyping) {
        clearTimeout(autoTimer);
        const readMs = computeReadingTimeMs(node.text || "");
        const finalDelay = Math.min(Math.max(readMs, 2000), 10000);
        autoTimer = setTimeout(() => loadNode(node.goto), finalDelay);
    }

    if (!autoAdvance) {
        pendingAutoOnDuringTyping = false;
        clearTimeout(autoTimer);
    }
});

// ======================================================
// NODE LOADER
// ======================================================
function loadNode(nodeId) {
    console.log("🔄 LOAD NODE:", nodeId, "current isTyping:", isTyping);
    
    const node = story[nodeId];
    if (!node) return;

    // Reset typing state before new node
    if (isTyping) {
        console.log("🛑 Interrupting previous typing");
        clearTimeout(autoTimer);
        isTyping = false;
    }
    pendingAutoOnDuringTyping = false;

    currentNode = nodeId;
    saveProgress(nodeId);

    // Display background/character/name
    document.getElementById("background").style.backgroundImage = node.bg ? `url(${node.bg})` : "";
    document.getElementById("character").style.backgroundImage = node.character ? `url(${node.character})` : "";
    document.getElementById("name-box").innerText = node.name || "";

    // Clear choices container immediately
    const choiceBox = document.getElementById("choices");
    choiceBox.innerHTML = "";

    // Function to render choices (will be called after typing)
    const renderChoices = () => {
        if (node.choices) {
            node.choices.forEach((choice, index) => {
                const btn = document.createElement("button");
                btn.innerText = choice.label;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    clearTimeout(autoTimer);
                    recordChoice(nodeId, index);
                    loadNode(choice.goto);
                };
                choiceBox.appendChild(btn);
            });
        }
    };

    // Pass renderChoices as post-typing action
    typewriter(node.text || "", () => {
        console.log("🔔 TYPING COMPLETE CALLBACK - Auto:", autoAdvance, "Has goto:", node.goto, "Has choices:", node.choices);
        
        if (pendingAutoOnDuringTyping && autoAdvance && node.goto && !node.choices) {
            console.log("🚨 USING PENDING AUTO-ON DELAY (2s)");
            pendingAutoOnDuringTyping = false;
            clearTimeout(autoTimer);
            autoTimer = setTimeout(() => loadNode(node.goto), 2000);
            return;
        }

        if (autoAdvance && node.goto && !node.choices) {
            console.log("🚨 COMPUTING AUTO DELAY");
            const delay = computeAutoDelayAfterTyping(node.text || "");
            clearTimeout(autoTimer);
            autoTimer = setTimeout(() => loadNode(node.goto), delay);
        } else {
            console.log("🚨 AUTO DELAY NOT TRIGGERED - Conditions:", {
                autoAdvance,
                hasGoto: !!node.goto,
                hasChoices: !!node.choices
            });
        }
    }, node.choices ? [renderChoices] : []);

    if (node.goto && !node.choices) {
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

    if (isTyping) {
        finishTyping();
        return;
    }

    if (node && node.choices) return;

    if (node && node.goto) {
        clearTimeout(autoTimer);
        loadNode(node.goto);
    }
});
