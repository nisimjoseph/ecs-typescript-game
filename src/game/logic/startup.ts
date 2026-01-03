/**
 * @module game/logic/startup
 * @description Startup systems - initialize game on first frame.
 * 
 * These systems run once when the game starts to set up initial state.
 * Player spawns at world origin (0, 0) - camera follows player.
 * Initial enemy population is spawned across the world.
 * 
 * Interacts with:
 * - ObserverRegistry: Sets up entity lifecycle observers
 * - PlayerBundle: Spawns player entity
 * - Camera: Initializes camera at player position
 * - GameEvents: Sends game start event
 * - WorldBounds: Determines initial spawn area
 */

import { World, ObserverRegistry } from '../../ecs';
import {
  Player,
  Position,
  Velocity,
  Size,
  Sprite,
  Enemy,
  Health,
  Collider,
  Wander,
  FollowTarget,
} from '../components';
import { GameConfig, Logger, GameState, Camera, WorldBounds } from '../resources';
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
 * Player spawns at world origin (0, 0). Camera follows player.
 * DEMONSTRATES: Bundle-based entity spawning
 */
export function spawnPlayerSystem(world: World): void {
  const config = world.getResource(GameConfig);
  const logger = world.getResource(Logger);
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);
  const camera = world.getResource(Camera);

  if (!config) {
    console.error('GameConfig not found!');
    return;
  }

  // Player spawns at world origin (0, 0)
  // Camera will follow player to keep them centered on screen
  const playerWorldX = 0;
  const playerWorldY = 0;

  // Initialize camera at player position
  if (camera) {
    camera.worldX = playerWorldX;
    camera.worldY = playerWorldY;
  }

  // Use BUNDLE to spawn player with all components
  const playerBundle = new PlayerBundle(
    playerWorldX,
    playerWorldY,
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

/**
 * Startup system: Populate world with initial enemies.
 * Spawns enemies spread across the world bounds.
 */
export function spawnInitialEnemiesSystem(world: World): void {
  const camera = world.getResource(Camera);
  const worldBounds = world.getResource(WorldBounds);
  const gameState = world.getResource(GameState);
  const logger = world.getResource(Logger);

  if (!camera || !worldBounds || !gameState) return;

  const bounds = worldBounds.getWorldBounds(camera);
  const maxEnemies = gameState.getMaxEnemies(bounds.width, bounds.height);
  
  // Spawn 40% of max enemies initially
  const initialCount = Math.floor(maxEnemies * 0.4);
  const commands = world.getCommands();

  // Safe zone around player (don't spawn too close)
  const safeRadius = 150;

  for (let i = 0; i < initialCount; i++) {
    // Random position in world bounds
    let x: number, y: number;
    let attempts = 0;
    
    do {
      x = bounds.minX + Math.random() * bounds.width;
      y = bounds.minY + Math.random() * bounds.height;
      attempts++;
    } while (
      // Avoid spawning too close to player (at origin)
      Math.sqrt(x * x + y * y) < safeRadius && 
      attempts < 10
    );

    // 60% wandering (rect), 40% following (circle)
    const isWanderer = Math.random() < 0.6;

    if (isWanderer) {
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

  if (logger) {
    logger.system(`🎯 Spawned ${initialCount} initial enemies across world`);
  }
}
