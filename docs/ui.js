const byId = (id) => document.getElementById(id);

export function createUI() {
  const ui = {
    values: {
      gold: byId('goldValue'),
      castleHealth: byId('castleHealthValue'),
      wave: byId('waveValue'),
      enemies: byId('enemiesValue'),
    },
    buttons: {
      play: byId('playBtn'),
      instructions: byId('instructionsBtn'),
      backToMenu: byId('backToMenuBtn'),
      resume: byId('resumeBtn'),
      pauseToMenu: byId('pauseToMenuBtn'),
      playAgain: byId('playAgainBtn'),
      victoryPlayAgain: byId('victoryPlayAgainBtn'),
      pause: byId('pauseBtn'),
      recruitArcher: byId('recruitArcherBtn'),
      recruitKnight: byId('recruitKnightBtn'),
      recruitMage: byId('recruitMageBtn'),
      fireball: byId('fireballBtn'),
      arrowRain: byId('arrowRainBtn'),
      repairCastle: byId('repairCastleBtn'),
      upgradeHealth: byId('upgradeHealthBtn'),
      upgradeDamage: byId('upgradeDamageBtn'),
      upgradeRange: byId('upgradeRangeBtn'),
      upgradeRepair: byId('upgradeRepairBtn'),
    },
    panels: {
      mainMenu: byId('mainMenu'),
      instructions: byId('instructionsPanel'),
      pause: byId('pauseMenu'),
      gameOver: byId('gameOverScreen'),
      victory: byId('victoryScreen'),
    },
    text: {
      gameOver: byId('gameOverText'),
      victory: byId('victoryText'),
    },
  };

  return ui;
}

export function showPanel(ui, panelName) {
  Object.values(ui.panels).forEach((panel) => panel.classList.remove('visible'));
  Object.values(ui.panels).forEach((panel) => panel.classList.add('hidden'));

  if (!panelName) return;

  ui.panels[panelName].classList.remove('hidden');
  ui.panels[panelName].classList.add('visible');
}

export function hideAllPanels(ui) {
  showPanel(ui, null);
}

export function formatCooldown(label, cooldownRemaining) {
  if (cooldownRemaining <= 0) return label;
  return `${label} (${cooldownRemaining.toFixed(1)}s)`;
}
