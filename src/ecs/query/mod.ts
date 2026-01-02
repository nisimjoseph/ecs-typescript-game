/**
 * @module query
 * @description Query system for accessing entities with specific components.
 * 
 * Queries provide:
 * - Component access by type
 * - Filtering (With/Without/Or/Changed/Added)
 * - Efficient iteration
 * - Change detection integration
 * 
 * Examples:
 * ```typescript
 * // Basic query
 * const query = world.query(Position, Velocity);
 * for (const [entity, pos, vel] of query.iter()) {
 *   pos.x += vel.x;
 * }
 * 
 * // With filters
 * const query = world.query(Position, Velocity)
 *   .with(Health)
 *   .without(Dead)
 *   .changed(Position);
 * ```
 * 
 * Bevy comparison:
 * - Matches bevy_ecs/src/query/mod.rs
 * - Supports all major query filters
 * - Integrates change detection
 * 
 * Interacts with:
 * - World: Queries access world data
 * - Archetype: Queries filter by archetype
 * - Component: Queries fetch components
 * - ChangeDetection: Queries can filter by changes
 */

import { Entity, ComponentClass, EntityId } from '../core/types';
import { EntityAllocator } from '../entity/mod';
import { ComponentRegistry } from '../component/mod';
import { ChangeFilter, matchesChangeFilter } from '../change_detection/mod';

/**
 * Query filter type.
 */
export enum QueryFilterType {
  /** No filter */
  None = 'None',
  /** Entity must have component */
  With = 'With',
  /** Entity must not have component */
  Without = 'Without',
  /** Component must be added */
  Added = 'Added',
  /** Component must be changed */
  Changed = 'Changed',
}

/**
 * Query filter.
 */
export interface QueryFilter {
  type: QueryFilterType;
  componentClass?: ComponentClass;
}

/**
 * Query state - maintains query configuration and cache.
 */
export class QueryState<T extends unknown[]> {
  /** Component classes to fetch */
  readonly componentClasses: { [K in keyof T]: ComponentClass<T[K]> };

  /** Filters to apply */
  private filters: QueryFilter[] = [];

  /** Last run tick for change detection */
  private lastRun: number = 0;

  constructor(componentClasses: { [K in keyof T]: ComponentClass<T[K]> }) {
    this.componentClasses = componentClasses;
  }

  /**
   * Add "with" filter - entity must have component.
   */
  addWith(componentClass: ComponentClass): void {
    this.filters.push({
      type: QueryFilterType.With,
      componentClass,
    });
  }

  /**
   * Add "without" filter - entity must not have component.
   */
  addWithout(componentClass: ComponentClass): void {
    this.filters.push({
      type: QueryFilterType.Without,
      componentClass,
    });
  }

  /**
   * Add "added" filter - component was added.
   */
  addAdded(componentClass: ComponentClass): void {
    this.filters.push({
      type: QueryFilterType.Added,
      componentClass,
    });
  }

  /**
   * Add "changed" filter - component was changed.
   */
  addChanged(componentClass: ComponentClass): void {
    this.filters.push({
      type: QueryFilterType.Changed,
      componentClass,
    });
  }

  /**
   * Get all filters.
   */
  getFilters(): QueryFilter[] {
    return this.filters;
  }

  /**
   * Update last run tick.
   */
  updateLastRun(tick: number): void {
    this.lastRun = tick;
  }

  /**
   * Get last run tick.
   */
  getLastRun(): number {
    return this.lastRun;
  }
}

/**
 * Query - fetch entities with specific components.
 */
export class Query<T extends unknown[]> {
  private state: QueryState<T>;
  private entityAllocator: EntityAllocator;
  private componentRegistry: ComponentRegistry;

  constructor(
    entityAllocator: EntityAllocator,
    componentRegistry: ComponentRegistry,
    componentClasses: { [K in keyof T]: ComponentClass<T[K]> }
  ) {
    this.state = new QueryState(componentClasses);
    this.entityAllocator = entityAllocator;
    this.componentRegistry = componentRegistry;
  }

  /**
   * Add "with" filter - entity must have component.
   */
  with(componentClass: ComponentClass): Query<T> {
    this.state.addWith(componentClass);
    return this;
  }

  /**
   * Add "without" filter - entity must not have component.
   */
  without(componentClass: ComponentClass): Query<T> {
    this.state.addWithout(componentClass);
    return this;
  }

  /**
   * Add "added" filter - component was added.
   */
  added(componentClass: ComponentClass): Query<T> {
    this.state.addAdded(componentClass);
    return this;
  }

  /**
   * Add "changed" filter - component was changed.
   */
  changed(componentClass: ComponentClass): Query<T> {
    this.state.addChanged(componentClass);
    return this;
  }

