export const ENEMY_TYPES = {
  goblin: { color: '#d54444', radius: 15, baseHealth: 48, speed: 58, damage: 11, reward: 18 },
  orc: { color: '#bd3030', radius: 19, baseHealth: 88, speed: 44, damage: 15, reward: 28 },
  brute: { color: '#9b1e1e', radius: 23, baseHealth: 150, speed: 30, damage: 21, reward: 40 },
  boss: { color: '#740f0f', radius: 30, baseHealth: 530, speed: 25, damage: 31, reward: 140 },
  elite: { color: '#ff6b6b', radius: 20, baseHealth: 180, speed: 62, damage: 24, reward: 58 },
};

export class Enemy {
  constructor({ id, type, x, y, healthMultiplier = 1, speedMultiplier = 1 }) {
    const config = ENEMY_TYPES[type];
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = config.radius;
    this.maxHealth = Math.round(config.baseHealth * healthMultiplier);
    this.health = this.maxHealth;
    this.speed = config.speed * speedMultiplier;
    this.damage = config.damage;
    this.reward = config.reward;
    this.isAlive = true;
    this.hitFlash = 0;
    this.deathTime = 0;
  }

  takeDamage(amount) {
    this.health -= amount;
    this.hitFlash = 0.09;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      this.deathTime = 0.25;
      return true;
    }
    return false;
  }

  update(deltaTime, castleX) {
    if (this.isAlive) {
      this.x -= this.speed * deltaTime;
      if (this.hitFlash > 0) this.hitFlash -= deltaTime;
      return this.x <= castleX + this.radius;
    }

    if (this.deathTime > 0) {
      this.deathTime -= deltaTime;
    }
    return false;
  }

  render(ctx) {
    if (!this.isAlive && this.deathTime <= 0) return;

    const alpha = this.isAlive ? 1 : Math.max(0, this.deathTime / 0.25);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.hitFlash > 0 ? '#fff' : ENEMY_TYPES[this.type].color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1010';
    ctx.fillRect(this.x - this.radius, this.y - this.radius - 10, this.radius * 2, 5);
    const ratio = this.health / this.maxHealth;
    ctx.fillStyle = '#56df7f';
    ctx.fillRect(this.x - this.radius, this.y - this.radius - 10, this.radius * 2 * Math.max(0, ratio), 5);
    ctx.restore();
  }
}
