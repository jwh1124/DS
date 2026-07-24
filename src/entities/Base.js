import { FloatingText } from './FloatingText.js';
import { Particle } from './Particle.js';
import { Projectile } from './Projectile.js';

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
    
    this.techLevel = 1;
    this.turretCooldown = 0;
    this.turretAttackSpeed = 1.0;
    this.turretDamage = 50;
    this.turretRange = 1000;
    
    this.shieldHitTimer = 0;
    this.turretAngle = team === 'player' ? 0 : Math.PI;
  }
  
  upgradeTech() {
    this.techLevel++;
    this.maxHp += 5000;
    this.hp += 5000;
    this.turretAttackSpeed *= 0.7;
    this.turretDamage += 100;
    
    if (this.game.audio) {
      this.game.audio.playMagic();
    }
    
    this.game.entityManager.addEntity(new FloatingText(this.game, `★ TECH LV.${this.techLevel} UPGRADE! ★`, this.x, this.y - 120, '#00e5ff', true));
    
    // Tech Upgrade Shockwave & Burst
    this.game.entityManager.addEntity(new Particle(
      this.game, this.x, this.y, '#00e5ff', 0.6, 0, 0, 80, 'shockwave'
    ));
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 140 + 40;
      this.game.entityManager.addEntity(new Particle(
        this.game, this.x, this.y, '#00e5ff', 0.8, speed, angle, 4, 'spark'
      ));
    }
  }

  takeDamage(amount) {
    if (!this.isAlive) return;
    
    this.hp -= amount;
    this.shieldHitTimer = 0.4; // Shield flash duration
    
    if (this.game.addScreenShake) {
      this.game.addScreenShake(3);
    }
    
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      
      // Base Destruction Burst
      if (this.game.addScreenShake) {
        this.game.addScreenShake(20);
      }
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 250 + 50;
        this.game.entityManager.addEntity(new Particle(
          this.game, this.x, this.y, this.team === 'player' ? '#00e5ff' : '#ff3333', 1.2, speed, angle, 5, 'spark'
        ));
      }
      
      const winner = this.team === 'player' ? 'enemy' : 'player';
      this.game.stop(winner);
    }
  }

  update(dt) {
    if (!this.isAlive) return;
    
    if (this.shieldHitTimer > 0) {
      this.shieldHitTimer -= dt;
    }
    
    // Turret logic (active if techLevel > 1)
    if (this.techLevel > 1) {
      if (this.turretCooldown > 0) this.turretCooldown -= dt;
      
      const enemyTeam = this.team === 'player' ? 'enemy' : 'player';
      const enemies = this.game.entityManager.getEntitiesByTeam(enemyTeam);
      
      let closestEnemy = null;
      let closestDist = this.turretRange;
      
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist <= closestDist) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }
      
      if (closestEnemy) {
        this.turretAngle = Math.atan2(closestEnemy.y - (this.y - 70), closestEnemy.x - this.x);
        
        if (this.turretCooldown <= 0) {
          closestEnemy.takeDamage(this.turretDamage);
          this.game.entityManager.addEntity(new Particle(
            this.game, closestEnemy.x, closestEnemy.y, '#ffffff', 0.2, 0, 0, 18, 'spark'
          ));
          this.turretCooldown = this.turretAttackSpeed;
          
          this.game.entityManager.addEntity(new Projectile(
            this.game, 
            this.x + Math.cos(this.turretAngle) * 40, 
            (this.y - 70) + Math.sin(this.turretAngle) * 40, 
            closestEnemy, 
            this.turretDamage, 
            this.team === 'player' ? '#00e5ff' : '#ff3333', 
            this.team,
            true
          ));
        }
      }
    }
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    
    // 1. Base Drop Shadow
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 60, 80, 20, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    
    // 2. Shield Dome Effect
    const shieldColor = this.team === 'player' ? '#00e5ff' : '#ff3333';
    const shieldAlpha = this.shieldHitTimer > 0 ? 0.5 : 0.12 + Math.sin(Date.now() * 0.004) * 0.05;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y - 10, 85, Math.PI, 0, false);
    ctx.fillStyle = this.team === 'player' ? `rgba(0, 229, 255, ${shieldAlpha})` : `rgba(255, 51, 51, ${shieldAlpha})`;
    ctx.fill();
    ctx.strokeStyle = shieldColor;
    ctx.lineWidth = this.shieldHitTimer > 0 ? 4 : 2;
    ctx.shadowBlur = this.shieldHitTimer > 0 ? 25 : 12;
    ctx.shadowColor = shieldColor;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Base Sprite Rendering
    ctx.translate(this.x, this.y);
    
    const sprite = this.team === 'player' ? BASE_SPRITE_PLAYER : BASE_SPRITE_ENEMY;
    const pixelSize = 6;
    const w = sprite[0].length * pixelSize;
    const h = sprite.length * pixelSize;
    
    ctx.translate(-w/2, -h/2);
    
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
          else if (char === 'g') {
            if (tier === 1) ctx.fillStyle = this.team === 'player' ? '#0083b0' : '#b00000';
            else if (tier === 2) ctx.fillStyle = this.team === 'player' ? '#005f73' : '#c0392b';
            else ctx.fillStyle = this.team === 'player' ? '#4a69bd' : '#5f27cd';
          }
          else if (char === 'r') {
            if (tier === 1) ctx.fillStyle = '#e74c3c';
            else if (tier === 2) ctx.fillStyle = '#d63031';
            else ctx.fillStyle = '#8e44ad';
          }
          else if (char === 'd') {
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
    ctx.restore();
    
    // 4. Rotating Defense Turret (if Tech upgraded)
    if (this.techLevel > 1) {
      ctx.save();
      ctx.translate(this.x, this.y - 70);
      ctx.rotate(this.turretAngle);
      
      // Turret base
      ctx.fillStyle = '#1e272e';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shieldColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Turret Barrel
      ctx.fillStyle = '#485460';
      ctx.fillRect(0, -5, 26, 10);
      
      ctx.fillStyle = shieldColor;
      ctx.shadowBlur = 10;
      ctx.shadowColor = shieldColor;
      ctx.fillRect(20, -3, 8, 6);
      
      ctx.restore();
    }
  }
}
