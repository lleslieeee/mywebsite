# 🌟 My Choose-Your-Own-Adventure Story

![Story Screenshot](screenshot.png) <!-- Replace with your screenshot file -->

[![GitHub issues](https://img.shields.io/github/issues/lleslieeee/my-vn-game)](https://github.com/lleslieeee/mywebsite/issues)
[![License](https://img.shields.io/github/license/lleslieeee/my-vn-game)](LICENSE)
[![GitHub forks](https://img.shields.io/github/forks/lleslieeee/my-vn-game)](https://github.com/lleslieeee/mywebsite/network)
[![GitHub stars](https://img.shields.io/github/stars/lleslieeee/my-vn-game)](https://github.com/lleslieeee/mywebsite/stargazers)

An **interactive choose-your-own-adventure story** built with HTML, CSS, and JavaScript. Make choices and explore different story paths to reach multiple endings. Perfect for branching narrative experiments or web development practice.

---

## 📌 Table of Contents

- 🌐 [Live Demo](#-live-demo)  
- 🎮 [How to Play](#-how-to-play)  
- ✨ [Features](#-features)  
- 📖 [Story Paths Preview](#-story-paths-preview)  
- 🛠️ [Customization](#%EF%B8%8F-customization)    
- 🤝 [Contributing](#-contributing)  
- 📄 [License](#-license)

---

## 🌐 Live Demo

Try the story online: [Live Story](https://lleslieeee.github.io/my-vn-game/)

---

## 🎮 How to Play

1. Open the story in your browser.  
2. Read the story text on the screen.  
3. Click one of the choice buttons to make decisions.  
4. Follow the story until you reach an ending.  
5. Refresh to play again and explore different paths.  

---

## ✨ Features
- **7 Unique Endings** - Multiple story paths to discover.
- **Smart Save System** - Remembers your progress and unexplored choices.
- **Auto-Advance Mode** - Intelligent reading time calculation.
- **Typewriter Effects** - Animated text with skip functionality.
- **Responsive Design** - Works on desktop and mobile.
- **Interactive single-page experience** – no page reloads.
- **Styled buttons & animations** – simple but pleasant visuals.
- **Fully static** – no backend needed.
- **Easy to customize** – edit `story.json`, add CSS, images, or new story nodes.  

---

## 📖 Story Paths/Endings Guide

| Ending | Title | How to Unlock |
|-------------|----------------|----------------|
| Ending 1 | Academic Success | Go to class → Answer carefully |
| Ending 2 | Detention | Go to class → Cheat secretly |
| Ending 3 | Peaceful Solitude | Skip class → Wander alone |
| Ending 4 | Homework | Skip class → Grab snack → Chat school |
| Ending 5 | Friendship | Skip class → Grab snack → Chat hobbies |
| Ending 6 | Adventure Begins | Rooftop → Read the note |
| Ending 7 | Normal Day | Rooftop → Ignore the note |

---

## 🛠️ Customization

**Modifying the Story**

Edit `story.json` to create new nodes:
#
       "node_id": {
       "bg": "path/to/background.jpg",
       "character": "path/to/character.png",
       "name": "Character Name",
       "text": "Dialogue text...",
       "choices": [
         {"label": "Choice 1", "goto": "next_node"}
       ]
     }
#
**Styling**

Modify `style.css` to customize colors, fonts, and animations.

**Assets**

     - Add backgrounds to `/bg/` folder

     - Add character sprites to `/characters/` folder
---

## 🤝 Contributing

- Fork this repo to create your own story variations.  
- Submit pull requests to improve the story, add features, or fix bugs.  
- Share your version and inspire others to create interactive stories!  

---

## 📄 License

This project is dual-licensed:
- **Code**: MIT License
- **Assets**: Proprietary License

See individual license files for details.

---

> Have fun exploring all the paths and endings of your adventure!  
