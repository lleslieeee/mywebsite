// ======================================================
// GLOBALS & STORY LOADING (Revamped)
// ======================================================
let autoAdvance = false;
let autoTimer = null;

let isTyping = false;
let fullText = "";
let revealedText = "";
let charIndex = 0;
let typingStartTime = 0;
let typingEndTime = 0;
let pendingAutoOnDuringTyping = false;
let postTypingActions = [];

let story = {};
let currentNode = "start";

let skipMode = false;
let skipInterval = null;

let gameState = {
    flags: {}, // Boolean flags: {has_secret_note: true}
    vars: { friendship_score: 0, study_level: 0 }, // Numeric variables
    lastSaveTime: null
};
// New: Dialogue History (Backlog)
let history = []; 
// New: Settings State (Volume, Speed)
let settings = {
    textSpeed: 28, // Default from typewriter logic
    bgmVolume: 1.0,
    sfxVolume: 1.0
};
// Audio instances
let currentBGM = new Audio();
currentBGM.loop = true;

// ======================================================
// UTILITY FUNCTIONS (New Engine Features)
// ======================================================

function getVar(key) { return gameState.vars[key] || 0; }
function getFlag(key) { return gameState.flags[key] || false; }

function processAction(actionString) {
    const match = actionString.match(/(\w+)\(([^,]+)(?:,\s*([^)]+))?\)/);
    if (!match) return;

    const [_, command, key, value] = match;
    const cleanKey = key.trim();

    console.log(`🎬 ACTION: ${command} on ${cleanKey} with value ${value}`);

    switch (command) {
        case 'set_flag':
            gameState.flags[cleanKey] = (value === 'true');
            break;
        case 'set_var':
            gameState.vars[cleanKey] = parseFloat(value);
            break;
        case 'increment':
            gameState.vars[cleanKey] = (gameState.vars[cleanKey] || 0) + parseFloat(value);
            break;
        case 'decrement':
            gameState.vars[cleanKey] = (gameState.vars[cleanKey] || 0) - parseFloat(value);
            break;
    }
}

function checkCondition(conditionString) {
    if (!conditionString) return true;
    
    // Supports: 'flag_name', '!flag_name', 'var_name > 10'
    if (conditionString.startsWith('!')) {
        const flag = conditionString.substring(1).trim();
        return !getFlag(flag);
    }
    
    const comparisonMatch = conditionString.match(/(\w+)\s*([<>=!]+)\s*(\d+)/);
    if (comparisonMatch) {
        const [_, key, operator, valueStr] = comparisonMatch;
        const varValue = getVar(key.trim());
        const compareValue = parseFloat(valueStr);
        
        switch (operator) {
            case '>': return varValue > compareValue;
            case '<': return varValue < compareValue;
            case '>=': return varValue >= compareValue;
            case '<=': return varValue <= compareValue;
            case '==': return varValue === compareValue;
            default: return false;
        }
    }
    return getFlag(conditionString);
}

function interpolateText(text) {
    if (!text) return "";
    return text.replace(/\{(\w+)\}/g, (match, key) => {
        if (gameState.vars.hasOwnProperty(key)) {
            return gameState.vars[key];
        }
        if (gameState.flags.hasOwnProperty(key)) {
            return gameState.flags[key];
        }
        return match;
    });
}

// ======================================================
// AUDIO ENGINE (New)
// ======================================================
function playBGM(file, fadeTime = 1000) {
    if (!file && currentBGM.src) {
         // Implement fade out logic (simplified for immediate pause)
        currentBGM.pause();
        currentBGM.src = '';
        return;
    }
    if (file && currentBGM.src.includes(file)) return;
    
    if (file) {
        currentBGM.src = `audio/${file}`;
        currentBGM.volume = settings.bgmVolume;
        currentBGM.play().catch(e => console.log("BGM playback blocked:", e));
    }
}

function playSFX(file) {
    if (!file) return;
    const sfx = new Audio(`audio/${file}`);
    sfx.volume = settings.sfxVolume;
    sfx.play().catch(e => console.log("SFX playback blocked:", e));
}


// ======================================================
// CLEANUP FUNCTION
// ======================================================
function cleanupGameState() {
    console.log("🧹 CLEANING UP GAME STATE");
    
    clearTimeout(autoTimer);
    
    isTyping = false;
    pendingAutoOnDuringTyping = false;
    postTypingActions = [];
    
    typingStartTime = 0;
    typingEndTime = 0;
    
    playBGM(null); // Stop music
    
    console.log("🧹 Game state cleaned up - timers cleared, typing reset, audio stopped");
}


