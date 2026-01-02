/**
 * @module hierarchy
 * @description Entity hierarchy system for parent-child relationships.
 * 
 * Provides:
 * - Parent/Children components
 * - Transform propagation
 * - Hierarchy queries
 * - Automatic cleanup
 * 
 * Examples:
 * ```typescript
 * // Create parent entity
 * const parent = world.spawn()
 *   .insert(new Parent(null))
 *   .insert(new Children([]))
 *   .id();
 * 
 * // Create child entity
 * const child = world.spawn()
 *   .insert(new Parent(parent))
 *   .id();
 * 
 * // Query hierarchy
 * const query = world.query(Parent, Children);
 * for (const [entity, parent, children] of query.iter()) {
 *   // Process hierarchy
 * }
 * ```
 * 
 * Bevy comparison:
 * - Matches bevy_ecs/src/hierarchy.rs
 * - Parent/Children components
 * - Hierarchy traversal utilities
 * 
 * Interacts with:
 * - World: Parent-child relationships
 * - Query: Hierarchy queries
 * - Observer: React to hierarchy changes
 */

import { Entity, EntityId, ComponentClass } from './core/types';

/**
 * Parent component - references parent entity.
 */
export class Parent {
  constructor(public parent: Entity | null) {}

  /**
   * Get parent entity.
   */
  get(): Entity | null {
    return this.parent;
  }

  /**
   * Set parent entity.
   */
  set(parent: Entity): void {
    this.parent = parent;
  }

  /**
   * Check if has parent.
   */
  hasParent(): boolean {
    return this.parent !== null;
  }
}

/**
 * Children component - list of child entities.
 */
export class Children {
  constructor(public children: Entity[] = []) {}

  /**
   * Add a child.
   */
  add(child: Entity): void {
    if (!this.has(child)) {
      this.children.push(child);
    }
  }

