/**
 * @module storage/sparse_set
 * @description Sparse set storage for components.
 * 
 * A sparse set is a data structure that provides:
 * - O(1) insertion
 * - O(1) deletion
 * - O(1) lookup
 * - Dense storage for iteration
 * 
 * Best for components that are:
 * - Added/removed frequently
 * - Not present on most entities
 * - Larger in size
 * 
 * Bevy comparison:
 * - Matches bevy_ecs/src/storage/sparse_set.rs
 * - Uses sparse array + dense array pattern
 * 
 * Interacts with:
 * - ComponentStorage: Used as backend for component storage
 * - Archetype: Stores component data per archetype
 */

import { EntityId } from '../core/types';

/**
 * Sparse set - efficient storage for sparse data.
 * 
 * Structure:
 * - sparse: Maps entity ID to index in dense array
 * - dense: Packed array of values
 * - entities: Packed array of entity IDs (parallel to dense)
 */
export class SparseSet<T> {
  /** Sparse array: entityId -> dense index */
  private sparse: Map<EntityId, number> = new Map();

  /** Dense array of values */
  private dense: T[] = [];

  /** Dense array of entity IDs */
  private entities: EntityId[] = [];

  /**
   * Insert a value for an entity.
   */
  insert(entityId: EntityId, value: T): void {
    const existingIndex = this.sparse.get(entityId);

    if (existingIndex !== undefined) {
      // Update existing
      this.dense[existingIndex] = value;
    } else {
      // Add new
      const newIndex = this.dense.length;
      this.sparse.set(entityId, newIndex);
      this.dense.push(value);
      this.entities.push(entityId);
    }
  }

  /**
   * Get value for an entity.
   */
  get(entityId: EntityId): T | undefined {
    const index = this.sparse.get(entityId);
    if (index === undefined) {
      return undefined;
    }
    return this.dense[index];
  }

  /**
   * Check if entity has a value.
   */
  has(entityId: EntityId): boolean {
    return this.sparse.has(entityId);
  }

  /**
   * Remove value for an entity.
   * Uses swap-remove for O(1) deletion.
   */
  remove(entityId: EntityId): boolean {
    const index = this.sparse.get(entityId);
    
    if (index === undefined) {
      return false;
    }

    // Get last element
    const lastIndex = this.dense.length - 1;
    const lastEntityId = this.entities[lastIndex];

    // Swap with last element
    if (index !== lastIndex) {
      this.dense[index] = this.dense[lastIndex];
      this.entities[index] = lastEntityId;
      this.sparse.set(lastEntityId, index);
    }

    // Remove last element
    this.dense.pop();
    this.entities.pop();
    this.sparse.delete(entityId);

    return true;
  }

  /**
   * Get all values with their entity IDs.
   */
  *iter(): IterableIterator<[EntityId, T]> {
    for (let i = 0; i < this.dense.length; i++) {
      yield [this.entities[i], this.dense[i]];
    }
  }

  /**
   * Get all values.
   */
  values(): T[] {
    return this.dense;
  }

  /**
   * Get all entity IDs.
   */
  entityIds(): EntityId[] {
    return this.entities;
  }

  /**
   * Get number of elements.
   */
  len(): number {
    return this.dense.length;
  }

  /**
   * Check if empty.
   */
  isEmpty(): boolean {
    return this.dense.length === 0;
  }

  /**
   * Clear all data.
   */
  clear(): void {
    this.sparse.clear();
    this.dense = [];
    this.entities = [];
  }

  /**
   * Reserve capacity (optimization hint).
   */
  reserve(additional: number): void {
    // TypeScript arrays grow automatically
    // This is just a hint for optimization
    void additional;
  }
}

/**
 * Component sparse set - specialized for component storage.
 */
export class ComponentSparseSet<T> extends SparseSet<T> {
  /**
   * Get mutable reference to component.
   * In Rust this would be &mut T, in TS we just return the object.
   */
  getMut(entityId: EntityId): T | undefined {
    return this.get(entityId);
  }

  /**
   * Update component in-place.
   */
  update(entityId: EntityId, updater: (value: T) => void): boolean {
    const value = this.get(entityId);
    if (value === undefined) {
      return false;
    }
    updater(value);
    return true;
  }
}
