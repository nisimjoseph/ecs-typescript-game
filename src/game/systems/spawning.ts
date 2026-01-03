/**
 * @module game/systems/spawning
 * @description Spawning systems - create entities in the world.
 * 
 * These systems spawn enemies, power-ups, and bullets across the infinite world.
 * Enemies are spawned within the world bounds (viewport + world margin).
 * 
 * Interacts with:
 * - SpawnTimer resource: Controls spawn timing
 * - GameState resource: Checks game state and difficulty
 * - Camera resource: Gets current viewport position
 * - WorldBounds resource: Defines spawn area
 */

import { World, Time } from '../../ecs';
import {
  Position,
  Velocity,
  Size,
  Sprite,
  Enemy,
  PowerUp,
  Bullet,
  Health,
  Collider,
  Lifetime,
  Wander,
  FollowTarget,
  Bouncy,
  Trail,
  Damage,
  Player,
} from '../components';
import {
  GameConfig,
  GameState,
  SpawnTimer,
  Logger,
  Camera,
  WorldBounds,
} from '../resources';

/**
 * Generate random spawn position within world bounds but outside viewport.
 * Enemies spawn in the world margin area (between viewport edge + 50px and world edge).
 */
function getRandomWorldSpawnPosition(camera: Camera, worldBounds: WorldBounds): { x: number; y: number } {
  const bounds = worldBounds.getWorldBounds(camera);
  const viewportBounds = camera.getViewportBounds(50); // 50px outside viewport
  
  // Randomly choose to spawn in one of the 4 margin zones
  const zone = Math.floor(Math.random() * 4);
  let x: number, y: number;
  
  switch (zone) {
    case 0: // Top margin (above viewport)
      x = bounds.minX + Math.random() * bounds.width;
      y = bounds.minY + Math.random() * (viewportBounds.minY - bounds.minY);
      break;
    case 1: // Right margin (right of viewport)
      x = viewportBounds.maxX + Math.random() * (bounds.maxX - viewportBounds.maxX);
      y = bounds.minY + Math.random() * bounds.height;
      break;
    case 2: // Bottom margin (below viewport)
      x = bounds.minX + Math.random() * bounds.width;
      y = viewportBounds.maxY + Math.random() * (bounds.maxY - viewportBounds.maxY);
      break;
    default: // Left margin (left of viewport)
      x = bounds.minX + Math.random() * (viewportBounds.minX - bounds.minX);
      y = bounds.minY + Math.random() * bounds.height;
      break;
  }
  
  return { x, y };
}

/**
 * Generate random spawn position anywhere in world bounds (for initial spawn).
 */
function getRandomWorldPosition(camera: Camera, worldBounds: WorldBounds): { x: number; y: number } {
  const bounds = worldBounds.getWorldBounds(camera);
  return {
    x: bounds.minX + Math.random() * bounds.width,
    y: bounds.minY + Math.random() * bounds.height,
  };
}

/**
 * Spawn a single enemy at the given position.
 */
function spawnSingleEnemy(
  world: World,
  x: number,
  y: number,
  type: 'wander' | 'follow'
): void {
  const commands = world.getCommands();

  if (type === 'wander') {
    // Wandering enemy (rect) - spawns and wanders in world
    commands
      .spawn()
      .insert(new Position(x, y))
      .insert(new Velocity(0, 0))
      .insert(new Size(24, 24))
      .insert(new Sprite('#ff6b6b', 'rect'))
      .insert(new Enemy())
      .insert(new Health(50, 50))
      .insert(new Collider(12, 'enemy'))
      .insert(new Wander(40 + Math.random() * 40, 1 + Math.random() * 2));
  } else {
    // Following enemy (round) - starts passive, attacks when player is close
    commands
      .spawn()
      .insert(new Position(x, y))
      .insert(new Velocity(0, 0))
      .insert(new Size(20, 20))
      .insert(new Sprite('#ff4444', 'circle'))
      .insert(new Enemy())
      .insert(new Health(30, 30))
      .insert(new Collider(10, 'enemy'))
      .insert(new FollowTarget(0, 0, 50 + Math.random() * 30));
  }
}

