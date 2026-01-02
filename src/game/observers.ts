/**
 * @module game/observers
 * @description Game-specific observers for reactive component handling.
 * 
 * Observers react to component lifecycle events:
 * - OnAdd: When a component is added to an entity
 * - OnChange: When a component is modified
 * - OnRemove: When a component is removed
 * 
 * DEMONSTRATES: Observer system from Bevy ECS
 * 
 * Examples:
 * - Log when entities are spawned
 * - Play sounds when damage is dealt
 * - Update UI when score changes
 * 
 * Interacts with:
 * - ObserverRegistry: Manages all observers
 * - Entity: Observers receive entity that changed
 * - Component: Observers receive changed component
 */

import {
  Entity,
  ObserverRegistry,
  ObserverTrigger,
  onAdd,
  onChange,
  onRemove,
} from '../ecs';
import {
  Player,
  Enemy,
  Bullet,
  PowerUp,
  Boss,
  Health,
  Explosion,
  Position,
} from './components';
import { GameEvents, EntitySpawnedEvent, EntityKilledEvent, BossSpawnedEvent, BossKilledEvent } from './events';
import { Logger, GameState } from './resources';

/**
 * Setup all game observers.
 * Call this once during game initialization.
 */
export function setupObservers(
  registry: ObserverRegistry,
  logger: Logger | undefined,
  gameState: GameState | undefined,
  events: GameEvents | undefined
): void {
  // ============ Entity Spawn Observers ============

  /**
   * When Player component is added - log it.
   */
  registry.register(
    onAdd(Player)
      .label('log_player_spawn')
      .priority(100)
      .run((entity) => {
        if (logger) {
          logger.entity(`🎮 Player spawned (ID: ${entity.id})`);
        }
        if (events) {
          events.entitySpawned.send(new EntitySpawnedEvent(entity, 'player'));
        }
      })
      .build()
  );

  /**
   * When Enemy component is added - log it.
   */
  registry.register(
    onAdd(Enemy)
      .label('log_enemy_spawn')
      .priority(100)
      .run((entity) => {
        if (logger) {
          logger.entity(`👾 Enemy spawned (ID: ${entity.id})`);
        }
        if (events) {
          events.entitySpawned.send(new EntitySpawnedEvent(entity, 'enemy'));
        }
      })
      .build()
  );

  /**
   * When Bullet component is added - log it.
   */
  registry.register(
    onAdd(Bullet)
      .label('log_bullet_spawn')
      .priority(100)
      .run((entity) => {
        if (logger) {
          logger.entity(`💥 Bullet fired (ID: ${entity.id})`);
        }
        if (events) {
          events.entitySpawned.send(new EntitySpawnedEvent(entity, 'bullet'));
        }
      })
      .build()
  );

  /**
   * When PowerUp component is added - log it.
   */
  registry.register(
    onAdd(PowerUp)
      .label('log_powerup_spawn')
      .priority(100)
      .run((entity) => {
        if (logger) {
          logger.entity(`⭐ Power-up spawned (ID: ${entity.id})`);
        }
        if (events) {
          events.entitySpawned.send(new EntitySpawnedEvent(entity, 'powerup'));
        }
      })
      .build()
  );

  /**
   * When Boss component is added - log it with WARNING.
   * DEMONSTRATES: Observer for unique entity type
   */
  registry.register(
    onAdd(Boss)
      .label('log_boss_spawn')
      .priority(100)
      .run((entity) => {
        if (logger) {
          logger.system(`👹 BOSS SPAWNED! (ID: ${entity.id})`);
          logger.system(`⚠️ WARNING: Boss has 300 HP and deals 50 damage!`);
        }
        if (events) {
          events.bossSpawned.send(new BossSpawnedEvent(entity, 300));
        }
      })
      .build()
  );

  /**
   * When Explosion component is added - log it.
   */
  registry.register(
    onAdd(Explosion)
      .label('log_explosion_spawn')
      .priority(100)
      .run((entity) => {
        if (logger) {
          logger.entity(`💫 Explosion created (ID: ${entity.id})`);
        }
        if (events) {
          events.entitySpawned.send(new EntitySpawnedEvent(entity, 'explosion'));
        }
      })
      .build()
  );

  // ============ Health Change Observers ============

  /**
   * When Health component changes - check for death.
   */
  registry.register(
    onChange(Health)
      .label('check_health_death')
      .priority(50)
      .run((entity, health) => {
        if (health && health.isDead()) {
          if (logger) {
            logger.component(`☠️ Entity ${entity.id} health reached 0`);
          }
        }
      })
      .build()
  );

  // ============ Entity Remove Observers ============

  /**
   * When Player is removed - game over check.
   */
  registry.register(
    onRemove(Player)
      .label('player_removed')
      .priority(100)
      .run((entity) => {
        if (logger) {
          logger.entity(`💀 Player destroyed (ID: ${entity.id})`);
        }
        if (gameState) {
          gameState.isGameOver = true;
        }
      })
      .build()
  );

  /**
   * When Enemy is removed - increment kill count.
   */
  registry.register(
    onRemove(Enemy)
      .label('enemy_removed')
      .priority(100)
      .run((entity) => {
        if (logger) {
          logger.entity(`🎯 Enemy destroyed (ID: ${entity.id})`);
        }
        if (gameState) {
          gameState.enemiesKilled++;
        }
      })
      .build()
  );

  /**
   * When PowerUp is removed (collected) - increment count.
   */
  registry.register(
    onRemove(PowerUp)
      .label('powerup_removed')
      .priority(100)
      .run((entity) => {
        if (logger) {
          logger.entity(`✨ Power-up collected (ID: ${entity.id})`);
        }
        if (gameState) {
          gameState.powerUpsCollected++;
        }
      })
      .build()
  );

  /**
   * When Boss is removed (killed) - big reward!
   * DEMONSTRATES: Observer for unique entity removal
   */
  registry.register(
    onRemove(Boss)
      .label('boss_removed')
      .priority(100)
      .run((entity) => {
        if (logger) {
          logger.system(`🏆 BOSS DEFEATED! (ID: ${entity.id})`);
          logger.system(`💰 +500 BONUS POINTS!`);
        }
        if (gameState) {
          gameState.addScore(500); // Big bonus for boss kill
        }
      })
      .build()
  );

  // ============ Position Change Observers ============

  /**
   * When Position changes - could trigger spatial updates.
   * (In a real game, this might update spatial hash, etc.)
   */
  registry.register(
    onChange(Position)
      .label('position_changed')
      .priority(10)
      .run((_entity, _position) => {
        // In a real game, you might update spatial partitioning here
        // For demo, we just track that positions are being updated
      })
      .build()
  );
}

/**
 * Manually trigger observer for entity spawn.
 * Call this when spawning entities to notify observers.
 */
export function triggerSpawnObserver(
  registry: ObserverRegistry,
  entity: Entity,
  componentClass: new (...args: unknown[]) => unknown,
  component?: unknown
): void {
  registry.trigger(ObserverTrigger.OnAdd, entity, componentClass, component);
}

/**
 * Manually trigger observer for entity despawn.
 * Call this when despawning entities to notify observers.
 */
export function triggerDespawnObserver(
  registry: ObserverRegistry,
  entity: Entity,
  componentClass: new (...args: unknown[]) => unknown
): void {
  registry.trigger(ObserverTrigger.OnRemove, entity, componentClass, undefined);
}

/**
 * Manually trigger observer for component change.
 */
export function triggerChangeObserver<T>(
  registry: ObserverRegistry,
  entity: Entity,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  componentClass: new (...args: any[]) => T,
  component: T
): void {
  registry.trigger(ObserverTrigger.OnChange, entity, componentClass, component);
}
