/**
 * @module main
 * @description Entry point for the ECS game demo - FULL FEATURE DEMONSTRATION.
 * 
 * This file wires together all game modules and starts the game loop.
 * 
 * FEATURES DEMONSTRATED:
 * - BUNDLES: Grouped component spawning
 * - EVENTS: Decoupled communication
 * - OBSERVERS: Reactive component hooks
 * - CHANGE DETECTION: Track component changes
 * - QUERY FILTERS: With/Without filters
 * 
 * Interacts with:
 * - All ECS modules for core functionality
 * - game/logic modules for game-specific systems
 * - game/systems for reusable systems
 */

import { App, ObserverRegistry } from './ecs';
import {
  GameConfig,
  GameState,
  CanvasContext,
  Logger,
  SpawnTimer,
  ShootCooldown,
  BossSpawnTimer,
  Input,
} from './game/resources';
import { GameEvents } from './game/events';

// Import system descriptors from game/systems
import {
  inputClearSystemDescriptor,
  playerInputSystemDescriptor,
  playerShootSystemDescriptor,
  shieldSystemDescriptor,
  turboSystemDescriptor,
  bombSystemDescriptor,
  wanderSystemDescriptor,
  followTargetSystemDescriptor,
  movementSystemDescriptor,
  bounceSystemDescriptor,
  trailSystemDescriptor,
  lifetimeSystemDescriptor,
  explosionSystemDescriptor,
  enemySpawnSystemDescriptor,
  powerUpAutoSpawnSystemDescriptor,
  renderSystemDescriptor,
  uiUpdateSystemDescriptor,
} from './game/systems';

// Import logic modules
import {
  setupObserversSystem,
  spawnPlayerSystem,
  processEventsSystemDescriptor,
  updateEventsSystemDescriptor,
  detectHealthChangesSystemDescriptor,
  collisionWithEventsSystemDescriptor,
  bossSpawnSystemDescriptor,
  setupButtonHandlers,
} from './game/logic';

// ============ MAIN INITIALIZATION ============

/**
 * Initialize and run the game with ALL ECS features.
 */
function main(): void {
  console.log('🚀 Starting ECS Game Demo - FULL FEATURE DEMONSTRATION');
  console.log('Features: Bundles, Events, Observers, Hierarchy, Change Detection, Query Filters');

  // Get canvas element
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  // Set canvas size
  canvas.width = 800;
  canvas.height = 500;

  // Create the App with ALL features
  const app = new App()
    // ============ RESOURCES ============
    .insertResource(new GameConfig(canvas.width, canvas.height))
    .insertResource(new GameState())
    .insertResource(new Input())
    .insertResource(new CanvasContext(canvas))
    .insertResource(new Logger())
    .insertResource(new SpawnTimer(2))
    .insertResource(new ShootCooldown(0.15))
    .insertResource(new BossSpawnTimer(15)) // Boss spawns every 15 seconds
    // Event system resource
    .insertResource(new GameEvents())
    // Observer registry resource
    .insertResource(new ObserverRegistry())

    // ============ STARTUP SYSTEMS ============
    .addStartupSystem(setupObserversSystem) // Setup observers first
    .addStartupSystem(spawnPlayerSystem)    // Then spawn player

    // ============ FRAME SYSTEMS ============

    // Stage.PreUpdate: Input processing
    .addSystem(playerInputSystemDescriptor)
    .addSystem(playerShootSystemDescriptor)
    .addSystem(shieldSystemDescriptor)
    .addSystem(turboSystemDescriptor)
    .addSystem(bombSystemDescriptor)

    // Stage.Update: Game logic
    .addSystem(difficultyProgressionSystemDescriptor) // Increase difficulty every 30s
    .addSystem(wanderSystemDescriptor)
    .addSystem(followTargetSystemDescriptor)
    .addSystem(movementSystemDescriptor)
    .addSystem(bounceSystemDescriptor)
    .addSystem(trailSystemDescriptor)

    // Stage.PostUpdate: Reactions and cleanup
    .addSystem(lifetimeSystemDescriptor)
    .addSystem(explosionSystemDescriptor)
    // Use enhanced collision system with events
    .addSystem(collisionWithEventsSystemDescriptor)
    .addSystem(processEventsSystemDescriptor) // Process events
    .addSystem(detectHealthChangesSystemDescriptor)
    .addSystem(enemySpawnSystemDescriptor)
    .addSystem(powerUpAutoSpawnSystemDescriptor) // Auto-spawn power-ups when player needs healing
    .addSystem(bossSpawnSystemDescriptor) // Boss spawns periodically

    // Stage.Last: Rendering and cleanup
    .addSystem(renderSystemDescriptor)
    .addSystem(uiUpdateSystemDescriptor)
    .addSystem(updateEventsSystemDescriptor) // Update event buffers
    .addSystem(inputClearSystemDescriptor); // Clear justPressed at end of frame

  // Set up button handlers with bundle-based spawning
  setupButtonHandlers(app, canvas);

  // Run the game!
  app.run();

  console.log('✅ Game running with ALL ECS features!');
  console.log('');
  console.log('📦 BUNDLES: Player, Enemy, Bullet, PowerUp spawned with bundles');
  console.log('📡 EVENTS: CollisionEvent, DamageEvent, ScoreEvent, etc.');
  console.log('👁️ OBSERVERS: OnAdd, OnRemove, OnChange for entity lifecycle');
  console.log('🔍 QUERY FILTERS: With/Without filters demonstrated');
  console.log('⏱️ CHANGE DETECTION: Health changes tracked');
  console.log('');
  console.log('Controls: WASD to move, SPACE to shoot');
}

// Import difficulty system descriptor
import { difficultyProgressionSystemDescriptor } from './game/systems';

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
