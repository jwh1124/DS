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
    
    // Age of War elements
    this.techLevel = 1;
    this.turretCooldown = 0;
    this.turretAttackSpeed = 1.0;
    this.turretDamage = 50;
    this.turretRange = 1000;
  }
  
  upgradeTech() {
    this.techLevel++;
    this.maxHp += 5000;
    this.hp += 5000;
    this.turretAttackSpeed *= 0.7;
    this.turretDamage += 100;
    this.game.entityManager.addEntity(new FloatingText(this.game, `TECH UPGRADED`, this.x, this.y - 100, '#2ecc71'));
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
    if (!this.isAlive) return;
    
    // Turret logic (active only if techLevel > 1)
    if (this.techLevel > 1) {
      if (this.turretCooldown > 0) this.turretCooldown -= dt;
      
      if (this.turretCooldown <= 0) {
        const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
        const enemies = this.game.entityManager.getEntitiesByTeam(enemyTeam);
        
        for (const enemy of enemies) {
          const dx = enemy.x - this.x;
          const dy = enemy.y - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist <= this.turretRange) {
            // Shoot laser
            enemy.takeDamage(this.turretDamage);
            this.game.entityManager.addEntity(new Particle(
              this.game, enemy.x, enemy.y, '#fff', 0.15, 0, 0, 15
            ));
            this.turretCooldown = this.turretAttackSpeed;
            
            // Visual laser line drawn in Base draw loop via a temporary effect,
            // or we just shoot a projectile. Let's shoot a projectile to make it easy.
            this.game.entityManager.addEntity(new Projectile(
              this.game, this.x + (this.team === 'player' ? 50 : -50), this.y - 50, enemy, this.turretDamage, '#2ecc71', this.team
            ));
            break; // Fire once per cooldown
          }
        }
      }
    }
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
    
    const tier = Math.min(3, Math.ceil(this.techLevel / 2));
    
    for (let r = 0; r < sprite.length; r++) {
      for (let c = 0; c < sprite[r].length; c++) {
        const char = sprite[r][c];
        if (char !== '-') {
          if (char === 'k') ctx.fillStyle = '#111';
          else if (char === 'w') ctx.fillStyle = '#fff';
          else if (char === 'c') {
            if (tier === 1) ctx.fillStyle = this.team === 'player' ? '#00e5ff' : '#ff3333';
            else if (tier === 2) ctx.fillStyle = this.team === 'player' ? '#0984e3' : '#d63031';
            else ctx.fillStyle = this.team === 'player' ? '#6c5ce7' : '#8e44ad';
          }
          else if (char === 'g') { // Player dark
            if (tier === 1) ctx.fillStyle = this.team === 'player' ? '#0083b0' : '#b00000';
            else if (tier === 2) ctx.fillStyle = this.team === 'player' ? '#005f73' : '#c0392b';
            else ctx.fillStyle = this.team === 'player' ? '#4a69bd' : '#5f27cd';
          }
          else if (char === 'r') {
            if (tier === 1) ctx.fillStyle = '#e74c3c';
            else if (tier === 2) ctx.fillStyle = '#d63031';
            else ctx.fillStyle = '#8e44ad';
          }
          else if (char === 'd') { // Enemy dark
            if (tier === 1) ctx.fillStyle = '#b00000';
            else if (tier === 2) ctx.fillStyle = '#c0392b';
            else ctx.fillStyle = '#5f27cd';
          }
          else if (char === 'y') {
            if (tier === 1) ctx.fillStyle = '#f1c40f';
            else if (tier === 2) ctx.fillStyle = '#e67e22';
            else ctx.fillStyle = '#00ff00';
          }
          
          ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
        }
      }
    }
    
    // Draw Turret if tech upgraded
    if (this.techLevel > 1) {
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(this.team === 'player' ? 30 : -40, -100, 20, 30);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(this.team === 'player' ? 35 : -35, -95, 10, 10);
    }
    
    ctx.restore();
  }
}
