export class FloatingText {
  constructor(game, text, x, y, color = '#fff', isCritical = false) {
    this.game = game;
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.isCritical = isCritical;
    this.life = isCritical ? 1.05 : 0.78;
    this.maxLife = this.life;
    this.vy = isCritical ? -46 : -30;
    this.vx = (Math.random() - 0.5) * 12;
    this.scale = isCritical ? 1.2 : 0.92;
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
    
    const progress = 1 - this.life / this.maxLife;
    const pop = Math.sin(Math.min(1, progress * 6) * Math.PI * 0.5);
    this.scale = (this.isCritical ? 1.12 : 0.9) + pop * (this.isCritical ? 0.22 : 0.1);
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    const progress = 1 - (this.life / this.maxLife);
    const alpha = Math.max(0, Math.sin((1 - progress) * Math.PI / 2));
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    const fontSize = this.isCritical ? 20 : 14;
    const damageText = this.isCritical ? this.text.replace('CRIT! ', '') : this.text;
    ctx.font = `${this.isCritical ? '900' : '800'} ${fontSize}px "Noto Sans KR", sans-serif`;
    ctx.textAlign = 'center';
    
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    
    if (this.isCritical) {
      ctx.font = '800 10px Cinzel, "Noto Sans KR", sans-serif';
      ctx.fillStyle = '#d7b56a';
      ctx.fillText('CRITICAL', 0, -fontSize * 0.8);
      ctx.font = `900 ${fontSize}px "Noto Sans KR", sans-serif`;
    }
    
    ctx.strokeStyle = 'rgba(20, 15, 15, 0.95)';
    ctx.lineWidth = this.isCritical ? 3 : 2.5;
    ctx.strokeText(damageText, 0, 0);
    
    ctx.fillStyle = this.color;
    ctx.fillText(damageText, 0, 0);
    
    ctx.restore();
  }
}
