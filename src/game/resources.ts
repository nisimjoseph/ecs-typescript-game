/**
 * @module game/resources
 * @description Game-specific resources (global singleton data).
 * 
 * Resources are global data that exists independently of entities.
 * Unlike components, resources are not attached to entities.
 * 
 * Used for:
 * - Input state
 * - Game configuration
 * - Score and game state
 * - Canvas context
 * - Sound manager (see audio.ts)
 */

// Re-export SoundManager from audio module
export { SoundManager } from './audio';

/**
 * Input resource - tracks keyboard input state.
 */
export class Input {
  /** Currently pressed keys */
  private pressed: Set<string> = new Set();
  /** Keys that were just pressed this frame */
  private justPressed: Set<string> = new Set();
  /** Keys that were just released this frame */
  private justReleased: Set<string> = new Set();

  constructor() {
    // Set up event listeners
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    const wasNotPressed = !this.pressed.has(key);
    if (wasNotPressed) {
      this.justPressed.add(key);
    }
    this.pressed.add(key);
  }

  private onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.pressed.delete(key);
    this.justReleased.add(key);
  }

  /**
   * Check if a key is currently held down.
   */
  isPressed(key: string): boolean {
    return this.pressed.has(key.toLowerCase());
  }

  /**
   * Check if a key was just pressed this frame.
   */
  isJustPressed(key: string): boolean {
    return this.justPressed.has(key.toLowerCase());
  }

  /**
   * Check if a key was just released this frame.
   */
  isJustReleased(key: string): boolean {
    return this.justReleased.has(key.toLowerCase());
  }

  /**
   * Clear just pressed/released state. Called each frame.
   */
  clear(): void {
    this.justPressed.clear();
    this.justReleased.clear();
  }
}

/**
 * Game config resource - game settings and constants.
 */
export class GameConfig {
  constructor(
    public canvasWidth: number = 800,
    public canvasHeight: number = 500,
    public playerSpeed: number = 200,
    public bulletSpeed: number = 100, // Slow for testing
    public enemySpawnInterval: number = 2,
    public maxEnemies: number = 10
  ) {}
}

/**
 * Game state resource - current game state and score.
 */
export class GameState {
  score: number = 0;
  enemiesKilled: number = 0;
  powerUpsCollected: number = 0;
  bossesKilled: number = 0;
  isGameOver: boolean = false;
  isPaused: boolean = false;
  /** Enemy damage multiplier - increases by 1% every 10 kills */
  enemyDamageMultiplier: number = 1.0;
  /** Difficulty level - increases by 1 every 30 seconds */
  difficultyLevel: number = 0;
  /** Time tracker for difficulty progression */
  difficultyTimer: number = 0;
  /** Base max enemies at start */
  baseMaxEnemies: number = 10;

  addScore(points: number): void {
    this.score += points;
  }

  /**
   * Record an enemy kill and update damage multiplier.
   * Every 10 kills increases enemy damage by 1%.
   */
  recordEnemyKill(): void {
    this.enemiesKilled++;
    // Every 10 kills, increase enemy power by 1%
    this.enemyDamageMultiplier = 1.0 + Math.floor(this.enemiesKilled / 10) * 0.01;
  }

  /**
   * Get scaled enemy damage based on kills.
   */
  getScaledDamage(baseDamage: number): number {
    return Math.round(baseDamage * this.enemyDamageMultiplier);
  }

  /**
   * Update difficulty timer. Returns true if difficulty increased.
   */
  updateDifficulty(deltaTime: number): boolean {
    if (this.isGameOver) return false;
    
    this.difficultyTimer += deltaTime;
    
    // Every 30 seconds, increase difficulty
    if (this.difficultyTimer >= 30) {
      this.difficultyTimer -= 30;
      this.difficultyLevel++;
      return true;
    }
    return false;
  }

  /**
   * Get current max enemies based on difficulty.
   */
  getMaxEnemies(): number {
    return this.baseMaxEnemies + this.difficultyLevel;
  }

  reset(): void {
    this.score = 0;
    this.enemiesKilled = 0;
    this.powerUpsCollected = 0;
    this.bossesKilled = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.enemyDamageMultiplier = 1.0;
    this.difficultyLevel = 0;
    this.difficultyTimer = 0;
  }
}

/**
 * Canvas context resource - for rendering.
 */
export class CanvasContext {
  ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = context;
  }

  clear(color: string = '#0a0a0f'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }
}

/**
 * Logger resource - for displaying system activity.
 */
export class Logger {
  private maxEntries: number = 50;
  private entries: { message: string; type: string }[] = [];
  private logElement: HTMLElement | null = null;

  constructor() {
    this.logElement = document.getElementById('log');
  }

  log(message: string, type: string = 'info'): void {
    this.entries.unshift({ message, type });
    if (this.entries.length > this.maxEntries) {
      this.entries.pop();
    }
    this.updateDisplay();
  }

  system(message: string): void {
    this.log(message, 'system');
  }

  entity(message: string): void {
    this.log(message, 'entity');
  }

  component(message: string): void {
    this.log(message, 'component');
  }

  private updateDisplay(): void {
    if (!this.logElement) return;

    this.logElement.innerHTML = this.entries
      .slice(0, 20)
      .map(
        (entry) =>
          `<div class="log-entry ${entry.type}">${entry.message}</div>`
      )
      .join('');
  }
}

/**
 * Spawn timer resource - controls enemy spawning.
 */
export class SpawnTimer {
  timer: number = 0;

  constructor(
    public interval: number = 2
  ) {}

  tick(deltaTime: number): boolean {
    this.timer += deltaTime;
    const shouldSpawn = this.timer >= this.interval;
    if (shouldSpawn) {
      this.timer = 0;
      return true;
    }
    return false;
  }
}

/**
 * Shoot cooldown resource - controls player shooting.
 */
export class ShootCooldown {
  timer: number = 0;

  constructor(
    public cooldown: number = 0.2
  ) {}

  tick(deltaTime: number): void {
    if (this.timer > 0) {
      this.timer -= deltaTime;
    }
  }

  canShoot(): boolean {
    return this.timer <= 0;
  }

  shoot(): void {
    this.timer = this.cooldown;
  }
}

/**
 * Boss spawn timer resource - controls boss spawning.
 * Only spawns if no boss currently exists.
 */
export class BossSpawnTimer {
  timer: number = 0;

  constructor(
    public interval: number = 15  // Boss spawns every 15 seconds
  ) {}

  tick(deltaTime: number): boolean {
    this.timer += deltaTime;
    const shouldSpawn = this.timer >= this.interval;
    if (shouldSpawn) {
      this.timer = 0;
      return true;
    }
    return false;
  }

  reset(): void {
    this.timer = 0;
  }
}
