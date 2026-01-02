/**
 * @module game/components
 * @description Game-specific components for the ECS demo.
 * 
 * Components are pure data containers following Bevy's approach.
 * Each component represents a single aspect of an entity:
 * - Position: Where is it?
 * - Velocity: How is it moving?
 * - Health: How much damage can it take?
 * - etc.
 * 
 * Components should:
 * - Be plain data (no methods/logic)
 * - Be small and focused
 * - Be composable (combine to create behaviors)
 */

// ============ Transform Components ============

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

// ============ Gameplay Components ============

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

// ============ Tag Components ============
// Tag components have no data - they mark entities

/**
 * Player tag - marks the player entity.
 */
export class Player {}

/**
 * Enemy tag - marks enemy entities.
 */
export class Enemy {}

/**
 * Bullet tag - marks bullet entities.
 */
export class Bullet {}

/**
 * PowerUp tag - marks power-up entities.
 */
export class PowerUp {}

/**
 * Boss tag - marks boss enemy entities.
 * Only ONE boss can exist at a time.
 */
export class Boss {}

// ============ Visual Components ============

/**
 * Sprite component - visual representation.
 */
export class Sprite {
  constructor(
    public color: string = '#ffffff',
    public shape: 'rect' | 'circle' | 'triangle' | 'spaceship' = 'rect'
  ) {}
}

/**
 * Trail component - leaves a trail behind.
 */
export class Trail {
  positions: { x: number; y: number; alpha: number }[] = [];

  constructor(
    public color: string = '#ffffff',
    public maxLength: number = 10
  ) {}

  addPoint(x: number, y: number): void {
    this.positions.unshift({ x, y, alpha: 1 });
    if (this.positions.length > this.maxLength) {
      this.positions.pop();
    }
    // Fade older points
    for (let i = 0; i < this.positions.length; i++) {
      this.positions[i].alpha = 1 - i / this.maxLength;
    }
  }
}

// ============ AI Components ============

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

// ============ Physics Components ============

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

// ============ Effect Components ============

/**
 * Explosion component - visual explosion effect.
 * Expands over time then despawns.
 */
export class Explosion {
  public currentRadius: number;
  public elapsed: number = 0;
  
  constructor(
    public maxRadius: number = 100,
    public duration: number = 0.5,
    public color: string = '#ff6600',
    public particles: { x: number; y: number; vx: number; vy: number; size: number }[] = []
  ) {
    this.currentRadius = 10;
    // Generate particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      this.particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 6
      });
    }
  }
}
