const BASE_SPRITE = [
  "        kkkkkkkk        ",
  "      kkcccccccckk      ",
  "    kkcccccccccckkwk    ",
  "   kcccccccccccccckkwk  ",
  "  kcccccccccccccccckkkw ",
  " kccckkcccccccccckkcckk ",
  " kcckwwkcccccccckwwkcck ",
  "kccckwwkcccccccckwwkccck",
  "kcccckkcccccccccckkcccck",
  "kcccccccccccccccccccccck",
  " kccccckkkkkkkkkkccccck ",
  " kcccccckwwkkwkccccccck ",
  "  kccccckwwkkwkcccccck  ",
  "   kcccckkkkkkkccccck   ",
  "    kcccccccccccccck    ",
  "     kkcccccccccckk     ",
  "       kkkkkkkkkk       "
];

export class Base {
  constructor(game, x, y, team, maxHp) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.team = team;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.radius = 40; 
    this.isAlive = true;
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      const winner = this.team === 'player' ? 'enemy' : 'player';
      this.game.stop(winner);
    }
  }

  update(dt) {
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Draw pixel art base
    const pixelSize = 5;
    const w = BASE_SPRITE[0].length * pixelSize;
    const h = BASE_SPRITE.length * pixelSize;
    
    ctx.translate(-w/2, -h/2); // Center
    
    for (let r = 0; r < BASE_SPRITE.length; r++) {
      for (let c = 0; c < BASE_SPRITE[r].length; c++) {
        const char = BASE_SPRITE[r][c];
        if (char !== ' ') {
          if (char === 'k') ctx.fillStyle = '#111'; // Outline
          else if (char === 'c') ctx.fillStyle = this.team === 'player' ? '#0ff' : '#ff3333'; // Main color
          else if (char === 'w') ctx.fillStyle = '#fff'; // Highlight/Windows
          
          ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
        }
      }
    }
    ctx.restore();
  }
}
