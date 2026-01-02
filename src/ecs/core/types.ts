/**
 * @module types
 * @description Core type definitions for the ECS system.
 * Defines fundamental types used throughout the ECS architecture including:
 * - Entity identification (EntityId)
 * - Component class types (ComponentClass)
 * - System function signatures (SystemFn)
 * - Schedule stages for system execution ordering
 * 
 * This module is the foundation that all other ECS modules depend on.
 * Inspired by Bevy Engine's type system.
 */

/** Unique identifier for an entity - just a number like in Bevy */
export type EntityId = number;

/** Generation counter to handle entity recycling */
export type Generation = number;

/** Entity with ID and generation for safe references */
export interface Entity {
  id: EntityId;
  generation: Generation;
}

/** Constructor type for components */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ComponentClass<T = unknown> {
  new (...args: any[]): T;
  readonly name: string;
}

/** Type guard for component classes */
export type ComponentType<T> = ComponentClass<T>;

/** System execution stages - similar to Bevy's schedule stages */
export enum Stage {
  /** First stage - input handling, event processing */
  First = 'First',
  /** Pre-update - prepare data before main logic */
  PreUpdate = 'PreUpdate',
  /** Main update - game logic, movement, AI */
  Update = 'Update',
  /** Post-update - reactions to update changes */
  PostUpdate = 'PostUpdate',
  /** Last stage - rendering, cleanup */
  Last = 'Last',
}

/** Ordered list of stages for iteration */
export const STAGE_ORDER: Stage[] = [
  Stage.First,
  Stage.PreUpdate,
  Stage.Update,
  Stage.PostUpdate,
  Stage.Last,
];

/** System run criteria - when should the system run */
export type RunCriteria = (world: unknown) => boolean;

/** System label for ordering */
export type SystemLabel = string | symbol;
