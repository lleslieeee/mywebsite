// Start Game
document.getElementById("start-game").addEventListener("click", () => {
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("gameplay").style.display = "block";
});

// Continue Game (placeholder)
document.getElementById("continue-game").addEventListener("click", () => {
    alert("Continue Game clicked");
});

// Settings (placeholder)
document.getElementById("settings").addEventListener("click", () => {
    alert("Settings clicked");
});

// Credits (placeholder)
document.getElementById("credits").addEventListener("click", () => {
    alert("Credits clicked");
});

// Exit with animation
document.getElementById("exit").addEventListener("click", () => {
    const menu = document.getElementById("main-menu");
    menu.style.transition = "transform 0.5s, opacity 0.5s";
    menu.style.transform = "scale(0)";
    menu.style.opacity = "0";
    setTimeout(() => {
        window.close(); // may not work in some browsers
        document.body.innerHTML = "<h1>Goodbye!</h1>"; // fallback
    }, 500);
});

// Return to Menu from ending
document.getElementById("return-menu").addEventListener("click", () => {
    document.getElementById("ending").style.display = "none";
    document.getElementById("main-menu").style.display = "flex";
});

function loadAsset(path, placeholderPath) {
  return fetch(path)
    .then(res => {
      if (!res.ok) throw new Error("Asset missing");
      return res.blob();
    })
    .catch(() => fetch(placeholderPath).then(res => res.blob()));
}

// Example usage:
//loadAsset("assets/cgs/ch1/cg01.png", "public/placeholder_cgs/placeholder_cg1.png");
