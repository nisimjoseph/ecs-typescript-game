/**
 * @module game/systems/movement
 * @description Movement systems - update positions and handle physics.
 * 
 * These systems apply velocity to position and handle wall bouncing.
 * 
 * Interacts with:
 * - Position, Velocity components: Update entity positions
 * - Trail component: Track movement history
 * - Bouncy component: Handle wall collisions
 */

import { World, Time } from '../../ecs';
import { Position, Velocity, Size, Trail, Bouncy } from '../components';
import { GameConfig } from '../resources';

/**
 * Apply velocity to position.
 */
export function movementSystem(world: World): void {
  const time = world.getResource(Time);
  if (!time) return;

  const query = world.query(Position, Velocity);

  for (const [, pos, vel] of query.iter()) {
    pos.x += vel.x * time.delta;
    pos.y += vel.y * time.delta;
  }
}

/**
 * Update trail positions for entities with Trail component.
 */
export function trailSystem(world: World): void {
  const query = world.query(Position, Trail);

  for (const [, pos, trail] of query.iter()) {
    trail.addPoint(pos.x, pos.y);
  }
}

/**
 * Handle bouncy entities that bounce off walls.
 */
export function bounceSystem(world: World): void {
  const config = world.getResource(GameConfig);
  if (!config) return;

  const query = world.query(Position, Velocity, Size, Bouncy);

  for (const [, pos, vel, size] of query.iter()) {
    const halfWidth = size.width / 2;
    const halfHeight = size.height / 2;

    // Bounce off left/right walls
    const hitLeftWall = pos.x - halfWidth < 0;
    const hitRightWall = pos.x + halfWidth > config.canvasWidth;
    if (hitLeftWall || hitRightWall) {
      vel.x *= -1;
      pos.x = hitLeftWall ? halfWidth : config.canvasWidth - halfWidth;
    }

    // Bounce off top/bottom walls
    const hitTopWall = pos.y - halfHeight < 0;
    const hitBottomWall = pos.y + halfHeight > config.canvasHeight;
    if (hitTopWall || hitBottomWall) {
      vel.y *= -1;
      pos.y = hitTopWall ? halfHeight : config.canvasHeight - halfHeight;
    }
  }
}
