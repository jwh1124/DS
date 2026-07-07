export class EntityManager {
  constructor(game) {
    this.game = game;
    this.entities = [];
  }

  addEntity(entity) {
    this.entities.push(entity);
  }

  removeEntity(entity) {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
    }
  }

  getEntities() {
    return this.entities;
  }
  
  getEntitiesByTeam(team) {
    return this.entities.filter(e => e.team === team && e.isAlive !== false);
  }

  update(dt) {
    // Update all entities
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      if (entity.isAlive === false) {
        this.entities.splice(i, 1);
      } else {
        entity.update(dt);
      }
    }
  }

  draw(ctx) {
    // Draw all entities
    for (const entity of this.entities) {
      entity.draw(ctx);
    }
  }
}
