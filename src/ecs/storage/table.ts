/**
 * @module storage/table
 * @description Table storage for densely packed components.
 * 
 * Table storage uses columnar layout:
 * - Each component type has its own column
 * - Rows represent entities
 * - All entities in a table have the same components
 * - Excellent cache locality for iteration
 * 
 * Best for components that are:
 * - Present on most entities
 * - Accessed together frequently
 * - Rarely added/removed
 * 
 * Bevy comparison:
 * - Matches bevy_ecs/src/storage/table/mod.rs
 * - Uses Structure of Arrays (SoA) layout
 * 
 * Interacts with:
 * - Archetype: Tables store archetype data
 * - Query: Queries iterate over table columns
 */

import { EntityId, ComponentClass } from '../core/types';
import { Entity } from '../core/types';

/**
 * A column in a table - stores one component type for all entities.
 */
export class TableColumn<T = unknown> {
  /** Component type */
  readonly componentClass: ComponentClass<T>;

  /** Dense array of component data */
  private data: T[] = [];

  constructor(componentClass: ComponentClass<T>) {
    this.componentClass = componentClass;
  }

  /**
   * Push a component value.
   */
  push(value: T): void {
    this.data.push(value);
  }

  /**
   * Get component at row.
   */
  get(row: number): T | undefined {
    return this.data[row];
  }

  /**
   * Set component at row.
   */
  set(row: number, value: T): void {
    this.data[row] = value;
  }

  /**
   * Swap-remove component at row.
   */
  swapRemove(row: number): T | undefined {
    if (row >= this.data.length) {
      return undefined;
    }

    const value = this.data[row];
    const lastIndex = this.data.length - 1;

    if (row !== lastIndex) {
      this.data[row] = this.data[lastIndex];
    }

    this.data.pop();
    return value;
  }

  /**
   * Get number of components.
   */
  len(): number {
    return this.data.length;
  }

  /**
   * Get all data.
   */
  getData(): T[] {
    return this.data;
  }

  /**
   * Clear all data.
   */
  clear(): void {
    this.data = [];
  }
}

/**
 * A table stores entities with the same component layout.
 * Uses columnar storage for cache efficiency.
 */
export class Table {
  /** Columns indexed by component type name */
  private columns: Map<string, TableColumn> = new Map();

  /** Entity IDs for each row */
  private entities: Entity[] = [];

  /** Map entity ID to row index */
  private entityToRow: Map<EntityId, number> = new Map();

  /**
   * Add a column for a component type.
   */
  addColumn<T>(componentClass: ComponentClass<T>): void {
    const name = componentClass.name;
    if (!this.columns.has(name)) {
      this.columns.set(name, new TableColumn(componentClass));
    }
  }

  /**
   * Get column for component type.
   */
  getColumn<T>(componentClass: ComponentClass<T>): TableColumn<T> | undefined {
    return this.columns.get(componentClass.name) as TableColumn<T> | undefined;
  }

  /**
   * Check if table has column.
   */
  hasColumn(componentClass: ComponentClass): boolean {
    return this.columns.has(componentClass.name);
  }

  /**
   * Allocate a new row and return its index.
   */
  allocateRow(entity: Entity): number {
    const row = this.entities.length;
    this.entities.push(entity);
    this.entityToRow.set(entity.id, row);
    return row;
  }

  /**
   * Get row for entity.
   */
  getRow(entityId: EntityId): number | undefined {
    return this.entityToRow.get(entityId);
  }

  /**
   * Get entity at row.
   */
  getEntity(row: number): Entity | undefined {
    return this.entities[row];
  }

  /**
   * Get component for entity.
   */
  getComponent<T>(entityId: EntityId, componentClass: ComponentClass<T>): T | undefined {
    const row = this.entityToRow.get(entityId);
    if (row === undefined) {
      return undefined;
    }

    const column = this.getColumn(componentClass);
    if (!column) {
      return undefined;
    }

    return column.get(row);
  }

  /**
   * Set component for entity.
   */
  setComponent<T>(entityId: EntityId, componentClass: ComponentClass<T>, value: T): boolean {
    const row = this.entityToRow.get(entityId);
    if (row === undefined) {
      return false;
    }

    let column = this.getColumn(componentClass);
    if (!column) {
      this.addColumn(componentClass);
      column = this.getColumn(componentClass)!;
    }

    column.set(row, value);
    return true;
  }

  /**
   * Remove entity from table (swap-remove).
   */
  removeEntity(entityId: EntityId): boolean {
    const row = this.entityToRow.get(entityId);
    if (row === undefined) {
      return false;
    }

    const lastRow = this.entities.length - 1;

    // Swap-remove from all columns
    for (const column of this.columns.values()) {
      column.swapRemove(row);
    }

    // Swap-remove entity
    const lastEntity = this.entities[lastRow];
    if (row !== lastRow) {
      this.entities[row] = lastEntity;
      this.entityToRow.set(lastEntity.id, row);
    }

    this.entities.pop();
    this.entityToRow.delete(entityId);

    return true;
  }

  /**
   * Get number of entities (rows).
   */
  len(): number {
    return this.entities.length;
  }

  /**
   * Check if empty.
   */
  isEmpty(): boolean {
    return this.entities.length === 0;
  }

  /**
   * Get all entities.
   */
  getEntities(): Entity[] {
    return this.entities;
  }

  /**
   * Get all columns.
   */
  getColumns(): IterableIterator<TableColumn> {
    return this.columns.values();
  }

  /**
   * Clear all data.
   */
  clear(): void {
    this.columns.clear();
    this.entities = [];
    this.entityToRow.clear();
  }
}

/**
 * Collection of tables.
 * Each archetype has its own table.
 */
export class Tables {
  private tables: Table[] = [];

  /**
   * Allocate a new table.
   */
  allocate(): number {
    const id = this.tables.length;
    this.tables.push(new Table());
    return id;
  }

  /**
   * Get table by ID.
   */
  get(id: number): Table | undefined {
    return this.tables[id];
  }

  /**
   * Get number of tables.
   */
  len(): number {
    return this.tables.length;
  }

  /**
   * Iterate over all tables.
   */
  *iter(): IterableIterator<[number, Table]> {
    for (let i = 0; i < this.tables.length; i++) {
      yield [i, this.tables[i]];
    }
  }

  /**
   * Clear all tables.
   */
  clear(): void {
    this.tables = [];
  }
}
