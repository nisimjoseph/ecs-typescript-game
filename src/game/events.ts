/**
 * @module game/events
 * @description Game-specific events for decoupled communication.
 * 
 * Events allow systems to communicate without direct dependencies.
 * A system can send events that other systems will process.
 * 
 * DEMONSTRATES: Event system from Bevy ECS
 * 
 * Examples:
 * - CollisionEvent: Notify when entities collide
 * - DamageEvent: Notify when damage is dealt
 * - ScoreEvent: Notify when score changes
 * 
 * Interacts with:
 * - Events<T>: Event queue resource
 * - EventReader: Read events in systems
 * - EventWriter: Send events in systems
 */

import { Entity, Events, EventReader, EventWriter } from '../ecs';

// ============ Entity Lifecycle Events ============

/**
 * Event: Entity was spawned.
 */
export class EntitySpawnedEvent {
  constructor(
    public entity: Entity,
    public entityType: 'player' | 'enemy' | 'bullet' | 'powerup' | 'explosion'
  ) {}
}

/**
 * Event: Entity was despawned.
 */
export class EntityDespawnedEvent {
  constructor(
    public entityType: 'player' | 'enemy' | 'bullet' | 'powerup' | 'explosion',
    public reason: 'killed' | 'expired' | 'collected' | 'manual'
  ) {}
}

// ============ Collision Events ============

/**
 * Event: Two entities collided.
 */
export class CollisionEvent {
  constructor(
    public entityA: Entity,
    public entityB: Entity,
    public typeA: string,
    public typeB: string
  ) {}
}

/**
 * Event: Bullet hit an enemy.
 */
export class BulletHitEvent {
  constructor(
    public bullet: Entity,
    public enemy: Entity,
    public damage: number,
    public position: { x: number; y: number }
  ) {}
}

/**
 * Event: Player hit an enemy.
 */
export class PlayerHitEvent {
  constructor(
    public enemy: Entity,
    public damage: number,
    public playerHealthRemaining: number
  ) {}
}

/**
 * Event: Player collected a power-up.
 */
export class PowerUpCollectedEvent {
  constructor(
    public powerUp: Entity,
    public healAmount: number,
    public newHealth: number
  ) {}
}

// ============ Combat Events ============

/**
 * Event: Damage was dealt.
 */
export class DamageEvent {
  constructor(
    public target: Entity,
    public amount: number,
    public source: Entity | null,
    public remainingHealth: number
  ) {}
}

/**
 * Event: Entity was killed.
 */
export class EntityKilledEvent {
  constructor(
    public entity: Entity,
    public entityType: 'player' | 'enemy',
    public killedBy: Entity | null,
    public position: { x: number; y: number }
  ) {}
}

// ============ Game State Events ============

/**
 * Event: Score changed.
 */
export class ScoreChangedEvent {
  constructor(
    public points: number,
    public newTotal: number,
    public reason: 'enemy_killed' | 'powerup_collected' | 'bonus'
  ) {}
}

/**
 * Event: Game over.
 */
export class GameOverEvent {
  constructor(
    public finalScore: number,
    public enemiesKilled: number,
    public powerUpsCollected: number,
    public survivalTime: number
  ) {}
}

/**
 * Event: Game started/restarted.
 */
export class GameStartEvent {
  constructor(
    public isRestart: boolean = false
  ) {}
}

// ============ Player Events ============

/**
 * Event: Player shot a bullet.
 */
export class PlayerShootEvent {
  constructor(
    public position: { x: number; y: number }
  ) {}
}

/**
 * Event: Player health changed.
 */
export class PlayerHealthChangedEvent {
  constructor(
    public oldHealth: number,
    public newHealth: number,
    public maxHealth: number,
    public cause: 'damage' | 'heal' | 'powerup'
  ) {}
}

// ============ Boss Events ============

/**
 * Event: Boss spawned.
 */
export class BossSpawnedEvent {
  constructor(
    public boss: Entity,
    public health: number
  ) {}
}

/**
 * Event: Boss killed.
 */
export class BossKilledEvent {
  constructor(
    public boss: Entity,
    public position: { x: number; y: number },
    public scoreReward: number
  ) {}
}

// ============ Event Registry Setup ============

/**
 * Game events container - holds all event queues.
 * This is registered as a resource in the world.
 */
export class GameEvents {
  // Entity lifecycle
  entitySpawned = new Events<EntitySpawnedEvent>();
  entityDespawned = new Events<EntityDespawnedEvent>();

  // Collision
  collision = new Events<CollisionEvent>();
  bulletHit = new Events<BulletHitEvent>();
  playerHit = new Events<PlayerHitEvent>();
  powerUpCollected = new Events<PowerUpCollectedEvent>();

  // Combat
  damage = new Events<DamageEvent>();
  entityKilled = new Events<EntityKilledEvent>();

  // Game state
  scoreChanged = new Events<ScoreChangedEvent>();
  gameOver = new Events<GameOverEvent>();
  gameStart = new Events<GameStartEvent>();

  // Player
  playerShoot = new Events<PlayerShootEvent>();
  playerHealthChanged = new Events<PlayerHealthChangedEvent>();

  // Boss
  bossSpawned = new Events<BossSpawnedEvent>();
  bossKilled = new Events<BossKilledEvent>();

  /**
   * Update all event buffers (call at end of frame).
   */
  updateAll(tick: number): void {
    this.entitySpawned.update(tick);
    this.entityDespawned.update(tick);
    this.collision.update(tick);
    this.bulletHit.update(tick);
    this.playerHit.update(tick);
    this.powerUpCollected.update(tick);
    this.damage.update(tick);
    this.entityKilled.update(tick);
    this.scoreChanged.update(tick);
    this.gameOver.update(tick);
    this.gameStart.update(tick);
    this.playerShoot.update(tick);
    this.playerHealthChanged.update(tick);
    this.bossSpawned.update(tick);
    this.bossKilled.update(tick);
  }

  /**
   * Clear all events.
   */
  clearAll(): void {
    this.entitySpawned.clear();
    this.entityDespawned.clear();
    this.collision.clear();
    this.bulletHit.clear();
    this.playerHit.clear();
    this.powerUpCollected.clear();
    this.damage.clear();
    this.entityKilled.clear();
    this.scoreChanged.clear();
    this.gameOver.clear();
    this.gameStart.clear();
    this.playerShoot.clear();
    this.playerHealthChanged.clear();
    this.bossSpawned.clear();
    this.bossKilled.clear();
  }
}

// ============ Event Readers (for systems) ============

/**
 * Create event readers for a system.
 * These track which events have been read.
 */
export class GameEventReaders {
  entitySpawned = new EventReader<EntitySpawnedEvent>();
  entityDespawned = new EventReader<EntityDespawnedEvent>();
  collision = new EventReader<CollisionEvent>();
  bulletHit = new EventReader<BulletHitEvent>();
  playerHit = new EventReader<PlayerHitEvent>();
  powerUpCollected = new EventReader<PowerUpCollectedEvent>();
  damage = new EventReader<DamageEvent>();
  entityKilled = new EventReader<EntityKilledEvent>();
  scoreChanged = new EventReader<ScoreChangedEvent>();
  gameOver = new EventReader<GameOverEvent>();
  gameStart = new EventReader<GameStartEvent>();
  playerShoot = new EventReader<PlayerShootEvent>();
  playerHealthChanged = new EventReader<PlayerHealthChangedEvent>();
  bossSpawned = new EventReader<BossSpawnedEvent>();
  bossKilled = new EventReader<BossKilledEvent>();
}
