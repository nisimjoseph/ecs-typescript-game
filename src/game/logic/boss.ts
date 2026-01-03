/**
 * @module game/logic/boss
 * @description Boss-related logic and spawning.
 * 
 * Handles boss entity spawning with unique constraint (only one at a time).
 * Bosses spawn near the player in the infinite world.
 * 
 * Interacts with:
 * - BossBundle: Creates boss entity
 * - BossSpawnTimer: Controls spawn timing
 * - Camera: Gets player position for spawn location
 * - Observer system: Triggers spawn observers
 */

import { World, ObserverRegistry, Time, system, Stage } from '../../ecs';
import { Position, Boss, Enemy, Player } from '../components';
import { GameConfig, GameState, BossSpawnTimer, Camera } from '../resources';
import { BossBundle } from '../bundles';
import {
  GameEvents,
  EntitySpawnedEvent,
  BossSpawnedEvent,
} from '../events';
import { triggerSpawnObserver } from '../observers';

/**
 * Check if a boss exists in the world.
 * DEMONSTRATES: Query filters - checking for unique entity
 */
export function bossExists(world: World): boolean {
  const bossQuery = world.query(Position, Boss);
  return bossQuery.count() > 0;
}

/**
 * Spawn boss using bundle.
 * Boss spawns at a random edge of the viewport in the infinite world.
 * Only spawns if no boss currently exists.
 */
export function spawnBossWithBundle(world: World): void {
  const config = world.getResource(GameConfig);
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);
  const gameState = world.getResource(GameState);
  const camera = world.getResource(Camera);

  if (!config || gameState?.isGameOver) return;

  // Check if boss already exists - only ONE boss at a time!
  if (bossExists(world)) return;

  // Get player position (camera follows player)
  let playerX = config.canvasWidth / 2;
  let playerY = config.canvasHeight / 2;
  
  if (camera) {
    playerX = camera.worldX;
    playerY = camera.worldY;
  }

  // Spawn boss at random position around player (300-400px away)
  const spawnDistance = 300 + Math.random() * 100;
  const spawnAngle = Math.random() * Math.PI * 2;
  const x = playerX + Math.cos(spawnAngle) * spawnDistance;
  const y = playerY + Math.sin(spawnAngle) * spawnDistance;

  const bundle = new BossBundle(x, y);

  const builder = world.spawn();
  for (const component of bundle.components()) {
    builder.insert(component);
  }
  const bossEntity = builder.id();

  // Trigger observers for both Enemy and Boss
  if (registry) {
    triggerSpawnObserver(registry, bossEntity, Enemy, new Enemy());
    triggerSpawnObserver(registry, bossEntity, Boss, new Boss());
  }

  // Send events
  if (events) {
    events.entitySpawned.send(new EntitySpawnedEvent(bossEntity, 'enemy'));
    events.bossSpawned.send(new BossSpawnedEvent(bossEntity, 300));
  }
}

/**
 * System: Spawn boss periodically if none exists.
 * DEMONSTRATES: Timed spawning + unique entity constraint
 */
export function bossSpawnSystem(world: World): void {
  const bossTimer = world.getResource(BossSpawnTimer);
  const time = world.getResource(Time);
  const gameState = world.getResource(GameState);

  if (!bossTimer || !time || gameState?.isGameOver) return;

  // Only spawn if timer triggers AND no boss exists
  if (bossTimer.tick(time.delta) && !bossExists(world)) {
    spawnBossWithBundle(world);
    world.applyCommands();
  }
}

export const bossSpawnSystemDescriptor = system(bossSpawnSystem)
  .label('boss_spawn')
  .inStage(Stage.PostUpdate);