// ======================================================
// SAVE & LOAD (Updated to handle state and settings)
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
        // Initialize new save object with current state/settings
        save = { 
            lastNode: nodeId, 
            visited: [], 
            playedChoices: {},
            gameState: gameState,
            settings: settings
        };
    }

    if (!save.visited.includes(nodeId)) save.visited.push(nodeId);
    save.lastNode = nodeId;
    save.gameState = gameState; // Save current global state
    save.settings = settings; // Save current settings
    writeSave(save);
}

function recordChoice(nodeId, choiceIndex) {
    let save = loadSave();
    if (!save) save = { lastNode: nodeId, visited: [nodeId], playedChoices: {}, gameState: gameState, settings: settings };

    if (!save.playedChoices[nodeId]) save.playedChoices[nodeId] = [];
    if (!save.playedChoices[nodeId].includes(choiceIndex)) save.playedChoices[nodeId].push(choiceIndex);

    writeSave(save);
}

function loadGame(slot = 'vn_save') {
    const raw = localStorage.getItem(slot);
    if (!raw) return false;

    try {
        const saveData = JSON.parse(raw);
        currentNode = saveData.lastNode;
        gameState = saveData.gameState;
        settings = saveData.settings;
        history = saveData.history || [];
        applySettings();
        
        console.log(`✅ Game loaded from slot: ${slot}`);
        return true;
    } catch (e) {
        console.error("Failed to load game:", e);
        return false;
    }
}

function loadSettings() {
    const raw = localStorage.getItem("vn_settings");
    if (raw) {
        try {
            settings = JSON.parse(raw);
        } catch { /* ignored */ }
    }
    applySettings();
}

function applySettings() {
    document.getElementById("text-speed-slider").value = settings.textSpeed;
    document.getElementById("text-speed-value").innerText = settings.textSpeed;
    document.getElementById("bgm-volume-slider").value = settings.bgmVolume;
    document.getElementById("bgm-volume-value").innerText = Math.round(settings.bgmVolume * 100);
    currentBGM.volume = settings.bgmVolume;
    // Apply SFX volume
    settings.sfxVolume = settings.bgmVolume; // Simple sync for now
    
    // Update Auto-toggle text based on current state
    document.getElementById("auto-toggle").innerText = `Auto-Advance: ${autoAdvance ? "ON" : "OFF"}`;
}

// ======================================================
// REVAMPED START & CONTINUE LOGIC
// ======================================================

function smartContinue(story) {
    const save = loadSave();
    if (!save) return "start";

    // Restore state from save before checking branches
    gameState = save.gameState;

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
        return new Promise((resolve) => {
            const popup = document.getElementById("custom-popup");
            popup.style.display = "block";
            
            document.getElementById("popup-reset").onclick = () => {
                localStorage.removeItem("vn_save");
                // Reset internal game state to initial values
                gameState = { flags: {}, vars: { friendship_score: 0, study_level: 0 }, lastSaveTime: null };
                history = [];
                popup.style.display = "none";
                resolve("start");
            };
            
            document.getElementById("popup-cancel").onclick = () => {
                popup.style.display = "none";
                resolve(null);
            };
        });
    }
    
    // Initialize internal game state to initial values
    gameState = { flags: {}, vars: { friendship_score: 0, study_level: 0 }, lastSaveTime: null };
    history = [];
    return "start";
}

// ======================================================
// TYPEWRITER SYSTEM - NUCLEAR FIX (Updated for settings & interpolation)
// ======================================================

function typewriter(text, onComplete, postCompleteActions = []) {
    console.log("🎬 TYPEWRITER START - isTyping:", isTyping, "text length:", text?.length);
    
    clearTimeout(autoTimer);
    isTyping = false;
    pendingAutoOnDuringTyping = false;
    
    const localFullText = interpolateText(text) || ""; // 💡 Interpolate Text
    let localRevealedText = "";
    let localCharIndex = 0;
    let localIsTyping = true;
    const localPostActions = [...postCompleteActions];
    
    const box = document.getElementById("dialogue-text");
    box.innerText = "";
    box.style.transition = "";

    fullText = localFullText;
    revealedText = localRevealedText;
    charIndex = localCharIndex;
    isTyping = localIsTyping;
    postTypingActions = localPostActions;

    // 💡 Use setting for base speed
    const baseSpeed = settings.textSpeed; 
    const minSpeed = 12;
    const maxSpeed = 45;
    const lengthFactor = Math.min(localFullText.length / 120, 1);
    let speed = baseSpeed - lengthFactor * 12;
    speed = Math.max(minSpeed, Math.min(maxSpeed, speed));

    typingStartTime = Date.now();

    function tick() {
        if (localCharIndex >= localFullText.length || !localIsTyping) {
            localIsTyping = false;
            isTyping = false;
            typingEndTime = Date.now();
            
            localPostActions.forEach(action => action());
            onComplete?.();
            return;
        }

        const c = localFullText[localCharIndex];
        localRevealedText += c;
        box.innerText = localRevealedText;

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

        autoTimer = setTimeout(tick, delay);
    }

    tick();
}

