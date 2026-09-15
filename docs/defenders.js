export const DEFENDER_TYPES = {
  archer: { color: '#4caf50', radius: 14, health: 100, damage: 20, attackSpeed: 1.3, range: 250, cost: 60, projectile: true },
  knight: { color: '#4e79ff', radius: 18, health: 220, damage: 34, attackSpeed: 0.85, range: 72, cost: 100, projectile: false },
  mage: { color: '#8e58ff', radius: 16, health: 120, damage: 54, attackSpeed: 0.65, range: 210, cost: 140, projectile: true, area: 42 },
};

export class Defender {
  constructor({ id, type, x, y }) {
    const config = DEFENDER_TYPES[type];
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = config.radius;
    this.maxHealth = config.health;
    this.health = config.health;
    this.damage = config.damage;
    this.attackCooldown = 1 / config.attackSpeed;
    this.range = config.range;
    this.projectile = config.projectile;
    this.area = config.area || 0;
    this.lastAttack = 0;
    this.attackAnim = 0;
    this.isAlive = true;
  }

  update(deltaTime) {
    this.lastAttack += deltaTime;
    if (this.attackAnim > 0) this.attackAnim -= deltaTime;
  }

  canAttack() {
    return this.lastAttack >= this.attackCooldown;
  }

  resetAttack() {
    this.lastAttack = 0;
    this.attackAnim = 0.12;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      return true;
    }
    return false;
  }

  render(ctx) {
    if (!this.isAlive) return;
    ctx.save();
    const pulse = this.attackAnim > 0 ? 4 : 0;
    ctx.fillStyle = DEFENDER_TYPES[this.type].color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0c121d';
    ctx.fillRect(this.x - this.radius, this.y - this.radius - 9, this.radius * 2, 4);
    const ratio = this.health / this.maxHealth;
    ctx.fillStyle = '#66e099';
    ctx.fillRect(this.x - this.radius, this.y - this.radius - 9, this.radius * 2 * Math.max(0, ratio), 4);
    ctx.restore();
  }
}
