export class Economy {
  constructor(game) {
    this.game = game;
    this.minerals = 250; // Boosted starting minerals (250) for immediate 5 Zealots or 2 Marines
    this.income = 60;    // Starting income per wave (60)
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
