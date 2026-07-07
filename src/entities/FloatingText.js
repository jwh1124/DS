export class FloatingText {
  constructor(game, text, x, y, color = '#fff') {
    this.game = game;
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.life = 1.0; // 1 second
    this.maxLife = 1.0;
    this.vy = -30; // Float up
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
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px Orbitron';
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text, this.x, this.y);
    
    ctx.restore();
  }
}
