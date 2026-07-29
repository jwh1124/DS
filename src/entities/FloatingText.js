export class FloatingText {
  constructor(game, text, x, y, color = '#fff', presentation = false) {
    this.game = game;
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.presentation = presentation === true ? 'critical' : (presentation || 'normal');
    this.isCritical = this.presentation === 'critical';
    this.isEmphasis = this.presentation === 'emphasis';
    this.life = this.isCritical ? 1.05 : (this.isEmphasis ? 0.95 : 0.78);
    this.maxLife = this.life;
    this.vy = this.isCritical ? -46 : (this.isEmphasis ? -38 : -30);
    this.vx = (Math.random() - 0.5) * 12;
    this.scale = this.isCritical ? 1.2 : (this.isEmphasis ? 1.02 : 0.92);
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
    const baseScale = this.isCritical ? 1.12 : (this.isEmphasis ? 1 : 0.9);
    const popScale = this.isCritical ? 0.22 : (this.isEmphasis ? 0.14 : 0.1);
    this.scale = baseScale + pop * popScale;
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    const progress = 1 - (this.life / this.maxLife);
    const alpha = Math.max(0, Math.sin((1 - progress) * Math.PI / 2));
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    const fontSize = this.isCritical ? 20 : (this.isEmphasis ? 16 : 14);
    const damageText = this.isCritical ? this.text.replace('CRIT! ', '') : this.text;
    ctx.font = `${this.isCritical || this.isEmphasis ? '900' : '800'} ${fontSize}px "Noto Sans KR", sans-serif`;
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
    ctx.lineWidth = this.isCritical ? 3 : (this.isEmphasis ? 2.7 : 2.5);
    ctx.strokeText(damageText, 0, 0);
    
    ctx.fillStyle = this.color;
    ctx.fillText(damageText, 0, 0);
    
    ctx.restore();
  }
}
