/**
 * @module game/logic/boss
 * @description Boss-related logic and spawning.
 * 
 * Handles boss entity spawning with unique constraint (only one at a time).
 * 
 * Interacts with:
 * - BossBundle: Creates boss entity
 * - BossSpawnTimer: Controls spawn timing
 * - Observer system: Triggers spawn observers
 */

import { World, ObserverRegistry, Time, system, Stage } from '../../ecs';
import { Position, Boss, Enemy } from '../components';
import { GameConfig, GameState, BossSpawnTimer } from '../resources';
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
 * DEMONSTRATES: Bundle spawning + unique entity constraint
 * Only spawns if no boss currently exists.
 */
export function spawnBossWithBundle(world: World): void {
  const config = world.getResource(GameConfig);
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);
  const gameState = world.getResource(GameState);

  if (!config || gameState?.isGameOver) return;

  // Check if boss already exists - only ONE boss at a time!
  if (bossExists(world)) return;

  // Spawn boss in top center
  const x = config.canvasWidth / 2;
  const y = 80;

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
