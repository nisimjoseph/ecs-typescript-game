/**
 * @module game/logic/bundle_spawning
 * @description Bundle-based entity spawning functions.
 * 
 * Provides functions to spawn entities using the bundle pattern.
 * 
 * Interacts with:
 * - Bundle classes: Creates entities with grouped components
 * - Observer system: Triggers spawn observers
 * - Event system: Sends entity spawned events
 */

import { World, ObserverRegistry } from '../../ecs';
import {
  Position,
  Velocity,
  Rotation,
  Size,
  Sprite,
  Bullet,
  Enemy,
  PowerUp,
  Damage,
  Collider,
  Lifetime,
  Trail,
  Player,
} from '../components';
import { GameConfig, GameState } from '../resources';
import {
  WanderingEnemyBundle,
  ChasingEnemyBundle,
  PowerUpBundle,
} from '../bundles';
import {
  GameEvents,
  EntitySpawnedEvent,
  PlayerShootEvent,
} from '../events';
import { triggerSpawnObserver } from '../observers';

/**
 * Spawn enemy using bundle.
 * DEMONSTRATES: Bundle spawning pattern
 */
export function spawnEnemyWithBundle(world: World): void {
  const config = world.getResource(GameConfig);
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);

  if (!config) return;

  // Random spawn position
  const x = Math.random() * config.canvasWidth;
  const y = Math.random() * 100;

  // 50% chance for wanderer vs chaser
  const isChaser = Math.random() > 0.5;

  const builder = world.spawn();
  let enemyEntity;

  if (isChaser) {
    const bundle = new ChasingEnemyBundle(x, y, config.canvasWidth / 2, config.canvasHeight / 2);
    for (const component of bundle.components()) {
      builder.insert(component);
    }
  } else {
    const bundle = new WanderingEnemyBundle(x, y);
    for (const component of bundle.components()) {
      builder.insert(component);
    }
  }

  enemyEntity = builder.id();

  // Trigger observer
  if (registry) {
    triggerSpawnObserver(registry, enemyEntity, Enemy, new Enemy());
  }

  // Send event
  if (events) {
    events.entitySpawned.send(new EntitySpawnedEvent(enemyEntity, 'enemy'));
  }
}

/**
 * Spawn bullet using bundle.
 * DEMONSTRATES: Bundle spawning pattern
 * Fires in the direction the player is facing.
 */
export function shootBulletWithBundle(world: World): void {
  const config = world.getResource(GameConfig);
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);
  const gameState = world.getResource(GameState);

  if (!config || gameState?.isGameOver) return;

  // Get player position, velocity AND rotation
  const playerQuery = world.query(Position, Velocity, Rotation, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) return;

  const [, playerPos, playerVel, playerRot] = playerResult;

  // Calculate direction from rotation angle
  const dirX = Math.cos(playerRot.angle);
  const dirY = Math.sin(playerRot.angle);

  // Spawn bullet slightly in front of player (in facing direction)
  const spawnOffset = 25;
  const bulletX = playerPos.x + dirX * spawnOffset;
  const bulletY = playerPos.y + dirY * spawnOffset;

  // Calculate player's speed in the firing direction (dot product)
  const playerSpeedInFiringDir = playerVel.x * dirX + playerVel.y * dirY;
  
  // Only add player velocity if moving forward (positive dot product)
  // If moving backward, bullet uses just the base bullet speed
  const extraSpeed = Math.max(0, playerSpeedInFiringDir);
  const totalBulletSpeed = config.bulletSpeed + extraSpeed;
  
  const bulletVelX = dirX * totalBulletSpeed;
  const bulletVelY = dirY * totalBulletSpeed;

  // Spawn bullet manually (can't use BulletBundle directly since it only supports Y velocity)
  const builder = world.spawn();
  builder
    .insert(new Position(bulletX, bulletY))
    .insert(new Velocity(bulletVelX, bulletVelY))
    .insert(new Size(16, 16))
    .insert(new Sprite('#ffff00', 'circle'))
    .insert(new Bullet())
    .insert(new Damage(25))
    .insert(new Collider(15, 'bullet'))
    .insert(new Lifetime(2))
    .insert(new Trail('#ffff00', 12));

  const bulletEntity = builder.id();

  // Trigger observer
  if (registry) {
    triggerSpawnObserver(registry, bulletEntity, Bullet, new Bullet());
  }

  // Send events
  if (events) {
    events.playerShoot.send(new PlayerShootEvent({ x: playerPos.x, y: playerPos.y }));
    events.entitySpawned.send(new EntitySpawnedEvent(bulletEntity, 'bullet'));
  }
}

/**
 * Spawn power-up using bundle.
 * DEMONSTRATES: Bundle spawning pattern
 */
export function spawnPowerUpWithBundle(world: World): void {
  const config = world.getResource(GameConfig);
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);

  if (!config) return;

  const x = Math.random() * (config.canvasWidth - 40) + 20;
  const y = Math.random() * (config.canvasHeight - 40) + 20;

  const bundle = new PowerUpBundle(x, y, 30);

  const builder = world.spawn();
  for (const component of bundle.components()) {
    builder.insert(component);
  }
  const powerUpEntity = builder.id();

  // Trigger observer
  if (registry) {
    triggerSpawnObserver(registry, powerUpEntity, PowerUp, new PowerUp());
  }

  // Send event
  if (events) {
    events.entitySpawned.send(new EntitySpawnedEvent(powerUpEntity, 'powerup'));
  }
}
