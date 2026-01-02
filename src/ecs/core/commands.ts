/**
 * @module commands
 * @description Deferred command system for safe entity/component modifications.
 * 
 * Following Bevy's Commands pattern, this module provides:
 * - Commands: Queue of deferred operations
 * - EntityCommands: Fluent API for entity modifications
 * 
 * Why deferred commands?
 * - Systems may iterate over entities while needing to spawn/despawn
 * - Immediate modifications would invalidate iterators
 * - Commands are applied after systems complete
 * 
 * Example usage:
 *   commands.spawn()
 *     .insert(new Position(0, 0))
 *     .insert(new Velocity(1, 1));
 *   commands.despawn(oldEntity);
 * 
 * Interacts with:
 * - World: Commands are applied to the World
 * - Entity: Creates/destroys entities
 * - Component: Inserts/removes components
 */

import { Entity, ComponentClass } from './types';

/** Command types for the command queue */
export enum CommandType {
  SpawnEntity = 'SpawnEntity',
  DespawnEntity = 'DespawnEntity',
  InsertComponent = 'InsertComponent',
  RemoveComponent = 'RemoveComponent',
  InsertResource = 'InsertResource',
  RemoveResource = 'RemoveResource',
}

/** Base command interface */
interface BaseCommand {
  type: CommandType;
}

/** Command to spawn a new entity */
interface SpawnEntityCommand extends BaseCommand {
  type: CommandType.SpawnEntity;
  components: unknown[];
  callback?: (entity: Entity) => void;
}

/** Command to despawn an entity */
interface DespawnEntityCommand extends BaseCommand {
  type: CommandType.DespawnEntity;
  entity: Entity;
}

/** Command to insert a component on an entity */
interface InsertComponentCommand extends BaseCommand {
  type: CommandType.InsertComponent;
  entity: Entity;
  component: unknown;
}

/** Command to remove a component from an entity */
interface RemoveComponentCommand extends BaseCommand {
  type: CommandType.RemoveComponent;
  entity: Entity;
  componentClass: ComponentClass;
}

/** Command to insert a resource */
interface InsertResourceCommand extends BaseCommand {
  type: CommandType.InsertResource;
  resource: unknown;
}

/** Command to remove a resource */
interface RemoveResourceCommand extends BaseCommand {
  type: CommandType.RemoveResource;
  resourceClass: ComponentClass;
}

/** Union of all command types */
export type Command =
  | SpawnEntityCommand
  | DespawnEntityCommand
  | InsertComponentCommand
  | RemoveComponentCommand
  | InsertResourceCommand
  | RemoveResourceCommand;

/**
 * Fluent API for modifying a spawned entity.
 */
export class EntityCommands {
  private components: unknown[] = [];
  private callback?: (entity: Entity) => void;

  constructor(private commands: Commands) {}

  /**
   * Insert a component on this entity.
   */
  insert<T>(component: T): EntityCommands {
    this.components.push(component);
    return this;
  }

  /**
   * Set a callback to receive the entity after spawn.
   */
  onSpawn(callback: (entity: Entity) => void): EntityCommands {
    this.callback = callback;
    return this;
  }

  /**
   * Finalize and return the components for spawning.
   * Called internally by Commands.
   */
  _build(): { components: unknown[]; callback?: (entity: Entity) => void } {
    return { components: this.components, callback: this.callback };
  }
}

/**
 * Queue of deferred commands to be applied to the world.
 * Similar to Bevy's Commands system parameter.
 */
export class Commands {
  private queue: Command[] = [];
  private pendingSpawns: EntityCommands[] = [];

  /**
   * Spawn a new entity with components.
   * Returns EntityCommands for fluent component insertion.
   */
  spawn(): EntityCommands {
    const entityCommands = new EntityCommands(this);
    this.pendingSpawns.push(entityCommands);
    return entityCommands;
  }

  /**
   * Despawn an entity and remove all its components.
   */
  despawn(entity: Entity): void {
    this.queue.push({
      type: CommandType.DespawnEntity,
      entity,
    });
  }

  /**
   * Insert a component on an existing entity.
   */
  insertComponent<T>(entity: Entity, component: T): void {
    this.queue.push({
      type: CommandType.InsertComponent,
      entity,
      component,
    });
  }

  /**
   * Remove a component from an entity.
   */
  removeComponent<T>(entity: Entity, componentClass: ComponentClass<T>): void {
    this.queue.push({
      type: CommandType.RemoveComponent,
      entity,
      componentClass,
    });
  }

  /**
   * Insert a resource.
   */
  insertResource<T extends object>(resource: T): void {
    this.queue.push({
      type: CommandType.InsertResource,
      resource,
    });
  }

  /**
   * Remove a resource.
   */
  removeResource<T>(resourceClass: ComponentClass<T>): void {
    this.queue.push({
      type: CommandType.RemoveResource,
      resourceClass,
    });
  }

  /**
   * Finalize pending spawns into the command queue.
   * Called before applying commands.
   */
  _finalizePendingSpawns(): void {
    for (const entityCommands of this.pendingSpawns) {
      const { components, callback } = entityCommands._build();
      this.queue.push({
        type: CommandType.SpawnEntity,
        components,
        callback,
      });
    }
    this.pendingSpawns = [];
  }

  /**
   * Get all queued commands and clear the queue.
   */
  _drain(): Command[] {
    this._finalizePendingSpawns();
    const commands = this.queue;
    this.queue = [];
    return commands;
  }

  /**
   * Check if there are pending commands.
   */
  hasPending(): boolean {
    return this.queue.length > 0 || this.pendingSpawns.length > 0;
  }
}