function finishTyping() {
    if (!isTyping) return;
    console.log("🚀 FINISH TYPING MANUALLY");
    
    const node = story[currentNode]; 
    const box = document.getElementById("dialogue-text");
    isTyping = false;

    clearTimeout(autoTimer);
    charIndex = fullText.length;
    revealedText = fullText;
    box.innerText = fullText;
    typingEndTime = Date.now();
    
    postTypingActions.forEach(action => action());
    postTypingActions = [];
    
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
    if (!text) return 2000;
    
    const words = text.trim().split(/\s+/).length;
    const WPM = 200;
    const msPerWord = (60 / WPM) * 1000;
    const readingTime = words * msPerWord;
    
    return readingTime;
}

function computeAutoDelayAfterTyping(text) {
    const readMs = computeReadingTimeMs(text);
    const typingDurationMs = Math.max(0, (typingEndTime || Date.now()) - (typingStartTime || Date.now()));
    
    const extraNeeded = readMs - typingDurationMs;
    
    const afterClamp = Math.max(extraNeeded, 2000);
    const finalDelay = Math.min(afterClamp, 10000);
    
    return finalDelay;
}

// ======================================================
// NODE LOADER (Updated for all new features)
// ======================================================
function loadNode(nodeId) {
    console.log("🔄 LOAD NODE:", nodeId);
    
    const node = story[nodeId];
    if (!node) {
        console.error(`Node ID '${nodeId}' not found.`);
        return;
    }

    cleanupGameState(); 

    currentNode = nodeId;
    // Save state before processing node (for actions/flags set on node entry)
    if (node.goto || node.choices) {
        saveProgress(nodeId); 
    }
    
    // 💡 Execute Node Actions
    if (node.action) {
        if (Array.isArray(node.action)) {
            node.action.forEach(processAction);
        } else {
            processAction(node.action);
        }
    }
    
    // 💡 Audio and Transition
    playBGM(node.music);
    playSFX(node.sound);
    // document.getElementById("gameplay").className = `transition-${node.transition_in || 'none'}`; // Requires CSS support

    // 💡 Display Background/Character 
    document.getElementById("background").style.backgroundImage = node.bg ? `url(${node.bg})` : "";
    document.getElementById("character").style.backgroundImage = node.character ? `url(${node.character})` : ""; // Retain single char support
    
    // Interpolate name box text
    document.getElementById("name-box").innerText = interpolateText(node.name) || "";
    
    const choiceBox = document.getElementById("choices");
    choiceBox.innerHTML = "";
    
    // Prepare for backlog
    const currentDialogueText = interpolateText(node.text);
    history.push({ 
        name: interpolateText(node.name) || 'Narrator', 
        text: currentDialogueText,
        nodeId: nodeId
    });
    
    const renderChoices = () => {
        if (node.choices) {
            node.choices.forEach((choice, index) => {
                // 💡 Conditional Choice visibility
                if (!checkCondition(choice.condition)) return; 

                const btn = document.createElement("button");
                btn.innerText = interpolateText(choice.label);
                
                const save = loadSave();
                const playedChoices = save?.playedChoices[nodeId] || [];
                if (playedChoices.includes(index)) {
                    btn.classList.add('visited-choice');
                }

                btn.onclick = (e) => {
                    e.stopPropagation();
                    // NOTE: Skip interval is cleared by the main dialogue-box click handler.
                    clearTimeout(autoTimer);

                    // 💡 Execute Choice Actions
                    if (choice.action) {
                        if (Array.isArray(choice.action)) {
                            choice.action.forEach(processAction);
                        } else {
                            processAction(choice.action);
                        }
                    }

                    recordChoice(nodeId, index);
                    loadNode(choice.goto);
                };
                choiceBox.appendChild(btn);
            });
        }
    };

    // Dialogue typing starts
    typewriter(node.text || "", () => {
        
        // --- Logic after typing is COMPLETE ---
        
        // 1. Handle Auto-Advance (Original logic)
        if (pendingAutoOnDuringTyping && autoAdvance && node.goto && !node.choices) {
            pendingAutoOnDuringTyping = false;
            const delay = computeAutoDelayAfterTyping(node.text || "");
            clearTimeout(autoTimer);
            autoTimer = setTimeout(() => loadNode(node.goto), delay);
            return;
        }

        if (autoAdvance && node.goto && !node.choices) {
            const delay = computeAutoDelayAfterTyping(node.text || "");
            clearTimeout(autoTimer);
            autoTimer = setTimeout(() => loadNode(node.goto), delay);
        }
        
        // 🚀 CRITICAL FIX: Restart Skip Mode ONLY after typing completes
        if (skipMode && node.goto && !node.choices) {
            console.log("🚀 RESUMING SKIP MODE after typing completion.");
            startSkipInterval(); 
        }
        
    }, node.choices ? [renderChoices] : []);

    // END NODE
    if (!node.goto && !node.choices) {
        document.getElementById("gameplay").style.display = "none";
        document.getElementById("ending").style.display = "flex";

        document.getElementById("ending-text").innerText = interpolateText(node.text || "The End");
        const endingBg = getEndingBackground(nodeId);
        document.getElementById("ending").style.background = endingBg;
        const badge = document.querySelector('.ending-badge');
        badge.style.animation = 'none'; 
        void badge.offsetWidth; 
        badge.style.animation = 'marioPipeIn 1s ease-out 0.5s both, marioPipeOut 1s ease-in 5.5s both';
    }
}

