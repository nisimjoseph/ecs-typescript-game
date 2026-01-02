/**
 * @module game/components/ai
 * @description AI components - behavior controllers for entities.
 * 
 * These components define how entities move and behave autonomously.
 * 
 * Interacts with:
 * - AI systems: Update entity movement based on AI behavior
 */

/**
 * FollowTarget component - entity follows a target position.
 */
export class FollowTarget {
  constructor(
    public targetX: number = 0,
    public targetY: number = 0,
    public speed: number = 50
  ) {}
}

/**
 * Wander component - entity wanders randomly.
 */
export class Wander {
  public direction: number = Math.random() * Math.PI * 2;
  public changeTimer: number = 0;

  constructor(
    public speed: number = 30,
    public changeInterval: number = 2
  ) {}
}
