import { Enemy } from './enemies.js';
import { Defender, DEFENDER_TYPES } from './defenders.js';
import { createWaveConfig } from './waves.js';
import { applyCastleUpgrade, defaultUpgradeLevels, getUpgradeCost } from './upgrades.js';
import { createUI, formatCooldown, hideAllPanels, showPanel } from './ui.js';

const SAVE_KEY = 'kingdom-defender-save-v1';
const VICTORY_WAVE = 30;

const state = {
  gameState: 'menu',
  gold: 150,
  totalGoldEarned: 0,
  wave: 1,
  highestWave: 1,
  defenders: [],
  enemies: [],
  projectiles: [],
  particles: [],
  popups: [],
  castle: {
    x: 90,
    y: 0,
    width: 82,
    height: 165,
    maxHealth: 100,
    health: 100,
    damage: 0,
    range: 140,
    attackCooldown: 1.0,
    attackTimer: 0,
    repairBoost: 0,
  },
  upgradeLevels: defaultUpgradeLevels(),
  waveQueue: [],
  waveSpawnTimer: 0,
  waveInProgress: false,
  nextWaveDelay: 0,
  enemiesRemaining: 0,
  nextDefenderLane: 0,
  abilityCooldowns: {
    fireball: 0,
    arrowRain: 0,
    repairCastle: 0,
  },
};

const ABILITIES = {
  fireball: { cost: 90, cooldown: 10, damage: 88, radius: 85 },
  arrowRain: { cost: 120, cooldown: 14, damage: 35, hits: 8 },
  repairCastle: { cost: 70, cooldown: 16, heal: 30 },
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ui = createUI();
let lastFrame = performance.now();

function resizeCanvas() {
  const containerWidth = Math.min(window.innerWidth, 1000);
  canvas.width = Math.max(760, Math.floor(containerWidth));
  canvas.height = Math.max(480, Math.floor(window.innerHeight * 0.6));
  state.castle.y = canvas.height * 0.5;
}

function loadSaveData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const save = JSON.parse(raw);
    state.highestWave = Math.max(1, save.highestWave || 1);
    state.totalGoldEarned = Math.max(0, save.totalGoldEarned || 0);

    const levels = save.upgradeLevels || {};
    state.upgradeLevels = {
      health: levels.health || 0,
      damage: levels.damage || 0,
      range: levels.range || 0,
      repair: levels.repair || 0,
    };

    state.castle.maxHealth = 100 + state.upgradeLevels.health * 25;
    state.castle.damage = state.upgradeLevels.damage * 8;
    state.castle.range = 140 + state.upgradeLevels.range * 40;
    state.castle.repairBoost = state.upgradeLevels.repair * 10;
    state.castle.health = state.castle.maxHealth;
  } catch {
    // Ignore invalid save.
  }
}

