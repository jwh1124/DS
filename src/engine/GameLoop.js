export class GameLoop {
  constructor(update, draw) {
    this.update = update;
    this.draw = draw;
    this.lastTime = 0;
    this.animationId = null;
  }

  start() {
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.loop.bind(this));
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  loop(timestamp) {
    // Calculate delta time in seconds
    let dt = (timestamp - this.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; // Cap dt to prevent huge jumps if tab is inactive
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    this.animationId = requestAnimationFrame(this.loop.bind(this));
  }
}
