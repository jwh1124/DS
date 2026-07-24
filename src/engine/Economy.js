export class Economy {
  constructor(game) {
    this.game = game;
    this.minerals = 200; // Boosted starting minerals for smoother opening
    this.income = 60;    // Boosted starting income
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