/**
 * Spawn enemies periodically across the world area.
 * Spawns multiple enemies per tick when below target count.
 * Rect enemies (wandering) spawn anywhere in world bounds.
 * Round enemies (following) spawn outside viewport but within world bounds.
 */
export function enemySpawnSystem(world: World): void {
  const time = world.getResource(Time);
  const config = world.getResource(GameConfig);
  const spawnTimer = world.getResource(SpawnTimer);
  const gameState = world.getResource(GameState);
  const logger = world.getResource(Logger);
  const camera = world.getResource(Camera);
  const worldBounds = world.getResource(WorldBounds);
  const hasNoResources = !time || !config || !spawnTimer || !gameState;
  if (hasNoResources) return;

  // Don't spawn if game over
  if (gameState.isGameOver) return;

  // Get world dimensions for max enemy calculation
  let worldWidth = 1800;
  let worldHeight = 1500;
  if (camera && worldBounds) {
    const bounds = worldBounds.getWorldBounds(camera);
    worldWidth = bounds.width;
    worldHeight = bounds.height;
  }

  // Check enemy count against dynamic max based on world size
  const enemyQuery = world.query(Enemy);
  const enemyCount = enemyQuery.count();
  const currentMaxEnemies = gameState.getMaxEnemies(worldWidth, worldHeight);
  const enemyDeficit = currentMaxEnemies - enemyCount;
  
  // Already at max
  if (enemyDeficit <= 0) return;

  // Check spawn timer
  const shouldSpawn = spawnTimer.tick(time.delta);
  if (!shouldSpawn) return;

  // Spawn multiple enemies when significantly below target
  // Spawn up to 3 per tick, more if very low
  const spawnCount = Math.min(enemyDeficit, enemyDeficit > 10 ? 5 : 3);

  for (let i = 0; i < spawnCount; i++) {
    // Get spawn position
    let x: number, y: number;
    if (camera && worldBounds) {
      const pos = getRandomWorldSpawnPosition(camera, worldBounds);
      x = pos.x;
      y = pos.y;
    } else {
      // Fallback to edge spawn for fixed screen mode
      const edge = Math.floor(Math.random() * 4);
      switch (edge) {
        case 0: x = Math.random() * config.canvasWidth; y = -20; break;
        case 1: x = config.canvasWidth + 20; y = Math.random() * config.canvasHeight; break;
        case 2: x = Math.random() * config.canvasWidth; y = config.canvasHeight + 20; break;
        default: x = -20; y = Math.random() * config.canvasHeight; break;
      }
    }

    // Randomly choose enemy type (60% wander, 40% follow)
    const enemyType = Math.random() < 0.6 ? 'wander' : 'follow';
    spawnSingleEnemy(world, x, y, enemyType);
  }

  if (logger && spawnCount > 0) {
    logger.system(`Spawned ${spawnCount} enemies (${enemyCount}/${currentMaxEnemies})`);
  }
}

/**
 * Auto-spawn power-ups when player health is not full and no power-ups exist.
 * Power-ups spawn within the viewport area so player can find them.
 */
export function powerUpAutoSpawnSystem(world: World): void {
  const config = world.getResource(GameConfig);
  const gameState = world.getResource(GameState);
  const logger = world.getResource(Logger);
  const camera = world.getResource(Camera);
  if (!config || gameState?.isGameOver) return;

  // Check if player exists and has less than full health
  const playerQuery = world.query(Position, Health, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) return;

  const [, playerPos, playerHealth] = playerResult;
  const playerNeedsHealing = playerHealth.current < playerHealth.max;
  if (!playerNeedsHealing) return;

  // Check if any power-ups currently exist
  const powerUpQuery = world.query(Position, PowerUp);
  const powerUpCount = powerUpQuery.count();
  const hasPowerUps = powerUpCount > 0;
  if (hasPowerUps) return;

  // Spawn a power-up within viewport area
  let x: number, y: number;
  if (camera) {
    const viewBounds = camera.getViewportBounds(-50); // Inside viewport with margin
    x = viewBounds.minX + Math.random() * (viewBounds.maxX - viewBounds.minX);
    y = viewBounds.minY + Math.random() * (viewBounds.maxY - viewBounds.minY);
  } else {
    x = Math.random() * (config.canvasWidth - 60) + 30;
    y = Math.random() * (config.canvasHeight - 60) + 30;
  }

  const commands = world.getCommands();
  commands
    .spawn()
    .insert(new Position(x, y))
    .insert(new Velocity(0, 0))
    .insert(new Size(20, 20))
    .insert(new Sprite('#00d9ff', 'circle'))
    .insert(new PowerUp())
    .insert(new Health(25, 25)) // Health component stores heal amount
    .insert(new Collider(12, 'powerup'))
    .insert(new Lifetime(15)); // 15 seconds before relocating

  if (logger) {
    logger.entity('Power-up spawned (player needs healing)');
  }
}

