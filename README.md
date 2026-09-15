# Kingdom Defender Game App

Kingdom Defender is a mobile-friendly browser castle defense game built with HTML, CSS, and vanilla JavaScript using an HTML5 Canvas battlefield.

## Overview

Defend your castle from enemy waves by recruiting defenders, using abilities, and upgrading the kingdom. Enemies scale each wave and bosses appear every 10 waves.

## Features

- Fully client-side gameplay (no backend)
- Modular architecture in `/docs`:
  - `game.js`
  - `enemies.js`
  - `defenders.js`
  - `waves.js`
  - `upgrades.js`
  - `ui.js`
- Defender units:
  - Archer (fast ranged)
  - Knight (durable melee, unlocks wave 3)
  - Mage (high-damage area attacks, unlocks wave 5)
- Enemy types:
  - Goblin, Orc, Brute, Boss (every 10 waves), Elite (from wave 20)
- Wave scaling:
  - More enemies each wave
  - Increased health and speed per wave
- Economy:
  - Gold rewards on enemy defeat
  - Spend gold on recruits, upgrades, and abilities
- Castle systems:
  - Base health, upgradeable stats, and repair options
  - Optional castle attack after damage upgrade
- Special abilities with cooldowns:
  - Fireball
  - Arrow Rain
  - Repair Castle
- Responsive controls:
  - Mouse and touch-friendly buttons
  - Large mobile action controls
- Game states:
  - Main Menu
  - Instructions
  - Gameplay
  - Pause Menu
  - Victory and Game Over screens
- Save system (`localStorage`):
  - Highest wave reached
  - Total gold earned
  - Upgrade levels

## Controls

### Desktop

- Click action buttons to recruit, cast abilities, or upgrade
- Press `P` (or use Pause button) to pause/resume

### Mobile / Tablet

- Tap buttons in the bottom action bar
- Tap upgrade buttons in the top upgrade bar
- Use Play/Instructions/Pause UI overlays as needed

## Installation

1. Clone the repository.
2. Open `/docs/index.html` in a modern browser.

No build step is required.

## GitHub Pages Deployment

1. Push repository to GitHub.
2. In repository settings, open **Pages**.
3. Set source to **Deploy from a branch**.
4. Select your branch and `/docs` folder.
5. Save and open the published URL.

