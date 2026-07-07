export class Economy {
  constructor(game) {
    this.game = game;
    this.minerals = 150; // Starting minerals
    this.income = 50;    // Starting income per wave
    this.isActive = false;
  }

  start() {
    this.isActive = true;
  }

  stop() {
    this.isActive = false;
  }

  update(dt) {
    // Passive tick can go here, but in DS income usually comes at wave start
  }
  
  triggerIncome() {
    this.minerals += this.income;
  }

  spendMinerals(amount) {
    if (this.minerals >= amount) {
      this.minerals -= amount;
      return true;
    }
    return false;
  }

  increaseIncome(amount) {
    this.income += amount;
  }
}
