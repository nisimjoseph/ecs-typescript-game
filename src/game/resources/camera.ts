/**
 * @module game/resources/camera
 * @description Camera and World resources for infinite scrolling world.
 * 
 * The Camera tracks the viewport position in world coordinates.
 * The player stays centered on screen, and the world moves around them.
 * 
 * WorldBounds defines the active world area (viewport + margin).
 * Entities outside world bounds are culled for performance.
 * 
 * Interacts with:
 * - Render system: Transforms world coordinates to screen coordinates
 * - Spawning systems: Spawn entities within world bounds
 * - Culling systems: Remove entities outside world bounds
 * - Player input: Updates camera position based on player movement
 */

/**
 * Camera resource - tracks viewport position in world space.
 * The viewport is centered on the player.
 */
export class Camera {
  /** Camera position in world space (center of viewport) */
  public worldX: number;
  public worldY: number;
  
  /** Viewport dimensions (screen size) */
  public viewportWidth: number;
  public viewportHeight: number;

  constructor(
    worldX: number = 0,
    worldY: number = 0,
    viewportWidth: number = 800,
    viewportHeight: number = 500
  ) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  /**
   * Convert world coordinates to screen coordinates.
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const screenX = worldX - this.worldX + this.viewportWidth / 2;
    const screenY = worldY - this.worldY + this.viewportHeight / 2;
    return { x: screenX, y: screenY };
  }

  /**
   * Convert screen coordinates to world coordinates.
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const worldX = screenX + this.worldX - this.viewportWidth / 2;
    const worldY = screenY + this.worldY - this.viewportHeight / 2;
    return { x: worldX, y: worldY };
  }

  /**
   * Check if a point in world space is within the viewport (+ margin).
   */
  isInViewport(worldX: number, worldY: number, margin: number = 0): boolean {
    const halfW = this.viewportWidth / 2 + margin;
    const halfH = this.viewportHeight / 2 + margin;
    const dx = Math.abs(worldX - this.worldX);
    const dy = Math.abs(worldY - this.worldY);
    return dx <= halfW && dy <= halfH;
  }

  /**
   * Get viewport bounds in world space.
   */
  getViewportBounds(margin: number = 0): { 
    minX: number; maxX: number; 
    minY: number; maxY: number 
  } {
    const halfW = this.viewportWidth / 2 + margin;
    const halfH = this.viewportHeight / 2 + margin;
    return {
      minX: this.worldX - halfW,
      maxX: this.worldX + halfW,
      minY: this.worldY - halfH,
      maxY: this.worldY + halfH,
    };
  }

  /**
   * Update viewport dimensions (for resize handling).
   */
  setViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }
}

/**
 * WorldBounds resource - defines the active world area.
 * World extends 500px beyond viewport in each direction.
 * Only entities within world bounds are kept; others are culled.
 */
export class WorldBounds {
  /** Margin beyond viewport that defines world bounds (default: 500px) */
  public readonly worldMargin: number;
  
  /** Render margin - entities within viewport + this margin are rendered (default: 100px) */
  public readonly renderMargin: number;
  
  /** Attack proximity - round enemies attack when within this margin of viewport (default: 50px) */
  public readonly attackProximity: number;
  
  /** Boss detection margin - boss attacks when player viewport is within this margin (default: 100px) */
  public readonly bossDetectionMargin: number;

  constructor(
    worldMargin: number = 500,
    renderMargin: number = 100,
    attackProximity: number = 50,
    bossDetectionMargin: number = 100
  ) {
    this.worldMargin = worldMargin;
    this.renderMargin = renderMargin;
    this.attackProximity = attackProximity;
    this.bossDetectionMargin = bossDetectionMargin;
  }

  /**
   * Get world bounds based on camera position.
   */
  getWorldBounds(camera: Camera): {
    minX: number; maxX: number;
    minY: number; maxY: number;
    width: number; height: number;
  } {
    const halfW = camera.viewportWidth / 2 + this.worldMargin;
    const halfH = camera.viewportHeight / 2 + this.worldMargin;
    return {
      minX: camera.worldX - halfW,
      maxX: camera.worldX + halfW,
      minY: camera.worldY - halfH,
      maxY: camera.worldY + halfH,
      width: halfW * 2,
      height: halfH * 2,
    };
  }

  /**
   * Check if a point is within world bounds.
   */
  isInWorld(worldX: number, worldY: number, camera: Camera): boolean {
    const bounds = this.getWorldBounds(camera);
    return worldX >= bounds.minX && worldX <= bounds.maxX &&
           worldY >= bounds.minY && worldY <= bounds.maxY;
  }

  /**
   * Check if a point is within render area (viewport + renderMargin).
   */
  isInRenderArea(worldX: number, worldY: number, camera: Camera): boolean {
    return camera.isInViewport(worldX, worldY, this.renderMargin);
  }

  /**
   * Check if a point is within attack proximity of viewport.
   */
  isInAttackProximity(worldX: number, worldY: number, camera: Camera): boolean {
    return camera.isInViewport(worldX, worldY, this.attackProximity);
  }
}

/**
 * BossTerritory - defines a boss's home area in the world.
 */
export class BossTerritory {
  constructor(
    public centerX: number,
    public centerY: number,
    public radius: number = 200
  ) {}

  /**
   * Check if a point is within this territory.
   */
  contains(x: number, y: number): boolean {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    return Math.sqrt(dx * dx + dy * dy) <= this.radius;
  }

  /**
   * Check if viewport intersects with territory (for boss activation).
   */
  intersectsViewport(camera: Camera, margin: number = 100): boolean {
    const bounds = camera.getViewportBounds(margin);
    
    // Check if circle intersects with rectangle
    const closestX = Math.max(bounds.minX, Math.min(this.centerX, bounds.maxX));
    const closestY = Math.max(bounds.minY, Math.min(this.centerY, bounds.maxY));
    
    const dx = this.centerX - closestX;
    const dy = this.centerY - closestY;
    return (dx * dx + dy * dy) <= (this.radius * this.radius);
  }
}
