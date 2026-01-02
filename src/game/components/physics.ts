/**
 * @module game/components/physics
 * @description Physics components - collision and bouncing.
 * 
 * These components handle physical interactions between entities.
 * 
 * Interacts with:
 * - Collision systems: Detect collisions using Collider
 * - Bounce systems: Handle wall bouncing with Bouncy
 */

/**
 * Collider component - entity can collide with others.
 */
export class Collider {
  constructor(
    public radius: number = 10,
    public layer: string = 'default'
  ) {}
}

/**
 * Bouncy component - entity bounces off walls.
 */
export class Bouncy {
  constructor(
    public bounciness: number = 1.0
  ) {}
}
