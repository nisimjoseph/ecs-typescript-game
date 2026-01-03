/**
 * @module game/systems/world
 * @description World management systems for the infinite scrolling world.
 * 
 * Handles:
 * - Entity culling: Remove entities outside world bounds
 * - Boss territories: Boss activation based on player proximity
 * 
 * Interacts with:
 * - Camera resource: Player/viewport position
 * - WorldBounds resource: World boundary definitions
 * - BossTerritory: Boss area definitions
 */

import { World, system, Stage } from '../../ecs';
import { Position, Enemy, Boss, Player, Bullet, PowerUp } from '../components';
import { Camera, WorldBounds, BossTerritory } from '../resources';

/**
 * Cull entities that are outside the world bounds.
 * Removes enemies, bullets, and power-ups that have drifted outside
 * the active world area for performance optimization.
 * 
 * Player is never culled.
 */
export function entityCullingSystem(world: World): void {
  const camera = world.getResource(Camera);
  const worldBounds = world.getResource(WorldBounds);
  if (!camera || !worldBounds) return;

  const commands = world.getCommands();
  const bounds = worldBounds.getWorldBounds(camera);

  // Cull enemies outside world bounds
  const enemyQuery = world.query(Position, Enemy);
  for (const [entity, pos] of enemyQuery.iter()) {
    const isOutside = pos.x < bounds.minX || pos.x > bounds.maxX ||
                      pos.y < bounds.minY || pos.y > bounds.maxY;
    if (isOutside) {
      commands.despawn(entity);
    }
  }

  // Cull bullets outside world bounds (with larger margin for fast bullets)
  const bulletMargin = 100;
  const bulletQuery = world.query(Position, Bullet);
  for (const [entity, pos] of bulletQuery.iter()) {
    const isOutside = pos.x < bounds.minX - bulletMargin || pos.x > bounds.maxX + bulletMargin ||
                      pos.y < bounds.minY - bulletMargin || pos.y > bounds.maxY + bulletMargin;
    if (isOutside) {
      commands.despawn(entity);
    }
  }

  // Cull power-ups outside world bounds
  const powerUpQuery = world.query(Position, PowerUp);
  for (const [entity, pos] of powerUpQuery.iter()) {
    const isOutside = pos.x < bounds.minX || pos.x > bounds.maxX ||
                      pos.y < bounds.minY || pos.y > bounds.maxY;
    if (isOutside) {
      commands.despawn(entity);
    }
  }
}

/**
 * BossTerritoryComponent - component attached to boss entities
 * to define their home territory.
 */
export class BossTerritoryComponent {
  constructor(
    public territory: BossTerritory,
    /** Is the boss currently active (pursuing player)? */
    public isActive: boolean = false
  ) {}
}

/**
 * Boss territory system - activates bosses when player enters their territory
 * or when player's viewport is within detection margin.
 */
export function bossActivationSystem(world: World): void {
  const camera = world.getResource(Camera);
  const worldBounds = world.getResource(WorldBounds);
  if (!camera || !worldBounds) return;

  // Get player position
  const playerQuery = world.query(Position, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) return;
  const [, playerPos] = playerResult;

  // Check boss entities with territories
  const bossQuery = world.query(Position, Boss, BossTerritoryComponent);
  
  for (const [, bossPos, , territory] of bossQuery.iter()) {
    // Check if player is in boss territory
    const playerInTerritory = territory.territory.contains(playerPos.x, playerPos.y);
    
    // Check if viewport intersects with territory (100px margin detection)
    const viewportIntersects = territory.territory.intersectsViewport(camera, worldBounds.bossDetectionMargin);
    
    const shouldActivate = playerInTerritory || viewportIntersects;
    territory.isActive = shouldActivate;
  }
}

// System descriptors
export const entityCullingSystemDescriptor = system(entityCullingSystem)
  .label('entity_culling')
  .inStage(Stage.PostUpdate);

export const bossActivationSystemDescriptor = system(bossActivationSystem)
  .label('boss_activation')
  .inStage(Stage.Update);
