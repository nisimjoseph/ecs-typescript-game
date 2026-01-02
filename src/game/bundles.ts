/**
 * @module game/bundles
 * @description Game-specific bundles for spawning common entity types.
 * 
 * Bundles group related components for efficient entity spawning.
 * Instead of manually adding each component, use a bundle to spawn
 * with all required components in one call.
 * 
 * DEMONSTRATES: Bundle system from Bevy ECS
 * 
 * Interacts with:
 * - Commands: spawn_bundle for deferred spawning
 * - World: insert_bundle for immediate spawning
 * - Components: Groups components together
 */

import { Bundle } from '../ecs';
import {
  Position,
  Velocity,
  Size,
  Rotation,
  Health,
  Sprite,
  Collider,
  Player,
  Enemy,
  Bullet,
  PowerUp,
  Boss,
  Damage,
  Lifetime,
  Trail,
  Wander,
  FollowTarget,
  Bouncy,
} from './components';

/**
 * Player bundle - all components needed for the player entity.
 * Player starts facing UP (angle = -PI/2).
 * Uses spaceship sprite for clear direction indication.
 */
export class PlayerBundle implements Bundle {
  constructor(
    public x: number = 400,
    public y: number = 300,
    public health: number = 100
  ) {}

  components(): object[] {
    return [
      new Position(this.x, this.y),
      new Velocity(0, 0),
      new Size(40, 45), // Larger for better visibility
      new Rotation(-Math.PI / 2), // Facing UP initially
      new Sprite('#ff3333', 'spaceship'), // Red spaceship with clear direction
      new Player(),
      new Health(this.health, this.health),
      new Collider(18, 'player'),
    ];
  }
}

/**
 * Enemy bundle - base enemy with all required components.
 */
export class EnemyBundle implements Bundle {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public health: number = 50,
    public damage: number = 20
  ) {}

  components(): object[] {
    return [
      new Position(this.x, this.y),
      new Velocity(0, 0),
      new Size(25, 25),
      new Sprite('#ff4466', 'rect'),
      new Enemy(),
      new Health(this.health, this.health),
      new Damage(this.damage),
      new Collider(12, 'enemy'),
      new Bouncy(1.0),
    ];
  }
}

/**
 * Wandering enemy bundle - enemy that wanders randomly.
 */
export class WanderingEnemyBundle implements Bundle {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {}

  components(): object[] {
    const base = new EnemyBundle(this.x, this.y, 50, 20).components();
    return [
      ...base,
      new Wander(40, 2),
      new Trail('#ff4466', 8),
    ];
  }
}

/**
 * Chasing enemy bundle - enemy that follows the player.
 */
export class ChasingEnemyBundle implements Bundle {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public targetX: number = 400,
    public targetY: number = 300
  ) {}

  components(): object[] {
    const base = new EnemyBundle(this.x, this.y, 75, 30).components();
    return [
      ...base,
      new FollowTarget(this.targetX, this.targetY, 60),
      new Trail('#ff6688', 10),
    ];
  }
}

/**
 * Bullet bundle - player projectile.
 */
export class BulletBundle implements Bundle {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public velocityY: number = -300,
    public damage: number = 25
  ) {}

  components(): object[] {
    return [
      new Position(this.x, this.y),
      new Velocity(0, this.velocityY),
      new Size(10, 10),
      new Sprite('#ffdd00', 'circle'),
      new Bullet(),
      new Damage(this.damage),
      new Collider(8, 'bullet'),
      new Lifetime(2),
      new Trail('#ffdd00', 12),
    ];
  }
}

/**
 * Power-up bundle - collectible item.
 */
export class PowerUpBundle implements Bundle {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public healAmount: number = 30
  ) {}

  components(): object[] {
    return [
      new Position(this.x, this.y),
      new Velocity(0, 0),
      new Size(20, 20),
      new Sprite('#00ffff', 'circle'),
      new PowerUp(),
      new Health(this.healAmount, this.healAmount), // Store heal amount in health
      new Collider(15, 'powerup'),
      new Lifetime(10),
      new Bouncy(0.5),
    ];
  }
}

/**
 * Boss bundle - large powerful enemy.
 * Only one boss at a time - spawns periodically.
 * DEMONSTRATES: Bundle system, unique entity constraint
 */
export class BossBundle implements Bundle {
  constructor(
    public x: number = 400,
    public y: number = 100
  ) {}

  components(): object[] {
    return [
      new Position(this.x, this.y),
      new Velocity(0, 0),
      new Size(60, 60),                    // Much larger than regular enemies
      new Sprite('#ff00ff', 'rect'),       // Purple color
      new Enemy(),                         // Also an enemy for collision
      new Boss(),                          // Boss tag for unique handling
      new Health(300, 300),                // High health
      new Damage(50),                      // High damage
      new Collider(30, 'boss'),            // Large collider
      new FollowTarget(400, 300, 40),      // Slower but relentless
      new Trail('#ff00ff', 15),            // Long purple trail
      new Bouncy(1.0),
    ];
  }
}

/**
 * Explosion bundle - visual effect.
 */
export class ExplosionBundle implements Bundle {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public maxRadius: number = 50,
    public color: string = '#ff6600'
  ) {}

  components(): object[] {
    // We import Explosion separately since it's in components
    const { Explosion } = require('./components');
    return [
      new Position(this.x, this.y),
      new Explosion(this.maxRadius, 0.5, this.color),
    ];
  }
}

/**
 * Helper to spawn entity using bundle.
 * Demonstrates bundle API usage.
 */
export function spawnWithBundle(world: { spawn(): { insert(c: object): any } }, bundle: Bundle): void {
  const components = bundle.components();
  const builder = world.spawn();
  
  for (const component of components) {
    builder.insert(component);
  }
}