/**
 * Spawn a power-up (called via button or timer).
 */
export function spawnPowerUp(world: World): void {
  const config = world.getResource(GameConfig);
  const logger = world.getResource(Logger);
  if (!config) return;

  const x = Math.random() * (config.canvasWidth - 40) + 20;
  const y = Math.random() * (config.canvasHeight - 40) + 20;

  const commands = world.getCommands();
  commands
    .spawn()
    .insert(new Position(x, y))
    .insert(new Velocity(0, 0))
    .insert(new Size(20, 20))
    .insert(new Sprite('#00d9ff', 'circle'))
    .insert(new PowerUp())
    .insert(new Health(25, 25)) // Health component stores heal amount
    .insert(new Collider(12, 'powerup'))
    .insert(new Lifetime(15)); // 15 seconds before relocating

  if (logger) {
    logger.entity('Power-up spawned');
  }
}

/**
 * Spawn a bullet from player (called via button).
 */
export function shootBullet(world: World): void {
  const config = world.getResource(GameConfig);
  const logger = world.getResource(Logger);
  if (!config) return;

  // Get player position
  const playerQuery = world.query(Position, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) {
    console.log('No player found to shoot from!');
    return;
  }

  const [, playerPos] = playerResult;

  // Spawn bullet - YELLOW CIRCLE to distinguish from RED RECTANGLE enemies
  const commands = world.getCommands();
  commands
    .spawn()
    .insert(new Position(playerPos.x, playerPos.y - 20))
    .insert(new Velocity(0, -config.bulletSpeed))
    .insert(new Size(16, 16)) // Larger for visibility
    .insert(new Sprite('#ffff00', 'circle')) // Bright yellow CIRCLE
    .insert(new Trail('#ffff00', 12))
    .insert(new Bullet())
    .insert(new Damage(25))
    .insert(new Collider(15, 'bullet')) // Large collider for easy testing
    .insert(new Lifetime(2));

  if (logger) {
    logger.system('Bullet fired!');
  }
}

/**
 * Spawn an enemy (called via button) - spawns above player for easy testing.
 */
export function spawnEnemy(world: World): void {
  const config = world.getResource(GameConfig);
  const logger = world.getResource(Logger);
  if (!config) return;

  // Get player position to spawn enemy directly above them
  const playerQuery = world.query(Position, Player);
  const playerResult = playerQuery.single();
  let x = Math.random() * config.canvasWidth;
  let y = -20;
  
  // Spawn directly above player for easy shooting test
  if (playerResult) {
    const [, playerPos] = playerResult;
    x = playerPos.x; // Directly above
    y = playerPos.y - 60; // Very close above player
  }

  const commands = world.getCommands();
  commands
    .spawn()
    .insert(new Position(x, y))
    .insert(new Velocity(0, 0))
    .insert(new Size(24, 24))
    .insert(new Sprite('#ff6b6b', 'rect'))
    .insert(new Enemy())
    .insert(new Health(50, 50))
    .insert(new Collider(20, 'enemy')); // Large collider for easy testing
  // Note: Button-spawned enemies don't wander, making it easier to test collision

  if (logger) {
    logger.system('Enemy manually spawned (stationary)');
  }
}
