/**
 * @module game/components/transform
 * @description Transform components - position, velocity, size, rotation.
 * 
 * These components define an entity's spatial properties in 2D space.
 * 
 * Interacts with:
 * - Movement systems: Use Velocity to update Position
 * - Render systems: Use Position, Size, Rotation to draw entities
 */

/**
 * Position component - entity's location in 2D space.
 */
export class Position {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {}
}

/**
 * Velocity component - entity's movement per second.
 */
export class Velocity {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {}
}

/**
 * Size component - entity's dimensions.
 */
export class Size {
  constructor(
    public width: number = 10,
    public height: number = 10
  ) {}
}

/**
 * Rotation component - entity's rotation in radians.
 */
export class Rotation {
  constructor(
    public angle: number = 0
  ) {}
}
