/**
 * @module game/systems/spawning
 * @description Spawning systems - create entities in the world.
 * 
 * These systems spawn enemies, power-ups, and bullets.
 * 
 * Interacts with:
 * - SpawnTimer resource: Controls spawn timing
 * - GameState resource: Checks game state and difficulty
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
} from '../resources';

/**
 * Spawn enemies periodically.
 */
export function enemySpawnSystem(world: World): void {
  const time = world.getResource(Time);
  const config = world.getResource(GameConfig);
  const spawnTimer = world.getResource(SpawnTimer);
  const gameState = world.getResource(GameState);
  const logger = world.getResource(Logger);
  const hasNoResources = !time || !config || !spawnTimer || !gameState;
  if (hasNoResources) return;

  // Don't spawn if game over
  if (gameState.isGameOver) return;

  // Check enemy count against dynamic max (increases every 30 seconds)
  const enemyQuery = world.query(Enemy);
  const enemyCount = enemyQuery.count();
  const currentMaxEnemies = gameState.getMaxEnemies();
  const atMaxEnemies = enemyCount >= currentMaxEnemies;
  if (atMaxEnemies) return;

  // Check spawn timer
  const shouldSpawn = spawnTimer.tick(time.delta);
  if (!shouldSpawn) return;

  // Random spawn position on edge
  const edge = Math.floor(Math.random() * 4);
  let x: number, y: number;

  switch (edge) {
    case 0: // Top
      x = Math.random() * config.canvasWidth;
      y = -20;
      break;
    case 1: // Right
      x = config.canvasWidth + 20;
      y = Math.random() * config.canvasHeight;
      break;
    case 2: // Bottom
      x = Math.random() * config.canvasWidth;
      y = config.canvasHeight + 20;
      break;
    default: // Left
      x = -20;
      y = Math.random() * config.canvasHeight;
      break;
  }

  // Randomly choose enemy type
  const enemyType = Math.random();
  const commands = world.getCommands();

  if (enemyType < 0.5) {
    // Wandering enemy
    commands
      .spawn()
      .insert(new Position(x, y))
      .insert(new Velocity(0, 0))
      .insert(new Size(24, 24))
      .insert(new Sprite('#ff6b6b', 'rect'))
      .insert(new Enemy())
      .insert(new Health(50, 50))
      .insert(new Collider(12, 'enemy'))
      .insert(new Wander(40 + Math.random() * 40, 1 + Math.random() * 2))
      .insert(new Bouncy());
  } else {
    // Following enemy
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

  if (logger) {
    logger.system('Enemy spawned');
  }
}

/**
 * Auto-spawn power-ups when player health is not full and no power-ups exist.
 * Ensures player always has opportunity to heal.
 */
export function powerUpAutoSpawnSystem(world: World): void {
  const config = world.getResource(GameConfig);
  const gameState = world.getResource(GameState);
  const logger = world.getResource(Logger);
  if (!config || gameState?.isGameOver) return;

  // Check if player exists and has less than full health
  const playerQuery = world.query(Position, Health, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) return;

  const [, , playerHealth] = playerResult;
  const playerNeedsHealing = playerHealth.current < playerHealth.max;
  if (!playerNeedsHealing) return;

  // Check if any power-ups currently exist
  const powerUpQuery = world.query(Position, PowerUp);
  const powerUpCount = powerUpQuery.count();
  const hasPowerUps = powerUpCount > 0;
  if (hasPowerUps) return;

  // Spawn a power-up at random location
  const x = Math.random() * (config.canvasWidth - 60) + 30;
  const y = Math.random() * (config.canvasHeight - 60) + 30;

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
