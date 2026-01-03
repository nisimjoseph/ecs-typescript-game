/**
 * @module game/systems/ai
 * @description AI systems - autonomous entity behavior.
 * 
 * These systems control how enemies move and behave in the infinite world.
 * - Wander: Enemies move randomly within world bounds
 * - FollowTarget: Round enemies only attack when within proximity of viewport
 * 
 * Interacts with:
 * - Wander component: Random movement
 * - FollowTarget component: Proximity-based chase
 * - Camera resource: Determines attack proximity
 * - WorldBounds resource: Defines attack proximity threshold
 */

import { World, Time } from '../../ecs';
import { Position, Velocity, Wander, FollowTarget, Player, Boss } from '../components';
import { GameConfig, Camera, WorldBounds } from '../resources';

/**
 * Wander AI - entities move randomly in infinite world.
 * Wandering rect enemies move freely - culling handles cleanup.
 */
export function wanderSystem(world: World): void {
  const time = world.getResource(Time);
  if (!time) return;

  const query = world.query(Position, Velocity, Wander);

  for (const [, pos, vel, wander] of query.iter()) {
    // Update change timer
    wander.changeTimer += time.delta;
    const shouldChangeDirection = wander.changeTimer >= wander.changeInterval;
    if (shouldChangeDirection) {
      wander.direction = Math.random() * Math.PI * 2;
      wander.changeTimer = 0;
    }

    // Apply wander velocity
    vel.x = Math.cos(wander.direction) * wander.speed;
    vel.y = Math.sin(wander.direction) * wander.speed;

    // No bounds checking - entities are culled when outside world bounds
  }
}

/**
 * Follow target AI - round enemies move toward player only when in attack proximity.
 * Enemies within 50px of viewport edge will start attacking.
 * Enemies outside this proximity remain stationary.
 * Bosses ALWAYS attack regardless of proximity.
 */
export function followTargetSystem(world: World): void {
  const time = world.getResource(Time);
  const camera = world.getResource(Camera);
  const worldBounds = world.getResource(WorldBounds);
  if (!time) return;

  // Get player position
  const playerQuery = world.query(Position, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) return;
  const [, playerPos] = playerResult;

  const query = world.query(Position, Velocity, FollowTarget);

  for (const [entity, pos, vel, follow] of query.iter()) {
    // Bosses ALWAYS attack - check if this entity is a boss
    const isBoss = world.hasComponent(entity, Boss);
    
    // Check if enemy is within attack proximity of viewport
    const isInAttackRange = isBoss || (camera && worldBounds 
      ? worldBounds.isInAttackProximity(pos.x, pos.y, camera)
      : true); // Default to attacking if no camera system

    if (!isInAttackRange) {
      // Outside attack range - stay stationary
      vel.x = 0;
      vel.y = 0;
      continue;
    }

    // In attack range - pursue player
    follow.targetX = playerPos.x;
    follow.targetY = playerPos.y;

    // Calculate direction to target
    const dx = follow.targetX - pos.x;
    const dy = follow.targetY - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const isCloseEnough = distance < 5;
    if (isCloseEnough) {
      vel.x = 0;
      vel.y = 0;
    } else {
      vel.x = (dx / distance) * follow.speed;
      vel.y = (dy / distance) * follow.speed;
    }
  }
}
