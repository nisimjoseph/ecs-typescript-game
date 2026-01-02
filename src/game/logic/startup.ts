/**
 * @module game/logic/startup
 * @description Startup systems - initialize game on first frame.
 * 
 * These systems run once when the game starts to set up initial state.
 * 
 * Interacts with:
 * - ObserverRegistry: Sets up entity lifecycle observers
 * - PlayerBundle: Spawns player entity
 * - GameEvents: Sends game start event
 */

import { World, ObserverRegistry } from '../../ecs';
import { Player } from '../components';
import { GameConfig, Logger, GameState } from '../resources';
import { PlayerBundle } from '../bundles';
import { GameEvents, GameStartEvent, EntitySpawnedEvent } from '../events';
import { setupObservers, triggerSpawnObserver } from '../observers';

/**
 * Startup system: Initialize observers.
 * DEMONSTRATES: Observer system setup
 */
export function setupObserversSystem(world: World): void {
  const logger = world.getResource(Logger);
  const gameState = world.getResource(GameState);
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);

  if (registry) {
    setupObservers(registry, logger, gameState, events);
    if (logger) {
      logger.system('📡 Observers registered');
    }
  }
}

/**
 * Startup system: Spawn player using Bundle.
 * DEMONSTRATES: Bundle-based entity spawning
 */
export function spawnPlayerSystem(world: World): void {
  const config = world.getResource(GameConfig);
  const logger = world.getResource(Logger);
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);

  if (!config) {
    console.error('GameConfig not found!');
    return;
  }

  // Use BUNDLE to spawn player with all components
  const playerBundle = new PlayerBundle(
    config.canvasWidth / 2,
    config.canvasHeight / 2,
    100
  );

  // Spawn using bundle helper
  const builder = world.spawn();
  for (const component of playerBundle.components()) {
    builder.insert(component);
  }
  const playerEntity = builder.id();

  // Trigger observer for Player component
  if (registry) {
    triggerSpawnObserver(registry, playerEntity, Player, new Player());
  }

  // Send game start event
  if (events) {
    events.gameStart.send(new GameStartEvent(false));
    events.entitySpawned.send(new EntitySpawnedEvent(playerEntity, 'player'));
  }

  if (logger) {
    logger.system('🎮 Game started with BUNDLE spawning!');
    logger.system('📦 PlayerBundle used for player entity');
  }
}
