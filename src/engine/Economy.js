export class Economy {
  constructor(game) {
    this.game = game;
    this.minerals = 300; // Boosted player starting minerals to 300
    this.income = 70;    // Boosted player starting income to 70 per wave
    this.isActive = false;
  }

  start() {
    this.isActive = true;
  }

  stop() {
    this.isActive = false;
  }

  update(dt) {
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