  /**
   * Remove a child.
   */
  remove(child: Entity): boolean {
    const index = this.children.findIndex(
      (c) => c.id === child.id && c.generation === child.generation
    );

    if (index !== -1) {
      this.children.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Check if has child.
   */
  has(child: Entity): boolean {
    return this.children.some(
      (c) => c.id === child.id && c.generation === child.generation
    );
  }

  /**
   * Get all children.
   */
  getAll(): Entity[] {
    return this.children;
  }

  /**
   * Get child count.
   */
  len(): number {
    return this.children.length;
  }

  /**
   * Check if has children.
   */
  isEmpty(): boolean {
    return this.children.length === 0;
  }

  /**
   * Clear all children.
   */
  clear(): void {
    this.children = [];
  }
}

/**
 * Hierarchy query result.
 */
export interface HierarchyNode {
  entity: Entity;
  parent: Entity | null;
  children: Entity[];
  depth: number;
}

/**
 * Hierarchy utilities.
 */
export class HierarchyQuery {
  /**
   * Get all ancestors of an entity (bottom-up).
   */
  static *ancestors(
    entity: Entity,
    getParent: (entity: Entity) => Entity | null
  ): IterableIterator<Entity> {
    let current = getParent(entity);
    
    while (current !== null) {
      yield current;
      current = getParent(current);
    }
  }

  /**
   * Get all descendants of an entity (top-down, depth-first).
   */
  static *descendants(
    entity: Entity,
    getChildren: (entity: Entity) => Entity[]
  ): IterableIterator<Entity> {
    const children = getChildren(entity);

    for (const child of children) {
      yield child;
      yield* this.descendants(child, getChildren);
    }
  }

  /**
   * Get all descendants with depth information.
   */
  static *descendantsWithDepth(
    entity: Entity,
    getChildren: (entity: Entity) => Entity[],
    startDepth: number = 0
  ): IterableIterator<[Entity, number]> {
    const children = getChildren(entity);

    for (const child of children) {
      yield [child, startDepth + 1];
      yield* this.descendantsWithDepth(child, getChildren, startDepth + 1);
    }
  }

  /**
   * Get root entity (entity with no parent).
   */
  static getRoot(
    entity: Entity,
    getParent: (entity: Entity) => Entity | null
  ): Entity {
    let current = entity;
    let parent = getParent(current);

    while (parent !== null) {
      current = parent;
      parent = getParent(current);
    }

    return current;
  }

  /**
   * Get depth of entity in hierarchy (0 = root).
   */
  static getDepth(
    entity: Entity,
    getParent: (entity: Entity) => Entity | null
  ): number {
    let depth = 0;
    let current = getParent(entity);

    while (current !== null) {
      depth++;
      current = getParent(current);
    }

    return depth;
  }

  /**
   * Check if entity is ancestor of another.
   */
  static isAncestorOf(
    ancestor: Entity,
    descendant: Entity,
    getParent: (entity: Entity) => Entity | null
  ): boolean {
    let current = getParent(descendant);

    while (current !== null) {
      if (current.id === ancestor.id && current.generation === ancestor.generation) {
        return true;
      }
      current = getParent(current);
    }

    return false;
  }

  /**
   * Check if entity is descendant of another.
   */
  static isDescendantOf(
    descendant: Entity,
    ancestor: Entity,
    getParent: (entity: Entity) => Entity | null
  ): boolean {
    return this.isAncestorOf(ancestor, descendant, getParent);
  }
}

/**
 * Hierarchy builder for fluent API.
 */
export class HierarchyBuilder {
  private parent: Entity | null = null;
  private children: Entity[] = [];

  /**
   * Set parent.
   */
  setParent(parent: Entity): HierarchyBuilder {
    this.parent = parent;
    return this;
  }

  /**
   * Add child.
   */
  addChild(child: Entity): HierarchyBuilder {
    this.children.push(child);
    return this;
  }

  /**
   * Add multiple children.
   */
  addChildren(children: Entity[]): HierarchyBuilder {
    this.children.push(...children);
    return this;
  }

  /**
   * Build components.
   */
  build(): { parent: Parent | null; children: Children | null } {
    return {
      parent: this.parent !== null ? new Parent(this.parent) : null,
      children: this.children.length > 0 ? new Children(this.children) : null,
    };
  }
}

/**
 * Hierarchy maintenance system.
 * Ensures parent-child relationships are bidirectional.
 */
export class HierarchyMaintainer {
  /**
   * Set parent-child relationship (bidirectional).
   */
  static setParent(
    child: Entity,
    parent: Entity,
    getComponent: <T>(entity: Entity, cls: ComponentClass<T>) => T | undefined,
    setComponent: <T>(entity: Entity, component: T) => void
  ): void {
    // Set parent on child
    let childParent = getComponent(child, Parent);
    if (!childParent) {
      childParent = new Parent(parent);
      setComponent(child, childParent);
    } else {
      // Remove from old parent's children
      if (childParent.parent) {
        const oldParentChildren = getComponent(childParent.parent, Children);
        if (oldParentChildren) {
          oldParentChildren.remove(child);
        }
      }
      childParent.set(parent);
    }

    // Add to parent's children
    let parentChildren = getComponent(parent, Children);
    if (!parentChildren) {
      parentChildren = new Children([child]);
      setComponent(parent, parentChildren);
    } else {
      parentChildren.add(child);
    }
  }

  /**
   * Remove parent-child relationship.
   */
  static removeParent(
    child: Entity,
    getComponent: <T>(entity: Entity, cls: ComponentClass<T>) => T | undefined,
    removeComponent: <T>(entity: Entity, cls: ComponentClass<T>) => void
  ): void {
    const childParent = getComponent(child, Parent);
    if (!childParent || !childParent.parent) {
      return;
    }

    // Remove from parent's children
    const parentChildren = getComponent(childParent.parent, Children);
    if (parentChildren) {
      parentChildren.remove(child);
    }

    // Remove parent component
    removeComponent(child, Parent);
  }

  /**
   * Despawn entity and all descendants.
   */
  static *despawnRecursive(
    entity: Entity,
    getChildren: (entity: Entity) => Entity[]
  ): IterableIterator<Entity> {
    // Despawn all descendants first (depth-first)
    for (const descendant of HierarchyQuery.descendants(entity, getChildren)) {
      yield descendant;
    }

    // Then despawn self
    yield entity;
  }
}

/**
 * Transform propagation for hierarchies.
 * Typically used for 2D/3D transforms.
 */
export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Global transform (world-space).
 */
export class GlobalTransform implements Transform {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public rotation: number = 0,
    public scaleX: number = 1,
    public scaleY: number = 1
  ) {}

  /**
   * Compute from local transform and parent global.
   */
  static fromParent(local: Transform, parent: GlobalTransform): GlobalTransform {
    // Simple 2D transform composition
    const cos = Math.cos(parent.rotation);
    const sin = Math.sin(parent.rotation);

    const x = parent.x + (local.x * cos - local.y * sin) * parent.scaleX;
    const y = parent.y + (local.x * sin + local.y * cos) * parent.scaleY;
    const rotation = parent.rotation + local.rotation;
    const scaleX = parent.scaleX * local.scaleX;
    const scaleY = parent.scaleY * local.scaleY;

    return new GlobalTransform(x, y, rotation, scaleX, scaleY);
  }
}
