/**
 * @module game/logic
 * @description Game logic modules - orchestration and game-specific systems.
 * 
 * This module contains higher-level game logic that ties together
 * the ECS components, systems, and resources.
 * 
 * Modules:
 * - startup: Game initialization systems
 * - event_processing: Event handling systems
 * - change_detection: Component change detection
 * - collision_events: Enhanced collision with events
 * - bundle_spawning: Bundle-based entity creation
 * - boss: Boss entity management
 * - ui_handlers: UI button handlers
 */

// Startup systems
export {
  setupObserversSystem,
  spawnPlayerSystem,
} from './startup';

// Event processing
export {
  processEventsSystem,
  processEventsSystemDescriptor,
  updateEventsSystem,
  updateEventsSystemDescriptor,
} from './event_processing';

// Change detection
export {
  detectNewEnemiesSystem,
  detectHealthChangesSystem,
  detectHealthChangesSystemDescriptor,
  queryWithFiltersSystem,
} from './change_detection';

// Collision with events
export {
  collisionWithEventsSystem,
  collisionWithEventsSystemDescriptor,
} from './collision_events';

// Bundle-based spawning
export {
  spawnEnemyWithBundle,
  shootBulletWithBundle,
  spawnPowerUpWithBundle,
} from './bundle_spawning';

// Boss management
export {
  bossExists,
  spawnBossWithBundle,
  bossSpawnSystem,
  bossSpawnSystemDescriptor,
} from './boss';

// UI handlers
export { setupButtonHandlers } from './ui_handlers';
