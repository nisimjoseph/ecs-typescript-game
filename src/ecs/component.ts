/**
 * @module component
 * @description Component registration and storage system.
 * 
 * Components are plain data attached to entities.
 * This module provides:
 * - Component registration
 * - Storage backends (Table vs SparseSet)
 * - Component metadata
 * - Change detection integration
 * 
 * Bevy comparison:
 * - Matches bevy_ecs/src/component/mod.rs
 * - Supports multiple storage strategies
 * - Integrates change detection
 * 
 * Interacts with:
 * - Entity: Components attached to entities
 * - Storage: Uses Table or SparseSet for storage
 * - World: Components accessed via world
 * - Archetype: Component layout determines archetype
 */

import { ComponentClass, EntityId } from './core/types';
import { ComponentSparseSet } from './storage/sparse_set';
import { Tick, ComponentTicks, ChangeDetectionStorage } from './change_detection';

/**
 * Component storage strategy.
 */
export enum StorageType {
  /** Dense table storage - best for frequently accessed components */
  Table = 'Table',
  /** Sparse set storage - best for rarely present components */
  SparseSet = 'SparseSet',
}

/**
 * Component info - metadata about a component type.
 */
export class ComponentInfo {
  /** Component class */
  readonly componentClass: ComponentClass;

  /** Component name */
  readonly name: string;

  /** Storage type */
  readonly storageType: StorageType;

  /** Component ID (just name for now) */
  readonly id: string;

  constructor(
    componentClass: ComponentClass,
    storageType: StorageType = StorageType.Table
  ) {
    this.componentClass = componentClass;
    this.name = componentClass.name;
    this.storageType = storageType;
    this.id = componentClass.name;
  }
}

/**
 * Component storage - stores components for entities.
 */
export class ComponentStorage<T = unknown> {
  /** Component info */
  readonly info: ComponentInfo;

  /** Storage backend */
  private storage: Map<EntityId, T> = new Map();

  /** Change detection ticks */
  private ticks: Map<EntityId, ComponentTicks> = new Map();

  constructor(componentClass: ComponentClass<T>) {
    this.info = new ComponentInfo(componentClass);
  }

  /**
   * Insert component for entity.
   */
  insert(entityId: EntityId, component: T, tick: Tick = 0): void {
    this.storage.set(entityId, component);
    this.ticks.set(entityId, new ComponentTicks(tick));
  }

  /**
   * Get component for entity.
   */
  get(entityId: EntityId): T | undefined {
    return this.storage.get(entityId);
  }

  /**
   * Get component ticks.
   */
  getTicks(entityId: EntityId): ComponentTicks | undefined {
    return this.ticks.get(entityId);
  }

  /**
   * Check if entity has component.
   */
  has(entityId: EntityId): boolean {
    return this.storage.has(entityId);
  }

  /**
   * Remove component from entity.
   */
  remove(entityId: EntityId): boolean {
    const hadComponent = this.storage.delete(entityId);
    this.ticks.delete(entityId);
    return hadComponent;
  }

  /**
   * Get all entities with this component.
   */
  entities(): EntityId[] {
    return Array.from(this.storage.keys());
  }

  /**
   * Iterate over all components.
   */
  *iter(): IterableIterator<[EntityId, T]> {
    for (const [entityId, component] of this.storage.entries()) {
      yield [entityId, component];
    }
  }

  /**
   * Clear all components.
   */
  clear(): void {
    this.storage.clear();
    this.ticks.clear();
  }

  /**
   * Get component count.
   */
  len(): number {
    return this.storage.size;
  }
}

/**
 * Component registry - manages all component storages.
 */
export class ComponentRegistry {
  /** Component storages by component name */
  private storages: Map<string, ComponentStorage> = new Map();

  /** Component info by component name */
  private infos: Map<string, ComponentInfo> = new Map();

  /** Current tick for change detection */
  private currentTick: Tick = 0;

  /**
   * Register a component type.
   */
  register<T>(
    componentClass: ComponentClass<T>,
    storageType: StorageType = StorageType.Table
  ): ComponentInfo {
    const name = componentClass.name;

    if (!this.infos.has(name)) {
      const info = new ComponentInfo(componentClass, storageType);
      this.infos.set(name, info);
      this.storages.set(name, new ComponentStorage(componentClass));
    }

    return this.infos.get(name)!;
  }

  /**
   * Get storage for component type.
   */
  getStorage<T>(componentClass: ComponentClass<T>): ComponentStorage<T> {
    const name = componentClass.name;

    if (!this.storages.has(name)) {
      this.register(componentClass);
    }

    return this.storages.get(name) as ComponentStorage<T>;
  }

  /**
   * Get component info.
   */
  getInfo(componentClass: ComponentClass): ComponentInfo | undefined {
    return this.infos.get(componentClass.name);
  }

  /**
   * Remove all components from an entity.
   */
  removeEntity(entityId: EntityId): void {
    for (const storage of this.storages.values()) {
      storage.remove(entityId);
    }
  }

  /**
   * Increment tick counter.
   */
  incrementTick(): void {
    this.currentTick++;
  }

  /**
   * Get current tick.
   */
  getTick(): Tick {
    return this.currentTick;
  }

  /**
   * Clear all components.
   */
  clear(): void {
    for (const storage of this.storages.values()) {
      storage.clear();
    }
  }

  /**
   * Get all registered component types.
   */
  getRegisteredTypes(): ComponentClass[] {
    return Array.from(this.infos.values()).map((info) => info.componentClass);
  }
}

/**
 * Component descriptor for advanced configuration.
 */
export class ComponentDescriptor {
  readonly componentClass: ComponentClass;
  readonly storageType: StorageType;

  constructor(componentClass: ComponentClass, storageType: StorageType = StorageType.Table) {
    this.componentClass = componentClass;
    this.storageType = storageType;
  }

  /**
   * Create descriptor with table storage.
   */
  static table(componentClass: ComponentClass): ComponentDescriptor {
    return new ComponentDescriptor(componentClass, StorageType.Table);
  }

  /**
   * Create descriptor with sparse set storage.
   */
  static sparseSet(componentClass: ComponentClass): ComponentDescriptor {
    return new ComponentDescriptor(componentClass, StorageType.SparseSet);
  }
}

/**
 * Component trait marker (for documentation).
 * In Rust, this would be a trait. In TS, it's just for type safety.
 */
export interface Component {
  // Marker interface
}

/**
 * Helper to mark a class as a component.
 */
export function component<T>(
  target: new (...args: unknown[]) => T
): new (...args: unknown[]) => T & Component {
  return target as new (...args: unknown[]) => T & Component;
}
