import { PLAYER_STARTING_INCOME, PLAYER_STARTING_MINERALS } from '../gameConfig.js';

export class Economy {
  constructor(game) {
    this.game = game;
    this.minerals = PLAYER_STARTING_MINERALS;
    this.income = PLAYER_STARTING_INCOME;
    this.isActive = false;
  }

  reset() {
    this.minerals = PLAYER_STARTING_MINERALS;
    this.income = PLAYER_STARTING_INCOME;
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
