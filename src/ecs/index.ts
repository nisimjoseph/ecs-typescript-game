/**
 * @module ecs
 * @description Main ECS library exports.
 * 
 * This is the entry point for the Entity Component System library.
 * Exports all core modules, systems, and utilities.
 * 
 * Inspired by Bevy Engine's ECS architecture.
 * 
 * Example usage:
 * ```typescript
 * import { App, World, Entity, Query, Commands } from './ecs';
 * 
 * const app = new App()
 *   .addSystem(movementSystem)
 *   .addSystem(renderSystem)
 *   .run();
 * ```
 */

// Core types
export * from './core/types';

// Core systems
import { App as AppClass } from './core/app';
export { App, Time, Plugin } from './core/app';
export { World, EntityBuilder } from './core/world';
export {
  SystemFn,
  SystemConfig,
  SystemDescriptor,
  Schedule,
  system,
} from './core/system';
export { Commands, EntityCommands, Command, CommandType } from './core/commands';

// Entity
export {
  EntityAllocator,
  EntityMeta,
  EntityMap,
  EntitySet,
} from './entity/mod';

// Component
export {
  ComponentStorage,
  ComponentRegistry,
  ComponentInfo,
  ComponentDescriptor,
  StorageType,
  Component,
  component,
} from './component/mod';

// Query
export {
  Query,
  QueryState,
  QueryBuilder,
  QueryFilter,
  QueryFilterType,
} from './query/mod';

// Storage
export { SparseSet, ComponentSparseSet } from './storage/sparse_set';
export { Table, TableColumn, Tables } from './storage/table/mod';

// Archetype
export {
  Archetype,
  Archetypes,
  ArchetypeId,
  ArchetypeEdge,
  ComponentId,
  componentId,
  EMPTY_ARCHETYPE_ID,
} from './archetype/mod';

// Change Detection
export {
  Tick,
  ComponentTicks,
  Mut,
  SystemTicks,
  ChangeFilter,
  matchesChangeFilter,
  ChangeDetectionStorage,
  DetectChanges,
  MutWithDetection,
} from './change_detection/mod';

// Bundle
export {
  Bundle,
  BundleInfo,
  BundleRegistry,
  BundleInserter,
  BundleSpawner,
  DynamicBundle,
  EmptyBundle,
  TransformBundle,
  bundle,
  extractBundleInfo,
  isBundle,
} from './bundle/mod';

// Event
export {
  Events,
  EventReader,
  EventWriter,
  EventRegistry,
  EventId,
  EventInstance,
  updateEventsSystem,
  addEvent,
} from './event/mod';

// Observer
export {
  Observer,
  ObserverDescriptor,
  ObserverRegistry,
  ObserverBuilder,
  ObserverFn,
  ObserverTrigger,
  ObserverEvent,
  ObserverEventQueue,
  onAdd,
  onChange,
  onRemove,
} from './observer/mod';

// Hierarchy
export {
  Parent,
  Children,
  HierarchyNode,
  HierarchyQuery,
  HierarchyBuilder,
  HierarchyMaintainer,
  Transform,
  GlobalTransform,
} from './hierarchy/mod';

// Resource (from core)
export { ResourceRegistry } from './core/resource';

/**
 * Version of the ECS library.
 */
export const VERSION = '1.0.0-bevy-compatible';

/**
 * Quick start helper - create a new app.
 */
export function createApp() {
  return new AppClass();
}
