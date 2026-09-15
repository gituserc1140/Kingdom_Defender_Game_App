const BASE_COSTS = {
  health: 120,
  damage: 140,
  range: 110,
  repair: 80,
};

export function defaultUpgradeLevels() {
  return { health: 0, damage: 0, range: 0, repair: 0 };
}

export function getUpgradeCost(type, level) {
  const base = BASE_COSTS[type] || 100;
  return Math.round(base * (1 + level * 0.45));
}

export function applyCastleUpgrade(castle, upgradeLevels, type) {
  upgradeLevels[type] += 1;

  if (type === 'health') {
    castle.maxHealth += 25;
    castle.health = Math.min(castle.maxHealth, castle.health + 25);
  }

  if (type === 'damage') {
    castle.damage += 8;
  }

  if (type === 'range') {
    castle.range += 40;
  }

  if (type === 'repair') {
    castle.repairBoost += 10;
    castle.health = Math.min(castle.maxHealth, castle.health + 15 + castle.repairBoost * 0.2);
  }
}
