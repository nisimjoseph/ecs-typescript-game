/**
 * @module archetype
 * @description Archetype system for grouping entities by component layout.
 * 
 * An archetype represents a unique combination of component types.
 * All entities with the same set of components share an archetype.
 * 
 * Benefits:
 * - Fast queries: Only iterate archetypes that match query
 * - Cache efficiency: Components stored contiguously
 * - Structural sharing: Component layout computed once
 * 
 * Bevy comparison:
 * - Matches bevy_ecs/src/archetype/mod.rs
 * - Uses component type IDs to identify archetypes
 * - Maintains archetype graph for add/remove edges
 * 
 * Interacts with:
 * - Table: Each archetype has a table for component storage
 * - Query: Queries filter by archetype
 * - World: World maintains archetype registry
 */

import { ComponentClass, Entity, EntityId } from './core/types';
import { Table } from './storage/table';

/**
 * Unique identifier for an archetype.
 */
export type ArchetypeId = number;

/**
 * Component type ID (just the class name for now).
 */
export type ComponentId = string;

/**
 * Get component ID from class.
 */
export function componentId(componentClass: ComponentClass): ComponentId {
  return componentClass.name;
}

/**
 * Edge in the archetype graph - represents adding/removing a component.
 */
export interface ArchetypeEdge {
  /** Target archetype when adding this component */
  add?: ArchetypeId;
  /** Target archetype when removing this component */
  remove?: ArchetypeId;
}

/**
 * An archetype - a unique combination of component types.
 */
export class Archetype {
  /** Unique archetype ID */
  readonly id: ArchetypeId;

  /** Set of component IDs in this archetype */
  private componentIds: Set<ComponentId>;

  /** Sorted array of component IDs (for matching) */
  private componentIdsSorted: ComponentId[];

  /** Table storing the actual component data */
  readonly table: Table;

  /** Entities in this archetype */
  private entities: Entity[] = [];

  /** Map entity ID to row in archetype */
  private entityToRow: Map<EntityId, number> = new Map();

  /** Edges to other archetypes (component add/remove) */
  private edges: Map<ComponentId, ArchetypeEdge> = new Map();

  constructor(id: ArchetypeId, componentClasses: ComponentClass[]) {
    this.id = id;
    this.componentIds = new Set(componentClasses.map(componentId));
    this.componentIdsSorted = Array.from(this.componentIds).sort();
    this.table = new Table();

    // Initialize table columns
    for (const componentClass of componentClasses) {
      this.table.addColumn(componentClass);
    }
  }

  /**
   * Check if archetype contains component type.
   */
  hasComponent(compId: ComponentId): boolean {
    return this.componentIds.has(compId);
  }

  /**
   * Get component IDs.
   */
  getComponentIds(): ComponentId[] {
    return this.componentIdsSorted;
  }

  /**
   * Get component types count.
   */
  componentCount(): number {
    return this.componentIds.size;
  }

