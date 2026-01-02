/**
 * @module game/logic/change_detection
 * @description Change detection systems - track component changes.
 * 
 * These systems demonstrate the Added<> and Changed<> filter concepts.
 * 
 * Interacts with:
 * - Query system: Queries for components
 * - Observer system: Triggers change observers
 */

import { World, ObserverRegistry, system, Stage } from '../../ecs';
import { Position, Health, Enemy, Wander, Trail } from '../components';
import { Logger } from '../resources';
import { GameEvents } from '../events';
import { triggerChangeObserver } from '../observers';

/**
 * System: Detect newly added enemies (demonstrates Added<> filter).
 * DEMONSTRATES: Change detection - Added filter
 */
export function detectNewEnemiesSystem(world: World): void {
  const logger = world.getResource(Logger);
  const registry = world.getResource(ObserverRegistry);

  // Query for enemies
  const query = world.query(Position, Enemy);

  // In a full implementation, we'd use .added() filter
  // For demo, we're using the observer system to track additions
}

/**
 * System: Detect health changes (demonstrates Changed<> concept).
 * DEMONSTRATES: Change detection - monitoring component changes
 */
export function detectHealthChangesSystem(world: World): void {
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);

  // Query for entities with Health
  const query = world.query(Position, Health);

  for (const [entity, pos, health] of query.iter()) {
    // In a full implementation, we'd check if health.isChanged()
    // For demo, the observer system tracks health changes
    if (health.isDead() && registry) {
      // Trigger change observer
      triggerChangeObserver(registry, entity, Health, health);
    }
  }
}

export const detectHealthChangesSystemDescriptor = system(detectHealthChangesSystem)
  .label('detect_health_changes')
  .inStage(Stage.PostUpdate);

/**
 * System: Query with With/Without filters.
 * DEMONSTRATES: Advanced query filtering
 */
export function queryWithFiltersSystem(world: World): void {
  // Query enemies WITH Trail component
  const trailedEnemies = world.query(Position, Enemy).with(Trail);
  
  // Query enemies WITHOUT Wander component (chasers)
  const chasingEnemies = world.query(Position, Enemy).without(Wander);

  // These demonstrate filter capabilities
  // In practice, use for more targeted logic
}
