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
 * - Camera and world bounds (infinite scrolling world)
 */

// Re-export SoundManager from audio module
export { SoundManager } from './audio';

// Re-export Camera and WorldBounds for infinite scrolling world
export { Camera, WorldBounds, BossTerritory } from './resources/camera';

// Re-export MobileControls for easy access
export { MobileControls, isMobileDevice } from './mobile_controls';
import type { MobileControls as MobileControlsType } from './mobile_controls';

/**
 * Mobile controls resource - holds reference to mobile touch controls.
 * Used to sync touch state to Input resource each frame.
 */
export class MobileControlsResource {
  constructor(public controls: MobileControlsType | null = null) {}
}

/**
 * Touch input state interface (imported from mobile_controls)
 */
export interface TouchInputState {
  moveX: number;
  moveY: number;
  shooting: boolean;
  shieldActive: boolean;
  turboActive: boolean;
  bombTriggered: boolean;
}

/**
 * Input resource - tracks keyboard and touch input state.
 */
export class Input {
  /** Currently pressed keys */
  private pressed: Set<string> = new Set();
  /** Keys that were just pressed this frame */
  private justPressed: Set<string> = new Set();
  /** Keys that were just released this frame */
  private justReleased: Set<string> = new Set();
  
  /** Touch/mobile input state */
  private touchState: TouchInputState | null = null;
  /** Whether mobile controls are active */
  private mobileMode = false;

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
   * Enable mobile mode with touch controls.
   */
  setMobileMode(enabled: boolean): void {
    this.mobileMode = enabled;
  }

  /**
   * Check if mobile mode is active.
   */
  isMobileMode(): boolean {
    return this.mobileMode;
  }

  /**
   * Update touch state from mobile controls.
   */
  setTouchState(state: TouchInputState): void {
    this.touchState = state;
  }

  /**
   * Get normalized movement input (-1 to 1) from touch controls.
   */
  getTouchMovement(): { x: number; y: number } {
    if (this.touchState) {
      return { x: this.touchState.moveX, y: this.touchState.moveY };
    }
    return { x: 0, y: 0 };
  }

  /**
   * Check if a key is currently held down.
   * In mobile mode, also checks touch state for equivalent actions.
   */
  isPressed(key: string): boolean {
    const k = key.toLowerCase();
    
    // Always check keyboard first
    if (this.pressed.has(k)) return true;
    
    // In mobile mode, map touch state to keys
    if (this.mobileMode && this.touchState) {
      if (k === ' ' && this.touchState.shooting) return true;
      if (k === 'y' && this.touchState.shieldActive) return true;
      if (k === 't' && this.touchState.turboActive) return true;
    }
    
    return false;
  }

  /**
   * Check if a key was just pressed this frame.
   * In mobile mode, checks touch state for bomb trigger.
   */
  isJustPressed(key: string): boolean {
    const k = key.toLowerCase();
    
    if (this.justPressed.has(k)) return true;
    
    // Bomb requires special handling (250ms hold triggers "just pressed")
    if (this.mobileMode && this.touchState && k === 'b' && this.touchState.bombTriggered) {
      return true;
    }
    
    return false;
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
  /** Enemy density: 1 enemy per this many square pixels */
  enemyDensity: number = 80000; // ~1 enemy per 283x283 area
  /** Minimum enemies regardless of world size */
  minEnemies: number = 8;
  /** Cached world area for max enemy calculation */
  private cachedWorldArea: number = 0;
  private cachedMaxEnemies: number = 0;

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
   * Calculate max enemies based on world area.
   * Formula: (worldArea / density) + difficultyBonus, min 15
   */
  getMaxEnemies(worldWidth: number = 1800, worldHeight: number = 1500): number {
    const worldArea = worldWidth * worldHeight;
    
    // Use cache if world size unchanged
    if (worldArea === this.cachedWorldArea && this.difficultyLevel === 0) {
      return this.cachedMaxEnemies + this.difficultyLevel * 2;
    }
    
    // Calculate based on density
    const baseCount = Math.floor(worldArea / this.enemyDensity);
    const difficultyBonus = this.difficultyLevel * 2;
    const maxEnemies = Math.max(this.minEnemies, baseCount) + difficultyBonus;
    
    // Cache result
    this.cachedWorldArea = worldArea;
    this.cachedMaxEnemies = Math.max(this.minEnemies, baseCount);
    
    return maxEnemies;
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