  /**
   * Check if this archetype matches another set of components.
   */
  matches(otherComponentIds: ComponentId[]): boolean {
    if (otherComponentIds.length !== this.componentIdsSorted.length) {
      return false;
    }

    const sorted = [...otherComponentIds].sort();
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== this.componentIdsSorted[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Add entity to archetype.
   */
  addEntity(entity: Entity): number {
    const row = this.entities.length;
    this.entities.push(entity);
    this.entityToRow.set(entity.id, row);
    return row;
  }

  /**
   * Remove entity from archetype (swap-remove).
   */
  removeEntity(entityId: EntityId): boolean {
    const row = this.entityToRow.get(entityId);
    if (row === undefined) {
      return false;
    }

    const lastRow = this.entities.length - 1;
    const lastEntity = this.entities[lastRow];

    // Swap with last
    if (row !== lastRow) {
      this.entities[row] = lastEntity;
      this.entityToRow.set(lastEntity.id, row);
    }

    this.entities.pop();
    this.entityToRow.delete(entityId);

    // Also remove from table
    this.table.removeEntity(entityId);

    return true;
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
   * Get all entities.
   */
  getEntities(): Entity[] {
    return this.entities;
  }

  /**
   * Get entity count.
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
   * Set edge to another archetype.
   */
  setEdge(compId: ComponentId, add?: ArchetypeId, remove?: ArchetypeId): void {
    const edge = this.edges.get(compId) || {};
    if (add !== undefined) {
      edge.add = add;
    }
    if (remove !== undefined) {
      edge.remove = remove;
    }
    this.edges.set(compId, edge);
  }

  /**
   * Get edge for component.
   */
  getEdge(compId: ComponentId): ArchetypeEdge | undefined {
    return this.edges.get(compId);
  }

  /**
   * Clear all entities.
   */
  clear(): void {
    this.entities = [];
    this.entityToRow.clear();
    this.table.clear();
  }
}

/**
 * Empty archetype - for entities with no components.
 */
export const EMPTY_ARCHETYPE_ID: ArchetypeId = 0;

/**
 * Registry of all archetypes.
 */
export class Archetypes {
  private archetypes: Archetype[] = [];
  
  /** Cache: component signature -> archetype ID */
  private signatureCache: Map<string, ArchetypeId> = new Map();

  constructor() {
    // Create empty archetype (ID 0)
    this.archetypes.push(new Archetype(EMPTY_ARCHETYPE_ID, []));
  }

  /**
   * Get archetype by ID.
   */
  get(id: ArchetypeId): Archetype | undefined {
    return this.archetypes[id];
  }

  /**
   * Get or create archetype for component combination.
   */
  getOrCreate(componentClasses: ComponentClass[]): Archetype {
    // Create signature
    const signature = this.createSignature(componentClasses);

    // Check cache
    const cachedId = this.signatureCache.get(signature);
    if (cachedId !== undefined) {
      return this.archetypes[cachedId];
    }

    // Create new archetype
    const id = this.archetypes.length;
    const archetype = new Archetype(id, componentClasses);
    this.archetypes.push(archetype);
    this.signatureCache.set(signature, id);

    // Update edges from existing archetypes
    this.updateEdges(archetype);

    return archetype;
  }

  /**
   * Create signature string from component classes.
   */
  private createSignature(componentClasses: ComponentClass[]): string {
    return componentClasses
      .map(componentId)
      .sort()
      .join(',');
  }

  /**
   * Update archetype edges after creating new archetype.
   */
  private updateEdges(newArchetype: Archetype): void {
    const newCompIds = newArchetype.getComponentIds();

    // For each existing archetype, check if we can reach new archetype
    for (const existing of this.archetypes) {
      if (existing.id === newArchetype.id) {
        continue;
      }

      const existingCompIds = existing.getComponentIds();

      // Check if new archetype is one component addition away
      const diff = this.componentDiff(existingCompIds, newCompIds);
      
      if (diff.added.length === 1 && diff.removed.length === 0) {
        // existing + component -> new
        const addedComp = diff.added[0];
        existing.setEdge(addedComp, newArchetype.id, undefined);
        newArchetype.setEdge(addedComp, undefined, existing.id);
      }

      // Check if new archetype is one component removal away
      const diffReverse = this.componentDiff(newCompIds, existingCompIds);
      
      if (diffReverse.added.length === 1 && diffReverse.removed.length === 0) {
        // new + component -> existing
        const addedComp = diffReverse.added[0];
        newArchetype.setEdge(addedComp, existing.id, undefined);
        existing.setEdge(addedComp, undefined, newArchetype.id);
      }
    }
  }

  /**
   * Get difference between component sets.
   */
  private componentDiff(
    from: ComponentId[],
    to: ComponentId[]
  ): { added: ComponentId[]; removed: ComponentId[] } {
    const fromSet = new Set(from);
    const toSet = new Set(to);

    const added: ComponentId[] = [];
    const removed: ComponentId[] = [];

    for (const compId of toSet) {
      if (!fromSet.has(compId)) {
        added.push(compId);
      }
    }

    for (const compId of fromSet) {
      if (!toSet.has(compId)) {
        removed.push(compId);
      }
    }

    return { added, removed };
  }

  /**
   * Get archetype for adding component to existing archetype.
   */
  getArchetypeForAdd(
    currentId: ArchetypeId,
    componentClass: ComponentClass
  ): Archetype {
    const current = this.get(currentId);
    if (!current) {
      throw new Error(`Invalid archetype ID: ${currentId}`);
    }

    const compId = componentId(componentClass);

    // Check if component already present
    if (current.hasComponent(compId)) {
      return current; // No change needed
    }

    // Check edge
    const edge = current.getEdge(compId);
    if (edge?.add !== undefined) {
      return this.archetypes[edge.add];
    }

    // Create new archetype
    const currentClasses = Array.from(current.table.getColumns()).map(
      (col: { componentClass: ComponentClass }) => col.componentClass
    );
    const newClasses = [...currentClasses, componentClass];
    return this.getOrCreate(newClasses);
  }

  /**
   * Get archetype for removing component from existing archetype.
   */
  getArchetypeForRemove(
    currentId: ArchetypeId,
    componentClass: ComponentClass
  ): Archetype {
    const current = this.get(currentId);
    if (!current) {
      throw new Error(`Invalid archetype ID: ${currentId}`);
    }

    const compId = componentId(componentClass);

    // Check if component not present
    if (!current.hasComponent(compId)) {
      return current; // No change needed
    }

    // Check edge
    const edge = current.getEdge(compId);
    if (edge?.remove !== undefined) {
      return this.archetypes[edge.remove];
    }

    // Create new archetype
    const currentClasses = Array.from(current.table.getColumns())
      .map((col: { componentClass: ComponentClass }) => col.componentClass)
      .filter((cls) => componentId(cls) !== compId);
    return this.getOrCreate(currentClasses);
  }

  /**
   * Find archetypes matching query components.
   */
  findMatching(queryComponentIds: ComponentId[]): Archetype[] {
    const querySet = new Set(queryComponentIds);
    const matching: Archetype[] = [];

    for (const archetype of this.archetypes) {
      const hasAll = queryComponentIds.every((compId) =>
        archetype.hasComponent(compId)
      );
      if (hasAll) {
        matching.push(archetype);
      }
    }

    return matching;
  }

  /**
   * Get total number of archetypes.
   */
  len(): number {
    return this.archetypes.length;
  }

  /**
   * Iterate over all archetypes.
   */
  *iter(): IterableIterator<Archetype> {
    for (const archetype of this.archetypes) {
      yield archetype;
    }
  }

  /**
   * Clear all archetypes except empty.
   */
  clear(): void {
    // Keep empty archetype
    const empty = this.archetypes[0];
    empty.clear();
    
    this.archetypes = [empty];
    this.signatureCache.clear();
  }
}