  /**
   * Iterate over matching entities.
   */
  *iter(): IterableIterator<[Entity, ...T]> {
    const entities = this.entityAllocator.getAllAlive();
    const currentTick = this.componentRegistry.getTick();
    const lastRun = this.state.getLastRun();

    for (const entity of entities) {
      // Check if entity matches query
      if (this.matchesEntity(entity, currentTick, lastRun)) {
        // Fetch components
        const components = this.fetchComponents(entity);
        if (components) {
          yield [entity, ...components];
        }
      }
    }

    // Update last run tick
    this.state.updateLastRun(currentTick);
  }

  /**
   * Get single entity result.
   */
  single(): [Entity, ...T] | undefined {
    for (const result of this.iter()) {
      return result;
    }
    return undefined;
  }

  /**
   * Get all results as array.
   */
  toArray(): Array<[Entity, ...T]> {
    return Array.from(this.iter());
  }

  /**
   * Count matching entities.
   */
  count(): number {
    let count = 0;
    for (const _ of this.iter()) {
      count++;
    }
    return count;
  }

  /**
   * Check if query has any matches.
   */
  isEmpty(): boolean {
    for (const _ of this.iter()) {
      return false;
    }
    return true;
  }

  /**
   * Check if entity matches query.
   */
  private matchesEntity(entity: Entity, currentTick: number, lastRun: number): boolean {
    // Check if entity has all required components
    for (const componentClass of this.state.componentClasses) {
      const storage = this.componentRegistry.getStorage(componentClass);
      if (!storage.has(entity.id)) {
        return false;
      }
    }

    // Apply filters
    for (const filter of this.state.getFilters()) {
      if (!this.matchesFilter(entity, filter, currentTick, lastRun)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if entity matches a specific filter.
   */
  private matchesFilter(
    entity: Entity,
    filter: QueryFilter,
    currentTick: number,
    lastRun: number
  ): boolean {
    if (!filter.componentClass) {
      return true;
    }

    const storage = this.componentRegistry.getStorage(filter.componentClass);

    switch (filter.type) {
      case QueryFilterType.None:
        return true;

      case QueryFilterType.With:
        return storage.has(entity.id);

      case QueryFilterType.Without:
        return !storage.has(entity.id);

      case QueryFilterType.Added: {
        const ticks = storage.getTicks(entity.id);
        if (!ticks) {
          return false;
        }
        return matchesChangeFilter(ticks, ChangeFilter.Added, lastRun, currentTick);
      }

      case QueryFilterType.Changed: {
        const ticks = storage.getTicks(entity.id);
        if (!ticks) {
          return false;
        }
        return matchesChangeFilter(ticks, ChangeFilter.Changed, lastRun, currentTick);
      }

      default:
        return true;
    }
  }

  /**
   * Fetch components for entity.
   */
  private fetchComponents(entity: Entity): T | undefined {
    const components: unknown[] = [];

    for (const componentClass of this.state.componentClasses) {
      const storage = this.componentRegistry.getStorage(componentClass);
      const component = storage.get(entity.id);

      if (component === undefined) {
        return undefined;
      }

      components.push(component);
    }

    return components as T;
  }

  /**
   * Get state for advanced usage.
   */
  getState(): QueryState<T> {
    return this.state;
  }
}

/**
 * Query builder for more complex queries.
 */
export class QueryBuilder {
  private withComponents: ComponentClass[] = [];
  private withoutComponents: ComponentClass[] = [];
  private addedComponents: ComponentClass[] = [];
  private changedComponents: ComponentClass[] = [];

  /**
   * Add "with" filter.
   */
  with(...componentClasses: ComponentClass[]): QueryBuilder {
    this.withComponents.push(...componentClasses);
    return this;
  }

  /**
   * Add "without" filter.
   */
  without(...componentClasses: ComponentClass[]): QueryBuilder {
    this.withoutComponents.push(...componentClasses);
    return this;
  }

  /**
   * Add "added" filter.
   */
  added(...componentClasses: ComponentClass[]): QueryBuilder {
    this.addedComponents.push(...componentClasses);
    return this;
  }

  /**
   * Add "changed" filter.
   */
  changed(...componentClasses: ComponentClass[]): QueryBuilder {
    this.changedComponents.push(...componentClasses);
    return this;
  }

  /**
   * Build query state.
   */
  build<T extends unknown[]>(
    componentClasses: { [K in keyof T]: ComponentClass<T[K]> }
  ): QueryState<T> {
    const state = new QueryState(componentClasses);

    for (const cls of this.withComponents) {
      state.addWith(cls);
    }

    for (const cls of this.withoutComponents) {
      state.addWithout(cls);
    }

    for (const cls of this.addedComponents) {
      state.addAdded(cls);
    }

    for (const cls of this.changedComponents) {
      state.addChanged(cls);
    }

    return state;
  }
}

/**
 * Or filter - match any of multiple conditions.
 */
export class OrQuery {
  private queries: QueryState<unknown[]>[] = [];

  add(state: QueryState<unknown[]>): void {
    this.queries.push(state);
  }

  // Or queries are complex - simplified for now
}