// ======================================================
// ENDING BACKGROUND HELPER
// ======================================================

function getEndingBackground(endingId) {
    const backgrounds = {
        'ending_success': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'ending_detention': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'ending_peaceful': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'ending_homework': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'ending_friendship': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        'ending_adventure': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        'ending_normal': 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)'
    };
    return backgrounds[endingId] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
}

// ======================================================
// UI/MENU HANDLERS (New and Updated)
// ======================================================

// --- Primary Menu Clicks (Updated) ---
document.getElementById("start-game").addEventListener("click", async () => {
    cleanupGameState();
    const startNode = await handleNewGame(story);
    
    if (startNode) {
        document.getElementById("main-menu").style.display = "none";
        document.getElementById("gameplay").style.display = "block";
        currentNode = startNode;
        loadNode(startNode);
    }
});

document.getElementById("continue-game").addEventListener("click", () => {
    cleanupGameState();
    const nextNode = smartContinue(story);
    if (nextNode === null) {
        alert("All branches unlocked. Returning to main menu.");
        return;
    }

    // Load full state from the save file
    if(loadGame()){
        document.getElementById("main-menu").style.display = "none";
        document.getElementById("gameplay").style.display = "block";
        loadNode(nextNode);
    } else {
        alert("Could not load save game.");
    }
});

