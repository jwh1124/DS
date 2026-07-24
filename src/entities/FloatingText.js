export class FloatingText {
  constructor(game, text, x, y, color = '#fff', isCritical = false) {
    this.game = game;
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.isCritical = isCritical;
    this.life = isCritical ? 1.3 : 0.9;
    this.maxLife = this.life;
    this.vy = isCritical ? -50 : -35;
    this.vx = (Math.random() - 0.5) * 20;
    this.scale = isCritical ? 1.8 : 1.0;
    this.isAlive = true;
  }

  update(dt) {
    if (!this.isAlive) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.isAlive = false;
      return;
    }
    this.y += this.vy * dt;
    this.x += this.vx * dt;
    
    // Scale animation (pop & settle)
    if (this.isCritical && this.life > this.maxLife * 0.7) {
      this.scale = 1.8 + Math.sin((1 - this.life / this.maxLife) * Math.PI * 5) * 0.4;
    }
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    const progress = 1 - (this.life / this.maxLife);
    const alpha = Math.max(0, Math.sin((1 - progress) * Math.PI / 2));
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    const fontSize = this.isCritical ? 22 : 14;
    ctx.font = `${this.isCritical ? '900' : '700'} ${fontSize}px Orbitron, "Noto Sans KR", sans-serif`;
    ctx.textAlign = 'center';
    
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    
    // Glow effect for criticals
    if (this.isCritical) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#f1c40f';
    }
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = 4;
    ctx.strokeText(this.text, 0, 0);
    
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);
    
    ctx.restore();
  }
}
