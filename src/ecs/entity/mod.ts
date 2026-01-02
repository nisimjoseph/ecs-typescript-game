/**
 * @module entity
 * @description Entity management system matching Bevy's entity module.
 * 
 * Provides:
 * - Entity: ID + generation for safe recycling
 * - EntityAllocator: Manages entity creation and recycling
 * - EntityMeta: Metadata for entity location in storage
 * 
 * Bevy comparison:
 * - Matches bevy_ecs/src/entity/mod.rs functionality
 * - Uses generation counters for safe entity reuse
 * - Tracks entity location in archetypes
 * 
 * Interacts with:
 * - Archetype: Entities stored in archetypes by component layout
 * - World: Primary interface for entity operations
 * - Commands: Deferred entity spawn/despawn
 */

import { EntityId, Generation, Entity } from '../core/types';

/**
 * Entity metadata - tracks location in ECS storage.
 * Similar to Bevy's EntityMeta.
 */
export interface EntityMeta {
  /** Current generation - incremented on despawn */
  generation: Generation;
  /** Archetype ID where this entity resides */
  archetypeId: number;
  /** Index within the archetype */
  archetypeRow: number;
}

/**
 * Allocates and manages entity IDs with generation tracking.
 * Similar to Bevy's Entities struct.
 */
export class EntityAllocator {
  /** Next entity ID to allocate */
  private nextId: EntityId = 0;

  /** Free list of recycled entity IDs */
  private freeList: EntityId[] = [];

  /** Metadata for all entities (living and dead) */
  private meta: Map<EntityId, EntityMeta> = new Map();

  /** Count of living entities */
  private aliveCount: number = 0;

  /**
   * Allocate a new entity.
   */
  allocate(): Entity {
    let id: EntityId;
    let generation: Generation;

    if (this.freeList.length > 0) {
      // Reuse recycled entity ID
      id = this.freeList.pop()!;
      const meta = this.meta.get(id)!;
      generation = meta.generation;
      
      // Reset location (will be set when components are added)
      meta.archetypeId = 0;
      meta.archetypeRow = 0;
    } else {
      // Allocate new ID
      id = this.nextId++;
      generation = 0;
      
      this.meta.set(id, {
        generation,
        archetypeId: 0,
        archetypeRow: 0,
      });
    }

    this.aliveCount++;
    return { id, generation };
  }

  /**
   * Deallocate an entity.
   * Increments generation and adds to free list.
   */
  deallocate(entity: Entity): boolean {
    const meta = this.meta.get(entity.id);
    
    if (!meta) {
      return false;
    }

    // Check generation matches
    if (meta.generation !== entity.generation) {
      return false; // Entity already despawned
    }

    // Increment generation
    meta.generation++;
    
    // Add to free list
    this.freeList.push(entity.id);
    
    this.aliveCount--;
    return true;
  }

  /**
   * Check if entity is alive.
   */
  isAlive(entity: Entity): boolean {
    const meta = this.meta.get(entity.id);
    if (!meta) {
      return false;
    }
    return meta.generation === entity.generation;
  }

  /**
   * Get entity metadata.
   */
  getMeta(entity: Entity): EntityMeta | undefined {
    const meta = this.meta.get(entity.id);
    if (!meta || meta.generation !== entity.generation) {
      return undefined;
    }
    return meta;
  }

  /**
   * Update entity location in storage.
   */
  setLocation(entity: Entity, archetypeId: number, archetypeRow: number): void {
    const meta = this.meta.get(entity.id);
    if (meta && meta.generation === entity.generation) {
      meta.archetypeId = archetypeId;
      meta.archetypeRow = archetypeRow;
    }
  }

  /**
   * Get all alive entities.
   */
  getAllAlive(): Entity[] {
    const alive: Entity[] = [];
    
    for (const [id, meta] of this.meta.entries()) {
      // Entity is alive if it's not in the free list
      const isDead = this.freeList.includes(id);
      if (!isDead) {
        alive.push({ id, generation: meta.generation });
      }
    }
    
    return alive;
  }

  /**
   * Get count of alive entities.
   */
  getCount(): number {
    return this.aliveCount;
  }

  /**
   * Clear all entities.
   */
  clear(): void {
    this.nextId = 0;
    this.freeList = [];
    this.meta.clear();
    this.aliveCount = 0;
  }

  /**
   * Reserve capacity for entities (performance optimization).
   */
  reserve(additionalCapacity: number): void {
    // TypeScript doesn't need explicit reservations
    // But we can pre-allocate arrays if needed
    void additionalCapacity;
  }
}

/**
 * Entity map - maps entities to values.
 * Similar to Bevy's EntityHashMap.
 */
export class EntityMap<V> {
  private map: Map<string, V> = new Map();

  private static key(entity: Entity): string {
    return `${entity.id}:${entity.generation}`;
  }

  set(entity: Entity, value: V): void {
    this.map.set(EntityMap.key(entity), value);
  }

  get(entity: Entity): V | undefined {
    return this.map.get(EntityMap.key(entity));
  }

  has(entity: Entity): boolean {
    return this.map.has(EntityMap.key(entity));
  }

  delete(entity: Entity): boolean {
    return this.map.delete(EntityMap.key(entity));
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }

  *entries(): IterableIterator<[Entity, V]> {
    for (const [key, value] of this.map.entries()) {
      const [idStr, genStr] = key.split(':');
      const entity: Entity = {
        id: parseInt(idStr, 10),
        generation: parseInt(genStr, 10),
      };
      yield [entity, value];
    }
  }
}

/**
 * Entity set - set of entities.
 * Similar to Bevy's EntityHashSet.
 */
export class EntitySet {
  private set: Set<string> = new Set();

  private static key(entity: Entity): string {
    return `${entity.id}:${entity.generation}`;
  }

  add(entity: Entity): void {
    this.set.add(EntitySet.key(entity));
  }

  has(entity: Entity): boolean {
    return this.set.has(EntitySet.key(entity));
  }

  delete(entity: Entity): boolean {
    return this.set.delete(EntitySet.key(entity));
  }

  clear(): void {
    this.set.clear();
  }

  get size(): number {
    return this.set.size;
  }

  *values(): IterableIterator<Entity> {
    for (const key of this.set.values()) {
      const [idStr, genStr] = key.split(':');
      yield {
        id: parseInt(idStr, 10),
        generation: parseInt(genStr, 10),
      };
    }
  }
}
