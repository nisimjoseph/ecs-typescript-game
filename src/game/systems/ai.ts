/**
 * @module game/systems/ai
 * @description AI systems - autonomous entity behavior.
 * 
 * These systems control how enemies move and behave.
 * 
 * Interacts with:
 * - Wander component: Random movement
 * - FollowTarget component: Chase player
 */

import { World, Time } from '../../ecs';
import { Position, Velocity, Wander, FollowTarget, Player } from '../components';
import { GameConfig } from '../resources';

/**
 * Wander AI - entities move randomly.
 */
export function wanderSystem(world: World): void {
  const time = world.getResource(Time);
  const config = world.getResource(GameConfig);
  const hasNoResources = !time || !config;
  if (hasNoResources) return;

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

    // Keep in bounds with wrapping
    const margin = 20;
    if (pos.x < -margin) pos.x = config.canvasWidth + margin;
    if (pos.x > config.canvasWidth + margin) pos.x = -margin;
    if (pos.y < -margin) pos.y = config.canvasHeight + margin;
    if (pos.y > config.canvasHeight + margin) pos.y = -margin;
  }
}

/**
 * Follow target AI - entities move toward a target.
 */
export function followTargetSystem(world: World): void {
  const time = world.getResource(Time);
  if (!time) return;

  // Update targets to player position
  const playerQuery = world.query(Position, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) return;
  const [, playerPos] = playerResult;

  const query = world.query(Position, Velocity, FollowTarget);

  for (const [, pos, vel, follow] of query.iter()) {
    // Update target to player position
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
