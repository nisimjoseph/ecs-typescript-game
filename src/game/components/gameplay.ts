/**
 * @module game/components/gameplay
 * @description Gameplay components - health, damage, lifetime.
 * 
 * These components handle combat and entity lifecycle.
 * 
 * Interacts with:
 * - Collision systems: Apply Damage to Health
 * - Lifetime systems: Despawn entities when Lifetime expires
 */

/**
 * Health component - entity's health points.
 */
export class Health {
  constructor(
    public current: number = 100,
    public max: number = 100
  ) {}

  takeDamage(amount: number): void {
    this.current = Math.max(0, this.current - amount);
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }

  isDead(): boolean {
    return this.current <= 0;
  }
}

/**
 * Damage component - how much damage this entity deals.
 */
export class Damage {
  constructor(
    public amount: number = 10
  ) {}
}

/**
 * Lifetime component - entity despawns after this time.
 */
export class Lifetime {
  constructor(
    public remaining: number = 1.0
  ) {}
}