function saveProgress() {
  const data = {
    highestWave: state.highestWave,
    totalGoldEarned: state.totalGoldEarned,
    upgradeLevels: state.upgradeLevels,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function resetRun() {
  state.gold = 150;
  state.wave = 1;
  state.defenders = [];
  state.enemies = [];
  state.projectiles = [];
  state.particles = [];
  state.popups = [];
  state.waveQueue = [];
  state.waveSpawnTimer = 0;
  state.waveInProgress = false;
  state.nextWaveDelay = 0;
  state.nextDefenderLane = 0;
  state.castle.health = state.castle.maxHealth;
  state.castle.attackTimer = 0;
  state.abilityCooldowns.fireball = 0;
  state.abilityCooldowns.arrowRain = 0;
  state.abilityCooldowns.repairCastle = 0;
}

function startGame() {
  resetRun();
  state.gameState = 'playing';
  hideAllPanels(ui);
  ui.buttons.pause.classList.remove('hidden');
  startWave(1);
}

function startWave(wave) {
  state.wave = wave;
  const waveConfig = createWaveConfig(wave, canvas.width, canvas.height);
  state.waveQueue = waveConfig.queue;
  state.enemiesRemaining = waveConfig.totalEnemies;
  state.waveInProgress = true;
  state.waveSpawnTimer = 0.25;
  state.highestWave = Math.max(state.highestWave, wave);
  saveProgress();
}

function addGold(amount, x, y) {
  state.gold += amount;
  state.totalGoldEarned += amount;
  state.popups.push({ x, y, text: `+${amount}g`, ttl: 0.8 });
}

function recruitDefender(type) {
  if (state.gameState !== 'playing') return;
  const config = DEFENDER_TYPES[type];
  if (!config || state.gold < config.cost) return;

  if (type === 'knight' && state.wave < 3) return;
  if (type === 'mage' && state.wave < 5) return;

  state.gold -= config.cost;

  const laneY = [canvas.height * 0.28, canvas.height * 0.46, canvas.height * 0.64, canvas.height * 0.8];
  const lane = state.nextDefenderLane % laneY.length;
  state.nextDefenderLane += 1;
  const laneCount = state.defenders.filter((d) => Math.abs(d.y - laneY[lane]) < 5).length;

  state.defenders.push(
    new Defender({
      id: Date.now() + Math.random(),
      type,
      x: 220 + laneCount * 48,
      y: laneY[lane],
    })
  );
}

function tryUpgrade(type) {
  if (state.gameState !== 'playing') return;
  if (type !== 'health' && state.wave < 10) return;

  const level = state.upgradeLevels[type] || 0;
  const cost = getUpgradeCost(type, level);
  if (state.gold < cost) return;

  state.gold -= cost;
  applyCastleUpgrade(state.castle, state.upgradeLevels, type);
  saveProgress();
}

function useAbility(name) {
  if (state.gameState !== 'playing') return;
  const ability = ABILITIES[name];
  if (!ability) return;
  if (state.gold < ability.cost) return;
  if (state.abilityCooldowns[name] > 0) return;

  state.gold -= ability.cost;
  state.abilityCooldowns[name] = ability.cooldown;

  if (name === 'fireball') {
    const centerX = canvas.width * 0.72;
    const centerY = canvas.height * (0.25 + Math.random() * 0.55);
    state.particles.push({ type: 'fireball', x: centerX, y: centerY, radius: 0, ttl: 0.6 });

    for (const enemy of state.enemies) {
      if (!enemy.isAlive) continue;
      const dx = enemy.x - centerX;
      const dy = enemy.y - centerY;
      if (Math.hypot(dx, dy) <= ability.radius) {
        if (enemy.takeDamage(ability.damage)) {
          addGold(enemy.reward, enemy.x, enemy.y);
        }
      }
    }
  }

  if (name === 'arrowRain') {
    const targets = state.enemies.filter((e) => e.isAlive).sort((a, b) => b.x - a.x);
    for (let i = 0; i < Math.min(ability.hits, targets.length); i += 1) {
      const target = targets[i];
      state.particles.push({ type: 'arrowStrike', x: target.x, y: target.y, ttl: 0.2 });
      if (target.takeDamage(ability.damage)) {
        addGold(target.reward, target.x, target.y);
      }
    }
  }

  if (name === 'repairCastle') {
    const healAmount = ability.heal + state.castle.repairBoost;
    state.castle.health = Math.min(state.castle.maxHealth, state.castle.health + healAmount);
    state.particles.push({ type: 'heal', x: state.castle.x + 20, y: state.castle.y - 35, ttl: 0.45 });
  }
}

function enemyInRange(x, y, range) {
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const enemy of state.enemies) {
    if (!enemy.isAlive) continue;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance <= range && distance < nearestDistance) {
      nearest = enemy;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function spawnProjectile(fromX, fromY, target, damage, speed, area = 0) {
  state.projectiles.push({
    x: fromX,
    y: fromY,
    targetId: target.id,
    damage,
    speed,
    area,
    ttl: 2,
  });
}

function hitEnemy(enemy, damage, area = 0) {
  if (enemy.takeDamage(damage)) {
    addGold(enemy.reward, enemy.x, enemy.y);
    state.particles.push({ type: 'enemyDeath', x: enemy.x, y: enemy.y, ttl: 0.3 });
  }

  if (area > 0) {
    for (const splash of state.enemies) {
      if (!splash.isAlive || splash.id === enemy.id) continue;
      const d = Math.hypot(splash.x - enemy.x, splash.y - enemy.y);
      if (d <= area) {
        if (splash.takeDamage(Math.round(damage * 0.5))) {
          addGold(splash.reward, splash.x, splash.y);
          state.particles.push({ type: 'enemyDeath', x: splash.x, y: splash.y, ttl: 0.3 });
        }
      }
    }
  }
}

function handleCombat(deltaTime) {
  for (const defender of state.defenders) {
    if (!defender.isAlive) continue;

    defender.update(deltaTime);
    const target = enemyInRange(defender.x, defender.y, defender.range);

    if (!target) continue;
    if (!defender.canAttack()) continue;

    defender.resetAttack();

    if (defender.projectile) {
      spawnProjectile(defender.x, defender.y, target, defender.damage, 420, defender.area);
    } else {
      hitEnemy(target, defender.damage, defender.area);
    }
  }

  if (state.castle.damage > 0) {
    state.castle.attackTimer += deltaTime;
    const target = enemyInRange(state.castle.x + 24, state.castle.y, state.castle.range);
    if (target && state.castle.attackTimer >= state.castle.attackCooldown) {
      state.castle.attackTimer = 0;
      spawnProjectile(state.castle.x + 20, state.castle.y - 35, target, state.castle.damage, 500, 0);
    }
  }

  for (const projectile of state.projectiles) {
    projectile.ttl -= deltaTime;
    const target = state.enemies.find((enemy) => enemy.id === projectile.targetId && enemy.isAlive);
    if (!target) {
      projectile.ttl = 0;
      continue;
    }

    const dx = target.x - projectile.x;
    const dy = target.y - projectile.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 7) {
      hitEnemy(target, projectile.damage, projectile.area);
      projectile.ttl = 0;
      continue;
    }

    projectile.x += (dx / distance) * projectile.speed * deltaTime;
    projectile.y += (dy / distance) * projectile.speed * deltaTime;
  }

  state.projectiles = state.projectiles.filter((p) => p.ttl > 0);
}

function updateEnemies(deltaTime) {
  state.waveSpawnTimer -= deltaTime;
  while (state.waveQueue.length > 0 && state.waveSpawnTimer <= 0) {
    const next = state.waveQueue.shift();
    state.enemies.push(new Enemy(next));
    state.waveSpawnTimer = Math.max(0.12, next.spawnDelay * 0.14);
  }

  for (const enemy of state.enemies) {
    const touchingCastle = enemy.update(deltaTime, state.castle.x);
    if (!enemy.isAlive) continue;

    if (touchingCastle) {
      state.castle.health -= enemy.damage * deltaTime;
      enemy.x += Math.sin(performance.now() * 0.02) * 0.3;
    }

    const nearbyDefender = state.defenders.find(
      (defender) => defender.isAlive && Math.hypot(defender.x - enemy.x, defender.y - enemy.y) <= defender.radius + enemy.radius
    );

    if (nearbyDefender) {
      nearbyDefender.takeDamage(enemy.damage * deltaTime * 0.75);
    }
  }

  state.defenders = state.defenders.filter((defender) => defender.isAlive);
  state.enemies = state.enemies.filter((enemy) => enemy.isAlive || enemy.deathTime > 0);

  if (state.castle.health <= 0) {
    state.castle.health = 0;
    endGame(false);
    return;
  }

  const aliveEnemies = state.enemies.filter((enemy) => enemy.isAlive).length;
  state.enemiesRemaining = aliveEnemies + state.waveQueue.length;

  if (state.enemiesRemaining === 0 && state.waveInProgress) {
    state.waveInProgress = false;
    if (state.wave >= VICTORY_WAVE) {
      endGame(true);
      return;
    }
    state.nextWaveDelay = 3;
  }

  if (!state.waveInProgress && state.gameState === 'playing') {
    state.nextWaveDelay -= deltaTime;
    if (state.nextWaveDelay <= 0) {
      startWave(state.wave + 1);
    }
  }
}

function endGame(victory) {
  state.gameState = victory ? 'victory' : 'gameover';
  ui.buttons.pause.classList.add('hidden');
  saveProgress();

  if (victory) {
    ui.text.victory.textContent = `You survived ${state.wave} waves and earned ${state.totalGoldEarned} gold.`;
    showPanel(ui, 'victory');
  } else {
    ui.text.gameOver.textContent = `You reached wave ${state.wave}. Highest wave: ${state.highestWave}.`;
    showPanel(ui, 'gameOver');
  }
}

function updateEffects(deltaTime) {
  for (const p of state.particles) {
    p.ttl -= deltaTime;
    if (p.type === 'fireball') {
      p.radius += 220 * deltaTime;
    }
  }
  state.particles = state.particles.filter((p) => p.ttl > 0);

  for (const popup of state.popups) {
    popup.ttl -= deltaTime;
    popup.y -= 32 * deltaTime;
  }
  state.popups = state.popups.filter((popup) => popup.ttl > 0);

  state.abilityCooldowns.fireball = Math.max(0, state.abilityCooldowns.fireball - deltaTime);
  state.abilityCooldowns.arrowRain = Math.max(0, state.abilityCooldowns.arrowRain - deltaTime);
  state.abilityCooldowns.repairCastle = Math.max(0, state.abilityCooldowns.repairCastle - deltaTime);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#263453');
  gradient.addColorStop(0.5, '#243248');
  gradient.addColorStop(1, '#121520');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#182033';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.35);
  for (let x = 0; x <= canvas.width; x += 120) {
    ctx.lineTo(x, canvas.height * (0.26 + Math.random() * 0.06));
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0f1524';
  ctx.fillRect(0, canvas.height * 0.85, canvas.width, canvas.height * 0.15);
}

function drawCastle() {
  const { x, y, width, height } = state.castle;
  ctx.fillStyle = '#8a8f99';
  ctx.fillRect(x - width / 2, y - height / 2, width, height);
  ctx.fillStyle = '#656a72';
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(x - width / 2 + 6 + i * 19, y - height / 2 - 12, 12, 14);
  }
}

function drawProjectiles() {
  for (const projectile of state.projectiles) {
    ctx.fillStyle = '#ffec8a';
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEffects() {
  for (const particle of state.particles) {
    if (particle.type === 'fireball') {
      ctx.strokeStyle = `rgba(255, 140, 52, ${particle.ttl})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (particle.type === 'arrowStrike') {
      ctx.strokeStyle = `rgba(255,255,180,${particle.ttl * 2})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y - 28);
      ctx.lineTo(particle.x, particle.y + 8);
      ctx.stroke();
    }

    if (particle.type === 'heal') {
      ctx.strokeStyle = `rgba(90, 255, 160, ${particle.ttl * 2})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 20 * (1 - particle.ttl), 0, Math.PI * 2);
      ctx.stroke();
    }

    if (particle.type === 'enemyDeath') {
      ctx.fillStyle = `rgba(255, 100, 100, ${particle.ttl * 3})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 18 * (1 - particle.ttl), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const popup of state.popups) {
    ctx.fillStyle = `rgba(255, 217, 77, ${popup.ttl + 0.2})`;
    ctx.font = 'bold 16px Arial';
    ctx.fillText(popup.text, popup.x, popup.y);
  }
}

function render() {
  drawBackground();
  drawCastle();

  for (const defender of state.defenders) defender.render(ctx);
  for (const enemy of state.enemies) enemy.render(ctx);

  drawProjectiles();
  drawEffects();
}

function updateUI() {
  ui.values.gold.textContent = Math.floor(state.gold);
  ui.values.castleHealth.textContent = `${Math.max(0, Math.floor(state.castle.health))}/${state.castle.maxHealth}`;
  ui.values.wave.textContent = state.wave;
  ui.values.enemies.textContent = state.enemiesRemaining;

  ui.buttons.recruitKnight.disabled = state.wave < 3 || state.gold < DEFENDER_TYPES.knight.cost || state.gameState !== 'playing';
  ui.buttons.recruitMage.disabled = state.wave < 5 || state.gold < DEFENDER_TYPES.mage.cost || state.gameState !== 'playing';
  ui.buttons.recruitArcher.disabled = state.gold < DEFENDER_TYPES.archer.cost || state.gameState !== 'playing';

  const basicUpgradePlayable = state.gameState === 'playing';
  const specialUnlocked = state.wave >= 10;

  const healthCost = getUpgradeCost('health', state.upgradeLevels.health);
  const damageCost = getUpgradeCost('damage', state.upgradeLevels.damage);
  const rangeCost = getUpgradeCost('range', state.upgradeLevels.range);
  const repairCost = getUpgradeCost('repair', state.upgradeLevels.repair);

  ui.buttons.upgradeHealth.textContent = `Health (${healthCost}g)`;
  ui.buttons.upgradeDamage.textContent = specialUnlocked ? `Damage (${damageCost}g)` : 'Damage (Wave 10)';
  ui.buttons.upgradeRange.textContent = specialUnlocked ? `Range (${rangeCost}g)` : 'Range (Wave 10)';
  ui.buttons.upgradeRepair.textContent = specialUnlocked ? `Repair (${repairCost}g)` : 'Repair (Wave 10)';

  ui.buttons.upgradeHealth.disabled = !basicUpgradePlayable || state.gold < healthCost;
  ui.buttons.upgradeDamage.disabled = !basicUpgradePlayable || !specialUnlocked || state.gold < damageCost;
  ui.buttons.upgradeRange.disabled = !basicUpgradePlayable || !specialUnlocked || state.gold < rangeCost;
  ui.buttons.upgradeRepair.disabled = !basicUpgradePlayable || !specialUnlocked || state.gold < repairCost;

  ui.buttons.fireball.textContent = formatCooldown('Fireball', state.abilityCooldowns.fireball);
  ui.buttons.arrowRain.textContent = formatCooldown('Arrow Rain', state.abilityCooldowns.arrowRain);
  ui.buttons.repairCastle.textContent = formatCooldown('Repair Castle', state.abilityCooldowns.repairCastle);

  ui.buttons.fireball.disabled =
    state.gameState !== 'playing' || state.gold < ABILITIES.fireball.cost || state.abilityCooldowns.fireball > 0;
  ui.buttons.arrowRain.disabled =
    state.gameState !== 'playing' || state.gold < ABILITIES.arrowRain.cost || state.abilityCooldowns.arrowRain > 0;
  ui.buttons.repairCastle.disabled =
    state.gameState !== 'playing' || state.gold < ABILITIES.repairCastle.cost || state.abilityCooldowns.repairCastle > 0;
}

function gameLoop(now) {
  const deltaTime = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  if (state.gameState === 'playing') {
    updateEnemies(deltaTime);
    handleCombat(deltaTime);
    updateEffects(deltaTime);
  }

  render();
  updateUI();
  requestAnimationFrame(gameLoop);
}

function setupEvents() {
  ui.buttons.play.addEventListener('click', startGame);
  ui.buttons.instructions.addEventListener('click', () => showPanel(ui, 'instructions'));
  ui.buttons.backToMenu.addEventListener('click', () => showPanel(ui, 'mainMenu'));

  ui.buttons.pause.addEventListener('click', () => {
    if (state.gameState !== 'playing') return;
    state.gameState = 'paused';
    showPanel(ui, 'pause');
  });

  ui.buttons.resume.addEventListener('click', () => {
    if (state.gameState !== 'paused') return;
    state.gameState = 'playing';
    hideAllPanels(ui);
  });

  ui.buttons.pauseToMenu.addEventListener('click', () => {
    state.gameState = 'menu';
    ui.buttons.pause.classList.add('hidden');
    showPanel(ui, 'mainMenu');
  });

  ui.buttons.playAgain.addEventListener('click', startGame);
  ui.buttons.victoryPlayAgain.addEventListener('click', startGame);

  ui.buttons.recruitArcher.addEventListener('click', () => recruitDefender('archer'));
  ui.buttons.recruitKnight.addEventListener('click', () => recruitDefender('knight'));
  ui.buttons.recruitMage.addEventListener('click', () => recruitDefender('mage'));

  ui.buttons.upgradeHealth.addEventListener('click', () => tryUpgrade('health'));
  ui.buttons.upgradeDamage.addEventListener('click', () => tryUpgrade('damage'));
  ui.buttons.upgradeRange.addEventListener('click', () => tryUpgrade('range'));
  ui.buttons.upgradeRepair.addEventListener('click', () => tryUpgrade('repair'));

  ui.buttons.fireball.addEventListener('click', () => useAbility('fireball'));
  ui.buttons.arrowRain.addEventListener('click', () => useAbility('arrowRain'));
  ui.buttons.repairCastle.addEventListener('click', () => useAbility('repairCastle'));

  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'p') {
      if (state.gameState === 'playing') {
        state.gameState = 'paused';
        showPanel(ui, 'pause');
      } else if (state.gameState === 'paused') {
        state.gameState = 'playing';
        hideAllPanels(ui);
      }
    }
  });

  window.addEventListener('resize', resizeCanvas);
}

function init() {
  loadSaveData();
  resizeCanvas();
  setupEvents();
  showPanel(ui, 'mainMenu');
  requestAnimationFrame(gameLoop);
}

init();
