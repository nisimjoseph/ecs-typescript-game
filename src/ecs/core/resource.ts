/**
 * @module resource
 * @description Resource system for global singleton data.
 * 
 * Resources are global singletons accessible from any system.
 * Unlike components (attached to entities), resources are world-global.
 * 
 * Examples:
 * - GameConfig: Global game configuration
 * - Input: Input state
 * - Time: Frame timing information
 * - AssetCache: Loaded assets
 * 
 * Bevy comparison:
 * - Matches bevy_ecs/src/resource.rs
 * - Type-safe resource access
 * - Optional resource deletion
 * 
 * Interacts with:
 * - World: Resources stored in world
 * - Systems: Systems query resources
 */

import { ComponentClass } from './types';

/**
 * Resource registry - stores global singleton resources.
 */
export class ResourceRegistry {
  /** Resources by type name */
  private resources: Map<string, object> = new Map();

  /**
   * Insert a resource instance.
   */
  insertInstance<T extends object>(resource: T): void {
    const typeName = resource.constructor.name;
    this.resources.set(typeName, resource);
  }

  /**
   * Get a resource by class.
   */
  get<T>(resourceClass: ComponentClass<T>): T | undefined {
    const typeName = resourceClass.name;
    return this.resources.get(typeName) as T | undefined;
  }

  /**
   * Get a resource, throwing if not found.
   */
  getRequired<T>(resourceClass: ComponentClass<T>): T {
    const resource = this.get(resourceClass);
    if (resource === undefined) {
      throw new Error(`Resource not found: ${resourceClass.name}`);
    }
    return resource;
  }

  /**
   * Check if resource exists.
   */
  has<T>(resourceClass: ComponentClass<T>): boolean {
    return this.resources.has(resourceClass.name);
  }

  /**
   * Remove a resource.
   */
  remove<T>(resourceClass: ComponentClass<T>): boolean {
    return this.resources.delete(resourceClass.name);
  }

  /**
   * Clear all resources.
   */
  clear(): void {
    this.resources.clear();
  }

  /**
   * Get count of resources.
   */
  count(): number {
    return this.resources.size;
  }

  /**
   * Iterate over all resources.
   */
  *iter(): IterableIterator<[string, object]> {
    for (const [name, resource] of this.resources.entries()) {
      yield [name, resource];
    }
  }
}

/**
 * Resource trait marker (for documentation).
 */
export interface Resource {
  // Marker interface
}

/**
 * Helper to mark a class as a resource.
 */
export function resource<T>(
  target: new (...args: unknown[]) => T
): new (...args: unknown[]) => T & Resource {
  return target as new (...args: unknown[]) => T & Resource;
}
