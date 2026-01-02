/**
 * @module world
 * @description The World is the central container for all ECS data.
 * 
 * Following Bevy's World structure, this module provides:
 * - Entity management (spawn, despawn, query)
 * - Component storage and access
 * - Resource storage and access
 * - Command application
 * 
 * The World is the single source of truth for all game state.
 * Systems receive the World (or parts of it) to query and modify data.
 * 
 * Interacts with:
 * - EntityAllocator: Manages entity IDs
 * - ComponentRegistry: Stores all components
 * - ResourceRegistry: Stores all resources
 * - Commands: Applied to modify the world
 * - Query: Created to access entities
 */

import { Entity, ComponentClass } from './types';
import { EntityAllocator } from '../entity/mod';
import { ComponentRegistry } from '../component/mod';
import { ResourceRegistry } from './resource';
import { Query } from '../query/mod';
import { Commands, Command, CommandType } from './commands';

/**
 * The World contains all entities, components, and resources.
 * Similar to Bevy's World struct.
 */
export class World {
  /** Entity allocator for managing entity IDs */
  private entityAllocator: EntityAllocator;

  /** Registry for all component storages */
  private componentRegistry: ComponentRegistry;

  /** Registry for all resources */
  private resourceRegistry: ResourceRegistry;

  /** Command queue for deferred operations */
  private commands: Commands;

  constructor() {
    this.entityAllocator = new EntityAllocator();
    this.componentRegistry = new ComponentRegistry();
    this.resourceRegistry = new ResourceRegistry();
    this.commands = new Commands();
  }

  // ============ Entity Operations ============

  /**
   * Spawn a new entity immediately.
   * For deferred spawning (in systems), use commands.spawn().
   */
  spawn(): EntityBuilder {
    const entity = this.entityAllocator.allocate();
    return new EntityBuilder(this, entity);
  }

  /**
   * Despawn an entity immediately.
   */
  despawn(entity: Entity): boolean {
    const wasAlive = this.entityAllocator.deallocate(entity);
    if (wasAlive) {
      this.componentRegistry.removeEntity(entity.id);
    }
    return wasAlive;
  }

  /**
   * Check if an entity is alive.
   */
  isAlive(entity: Entity): boolean {
    return this.entityAllocator.isAlive(entity);
  }

  /**
   * Get all alive entities.
   */
  entities(): Entity[] {
    return this.entityAllocator.getAllAlive();
  }

  /**
   * Get entity count.
   */
  entityCount(): number {
    return this.entityAllocator.getCount();
  }

  // ============ Component Operations ============

  /**
   * Insert a component on an entity.
   */
  insertComponent<T extends object>(entity: Entity, component: T): void {
    const componentClass = component.constructor as ComponentClass<T>;
    const storage = this.componentRegistry.getStorage(componentClass);
    storage.insert(entity.id, component);
  }

  /**
   * Get a component from an entity.
   */
  getComponent<T>(entity: Entity, componentClass: ComponentClass<T>): T | undefined {
    const storage = this.componentRegistry.getStorage(componentClass);
    return storage.get(entity.id);
  }

  /**
   * Check if an entity has a component.
   */
  hasComponent<T>(entity: Entity, componentClass: ComponentClass<T>): boolean {
    const storage = this.componentRegistry.getStorage(componentClass);
    return storage.has(entity.id);
  }

  /**
   * Remove a component from an entity.
   */
  removeComponent<T>(entity: Entity, componentClass: ComponentClass<T>): boolean {
    const storage = this.componentRegistry.getStorage(componentClass);
    return storage.remove(entity.id);
  }

  // ============ Resource Operations ============

  /**
   * Insert a resource.
   */
  insertResource<T extends object>(resource: T): void {
    this.resourceRegistry.insertInstance(resource);
  }

  /**
   * Get a resource.
   */
  getResource<T>(resourceClass: ComponentClass<T>): T | undefined {
    return this.resourceRegistry.get(resourceClass);
  }

  /**
   * Get a resource, throwing if not found.
   */
  getResourceRequired<T>(resourceClass: ComponentClass<T>): T {
    return this.resourceRegistry.getRequired(resourceClass);
  }

  /**
   * Check if a resource exists.
   */
  hasResource<T>(resourceClass: ComponentClass<T>): boolean {
    return this.resourceRegistry.has(resourceClass);
  }

  /**
   * Remove a resource.
   */
  removeResource<T>(resourceClass: ComponentClass<T>): boolean {
    return this.resourceRegistry.remove(resourceClass);
  }

  // ============ Query Operations ============

  /**
   * Create a query for entities with specific components.
   * 
   * Usage:
   *   const query = world.query(Position, Velocity);
   *   for (const [entity, pos, vel] of query.iter()) { ... }
   */
  query<T extends unknown[]>(
    ...componentClasses: { [K in keyof T]: ComponentClass<T[K]> }
  ): Query<T> {
    return new Query<T>(
      this.entityAllocator,
      this.componentRegistry,
      componentClasses
    );
  }

  // ============ Commands ============

  /**
   * Get the command queue for deferred operations.
   */
  getCommands(): Commands {
    return this.commands;
  }

  /**
   * Apply all pending commands.
   */
  applyCommands(): void {
    const commands = this.commands._drain();

    for (const command of commands) {
      this.applyCommand(command);
    }
  }

  /**
   * Apply a single command.
   */
  private applyCommand(command: Command): void {
    switch (command.type) {
      case CommandType.SpawnEntity: {
        const entity = this.entityAllocator.allocate();
        for (const component of command.components) {
          this.insertComponent(entity, component as object);
        }
        if (command.callback) {
          command.callback(entity);
        }
        break;
      }

      case CommandType.DespawnEntity: {
        this.despawn(command.entity);
        break;
      }

      case CommandType.InsertComponent: {
        const isAlive = this.isAlive(command.entity);
        if (isAlive) {
          this.insertComponent(command.entity, command.component as object);
        }
        break;
      }

      case CommandType.RemoveComponent: {
        const isAlive = this.isAlive(command.entity);
        if (isAlive) {
          this.removeComponent(command.entity, command.componentClass);
        }
        break;
      }

      case CommandType.InsertResource: {
        this.insertResource(command.resource as object);
        break;
      }

      case CommandType.RemoveResource: {
        this.removeResource(command.resourceClass);
        break;
      }
    }
  }

  // ============ Utility ============

  /**
   * Clear all entities, components, and resources.
   */
  clear(): void {
    this.entityAllocator.clear();
    this.componentRegistry.clear();
    this.resourceRegistry.clear();
    this.commands._drain(); // Clear pending commands
  }
}

/**
 * Fluent builder for spawning entities with components.
 */
export class EntityBuilder {
  constructor(
    private world: World,
    private entity: Entity
  ) {}

  /**
   * Insert a component on this entity.
   */
  insert<T extends object>(component: T): EntityBuilder {
    this.world.insertComponent(this.entity, component);
    return this;
  }

  /**
   * Get the entity reference.
   */
  id(): Entity {
    return this.entity;
  }
}
