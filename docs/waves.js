const randomLaneY = (height) => {
  const lanes = [height * 0.26, height * 0.44, height * 0.62, height * 0.8];
  return lanes[Math.floor(Math.random() * lanes.length)];
};

export function createWaveConfig(wave, canvasWidth, canvasHeight) {
  const baseCount = 6 + wave * 2;
  const healthMultiplier = 1 + wave * 0.12;
  const speedMultiplier = 1 + wave * 0.02;
  const queue = [];

  let idSeed = wave * 1000;
  const addEnemy = (type, delayOffset = 0) => {
    queue.push({
      id: idSeed++,
      type,
      x: canvasWidth + 30 + Math.random() * 140,
      y: randomLaneY(canvasHeight),
      spawnDelay: delayOffset,
      healthMultiplier,
      speedMultiplier,
    });
  };

  if (wave % 10 === 0) {
    for (let i = 0; i < Math.max(6, baseCount - 4); i += 1) {
      const roll = Math.random();
      addEnemy(roll < 0.5 ? 'goblin' : roll < 0.82 ? 'orc' : 'brute', i * 0.6);
    }
    addEnemy('boss', baseCount * 0.65);
  } else {
    for (let i = 0; i < baseCount; i += 1) {
      const roll = Math.random();
      let type = 'goblin';
      if (roll > 0.65 && roll <= 0.9) type = 'orc';
      if (roll > 0.9) type = 'brute';
      if (wave >= 20 && roll > 0.78 && roll < 0.88) type = 'elite';
      addEnemy(type, i * 0.45);
    }
  }

  return {
    wave,
    queue,
    totalEnemies: queue.length,
    healthMultiplier,
    speedMultiplier,
  };
}