document.getElementById("settings").addEventListener("click", () => {
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("settings-menu").style.display = "flex";
    applySettings(); // Ensure sliders are synced
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

// --- Back/Return Clicks (Updated) ---
document.getElementById("back-from-settings").addEventListener("click", () => {
    document.getElementById("settings-menu").style.display = "none";
    document.getElementById("main-menu").style.display = "flex";
});

document.getElementById("back-from-credits").addEventListener("click", () => {
    document.getElementById("credits-menu").style.display = "none";
    document.getElementById("main-menu").style.display = "flex";
});

document.getElementById("return-menu").addEventListener("click", () => {
    cleanupGameState();
    document.getElementById("ending").style.display = "none";
    document.getElementById("main-menu").style.display = "flex";
});

// --- In-Game Quick Menu Handlers (New) ---

document.getElementById("quick-menu-button").addEventListener("click", () => {
    document.getElementById("quick-menu").style.display = "flex";
});

document.getElementById("close-quick-menu").addEventListener("click", () => {
    document.getElementById("quick-menu").style.display = "none";
});

document.getElementById("quick-save").addEventListener("click", () => {
    saveGame('vn_save'); 
    alert('Quick Save Successful!');
    document.getElementById("quick-menu").style.display = "none";
});

document.getElementById("quick-load").addEventListener("click", () => {
    if(loadGame('vn_save')){
        loadNode(currentNode);
        document.getElementById("quick-menu").style.display = "none";
    } else {
        alert('No Quick Save found.');
    }
});

document.getElementById("menu-settings-btn").addEventListener("click", () => {
    document.getElementById("quick-menu").style.display = "none";
    document.getElementById("settings-menu").style.display = "flex";
    applySettings();
});

document.getElementById("return-to-title").addEventListener("click", () => {
    if (confirm("Are you sure you want to exit to the title screen? Unsaved progress will be lost.")) {
        cleanupGameState();
        document.getElementById("gameplay").style.display = "none";
        document.getElementById("quick-menu").style.display = "none";
        document.getElementById("main-menu").style.display = "flex";
    }
});

// --- Backlog/History Handlers (New) ---

document.getElementById("backlog-button").addEventListener("click", () => {
    document.getElementById("backlog-menu").style.display = "flex";
    renderBacklog();
});

document.getElementById("close-backlog-menu").addEventListener("click", () => {
    document.getElementById("backlog-menu").style.display = "none";
});

function renderBacklog() {
    const backlogContent = document.getElementById("backlog-content");
    backlogContent.innerHTML = ''; 

    history.forEach(item => {
        const entry = document.createElement("div");
        entry.className = 'backlog-entry';
        
        const name = document.createElement("strong");
        name.innerText = item.name + ": ";

        const text = document.createElement("span");
        text.innerText = item.text;

        entry.appendChild(name);
        entry.appendChild(text);
        backlogContent.appendChild(entry);
    });
}

// --- Settings Sliders (New) ---

document.getElementById("text-speed-slider").addEventListener("input", (e) => {
    settings.textSpeed = parseInt(e.target.value);
    document.getElementById("text-speed-value").innerText = settings.textSpeed;
    localStorage.setItem("vn_settings", JSON.stringify(settings));
});

document.getElementById("bgm-volume-slider").addEventListener("input", (e) => {
    settings.bgmVolume = parseFloat(e.target.value);
    settings.sfxVolume = parseFloat(e.target.value); // Sync SFX for simplicity
    document.getElementById("bgm-volume-value").innerText = Math.round(settings.bgmVolume * 100);
    currentBGM.volume = settings.bgmVolume;
    localStorage.setItem("vn_settings", JSON.stringify(settings));
});


// ======================================================
// CLICK-TO-SKIP / CLICK-TO-ADVANCE
// ======================================================
document.getElementById("dialogue-box").addEventListener("click", () => {
    const node = story[currentNode];

    // Clear the skip interval on any dialogue box click (User input overrides skip/auto)
    clearInterval(skipInterval);
    skipInterval = null;

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


// ======================================================
// AUTO TOGGLE
// ======================================================
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
        const finalDelay = computeAutoDelayAfterTyping(node.text || "");
        autoTimer = setTimeout(() => loadNode(node.goto), finalDelay);
    }

    if (!autoAdvance) {
        pendingAutoOnDuringTyping = false;
        clearTimeout(autoTimer);
    }
});

// ======================================================
// SKIP TOGGLE (New)
// ======================================================

function startSkipInterval() {
    // Ensure existing timers are cleared before starting new ones
    clearTimeout(autoTimer);
    clearInterval(skipInterval);

    console.log("🚀 SKIP INTERVAL STARTED");
    skipInterval = setInterval(() => {
        const node = story[currentNode];
        
        // 1. If typing, finish it immediately
        if (isTyping) {
            finishTyping(); 
        }
        
        // 2. Check for logical stop points
        if (node && (node.choices || (!node.goto && !node.text))) {
            clearInterval(skipInterval);
            skipInterval = null;
            console.log("🛑 SKIP MODE PAUSED: Choice or End Node found. Mode remains ON.");
            return; // Stop running the interval checks
        }
        
        // 3. If at a dialogue node with a 'goto' and no choices, advance it rapidly
        if (!isTyping && node && node.goto && !node.choices) {
            loadNode(node.goto);
        }
        
    }, 100); // Check every 100ms
}

document.getElementById("skip-toggle").addEventListener("click", () => {
    skipMode = !skipMode;
    const skipButton = document.getElementById("skip-toggle");
    
    // 1. Update button appearance
    skipButton.innerText = `Skip: ${skipMode ? "ON" : "OFF"}`;
    skipButton.classList.toggle('active', skipMode);

    // 2. Control the interval
    if (skipMode) {
        startSkipInterval();
    } else {
        // Exit skip mode
        clearInterval(skipInterval);
        skipInterval = null;
        console.log("🛑 SKIP MODE DEACTIVATED");
    }
});

// ======================================================
// INITIALIZATION
// ======================================================

fetch("story.json")
    .then(res => res.json())
    .then(json => story = json)
    .then(loadSettings)
    .catch(err => console.error("Failed to load story:", err));

// Save helper function
function saveGame(slot) {
    gameState.lastSaveTime = Date.now();
    const saveData = {
        lastNode: currentNode,
        gameState: gameState,
        settings: settings,
        history: history 
    };
    localStorage.setItem(slot, JSON.stringify(saveData));
}