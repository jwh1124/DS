const BASE_SPRITE_PLAYER = [
  "------------------------",
  "---------kkkkkk---------",
  "-------kkcccccckk-------",
  "------kcccccccccck------",
  "-----kcccccccccccck-----",
  "-----kckwkkcccckkck-----",
  "----kcckwkkcccckkwcck---",
  "---kccccccccccccccccck--",
  "---kccccccccccccccccck--",
  "--kcccgccccccccccgcccck-",
  "--kcccggccccccccggcccck-",
  "-kccccggccckkcccggccccck",
  "-kccccccccckkcccccccccck",
  "kkkcccccccccccccccccckkk",
  "kggkcccccccccccccccckggk",
  "kggkccccckkkkkkccccckggk",
  "kggkcccckwwwwwwkcccckggk",
  "kggkcccckwwwwwwkcccckggk",
  "kggkccgckwwwwwwkcggckggk",
  "kggkccggkkkkkkkkcggckggk",
  "-kggkccccccccccccckggk--",
  "-kggkccccccccccccckggk--",
  "--kkkkkkkkkkkkkkkkkkk---",
  "------------------------"
];

const BASE_SPRITE_ENEMY = [
  "------------------------",
  "---------kkkkkk---------",
  "-------kkrrrrrrkk-------",
  "------krrrrrrrrrrk------",
  "-----krrrrrrrrrrrrk-----",
  "-----krkykkrrrrkkyk-----",
  "----krrkykkrrrrkkyrrk---",
  "---krrrrrrrrrrrrrrrrrk--",
  "---krrrrrrrrrrrrrrrrrk--",
  "--krrrdrrrrrrrrrrdrrrrk-",
  "--krrrddrrrrrrrrddrrrrk-",
  "-krrrrddrrrkkrrrddrrrrrk",
  "-krrrrrrrrrkkrrrrrrrrrrk",
  "kkkrrrrrrrrrrrrrrrrrrkkk",
  "kddkrrrrrrrrrrrrrrrrkddk",
  "kddkrrrrrkkkkkkrrrrrkddk",
  "kddkrrrrkyyyyyykrrcrkddk",
  "kddkrrrrkyyyyyykrrcrkddk",
  "kddkrrdckyyyyyykcrrckddk",
  "kddkrrddkkkkkkkkcrrckddk",
  "-kddkrrrrrrrrrrrrrkddk--",
  "-kddkrrrrrrrrrrrrrkddk--",
  "--kkkkkkkkkkkkkkkkkkk---",
  "------------------------"
];


export class Base {
  constructor(game, x, y, team, maxHp) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.team = team;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.radius = 60; 
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
    
    const sprite = this.team === 'player' ? BASE_SPRITE_PLAYER : BASE_SPRITE_ENEMY;
    const pixelSize = 6;
    const w = sprite[0].length * pixelSize;
    const h = sprite.length * pixelSize;
    
    ctx.translate(-w/2, -h/2); // Center
    
    for (let r = 0; r < sprite.length; r++) {
      for (let c = 0; c < sprite[r].length; c++) {
        const char = sprite[r][c];
        if (char !== '-') {
          if (char === 'k') ctx.fillStyle = '#111';
          else if (char === 'c') ctx.fillStyle = '#00e5ff'; // Player main
          else if (char === 'g') ctx.fillStyle = '#0083b0'; // Player dark
          else if (char === 'w') ctx.fillStyle = '#fff';    // Player glass/light
          else if (char === 'r') ctx.fillStyle = '#e74c3c'; // Enemy main
          else if (char === 'd') ctx.fillStyle = '#b00000'; // Enemy dark
          else if (char === 'y') ctx.fillStyle = '#f1c40f'; // Enemy light/yellow
          
          ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
        }
      }
    }
    ctx.restore();
  }
}
