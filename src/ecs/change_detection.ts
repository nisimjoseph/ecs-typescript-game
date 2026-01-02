/**
 * @module change_detection
 * @description Change detection system for tracking component modifications.
 * 
 * Provides query filters:
 * - Added<T>: Components added since last check
 * - Changed<T>: Components modified since last check
 * - Removed<T>: Components removed (tracked via events)
 * 
 * Uses tick-based tracking:
 * - World has a tick counter
 * - Each component stores last-changed tick
 * - Systems track their last-run tick
 * 
 * Bevy comparison:
 * - Matches bevy_ecs/src/change_detection/mod.rs
 * - Simplified tick wrapping (TS numbers are 64-bit)
 * 
 * Interacts with:
 * - Query: Filters by change status
 * - World: Maintains global tick counter
 * - Component: Each component has change ticks
 */

/**
 * Tick counter for change detection.
 * In Bevy this is a u32 that wraps, we'll use a number.
 */
export type Tick = number;

/**
 * Component ticks - tracks when component was added and changed.
 */
export class ComponentTicks {
  /** Tick when component was added */
  added: Tick;

  /** Tick when component was last changed */
  changed: Tick;

  constructor(tick: Tick) {
    this.added = tick;
    this.changed = tick;
  }

  /**
   * Set changed tick (but preserve added tick).
   */
  setChanged(tick: Tick): void {
    this.changed = tick;
  }

  /**
   * Check if component was added after lastRun tick.
   */
  isAdded(lastRun: Tick, thisTick: Tick): boolean {
    return this.wasChangedAfter(lastRun, thisTick) && this.added > lastRun;
  }

  /**
   * Check if component was changed after lastRun tick.
   */
  isChanged(lastRun: Tick, thisTick: Tick): boolean {
    return this.wasChangedAfter(lastRun, thisTick);
  }

  /**
   * Internal check for change detection.
   */
  private wasChangedAfter(lastRun: Tick, thisTick: Tick): boolean {
    // Simple version: just check if changed tick is after lastRun
    // Bevy handles tick wrapping here
    return this.changed > lastRun && this.changed <= thisTick;
  }
}

/**
 * Wrapper for components with change detection.
 */
export class Mut<T> {
  private value: T;
  private ticks: ComponentTicks;
  private currentTick: Tick;

  constructor(value: T, ticks: ComponentTicks, currentTick: Tick) {
    this.value = value;
    this.ticks = ticks;
    this.currentTick = currentTick;
  }

  /**
   * Get the value (immutable).
   */
  get(): T {
    return this.value;
  }

  /**
   * Get the value (mutable) and mark as changed.
   */
  getMut(): T {
    this.ticks.setChanged(this.currentTick);
    return this.value;
  }

  /**
   * Set the value and mark as changed.
   */
  set(newValue: T): void {
    this.value = newValue;
    this.ticks.setChanged(this.currentTick);
  }

  /**
   * Update the value and mark as changed.
   */
  update(updater: (value: T) => void): void {
    updater(this.value);
    this.ticks.setChanged(this.currentTick);
  }

  /**
   * Get ticks for inspection.
   */
  getTicks(): ComponentTicks {
    return this.ticks;
  }

  /**
   * Bypass change detection and get value.
   */
  bypass(): T {
    return this.value;
  }
}

/**
 * Track ticks for a system.
 */
export class SystemTicks {
  /** Last tick this system ran */
  lastRun: Tick = 0;

  /**
   * Update last run tick.
   */
  update(tick: Tick): void {
    this.lastRun = tick;
  }

  /**
   * Check if should run (based on run criteria).
   */
  shouldRun(currentTick: Tick): boolean {
    return currentTick > this.lastRun;
  }
}

/**
 * Change detection filters for queries.
 */
export enum ChangeFilter {
  /** Include all components */
  None = 'None',
  /** Only components added since last run */
  Added = 'Added',
  /** Only components changed since last run */
  Changed = 'Changed',
}

/**
 * Helper to check if component satisfies change filter.
 */
export function matchesChangeFilter(
  ticks: ComponentTicks,
  filter: ChangeFilter,
  lastRun: Tick,
  currentTick: Tick
): boolean {
  switch (filter) {
    case ChangeFilter.None:
      return true;
    case ChangeFilter.Added:
      return ticks.isAdded(lastRun, currentTick);
    case ChangeFilter.Changed:
      return ticks.isChanged(lastRun, currentTick);
  }
}

/**
 * Component storage with change detection.
 */
export class ChangeDetectionStorage<T> {
  /** Component data */
  private data: Map<number, T> = new Map();

  /** Change ticks for each component */
  private ticks: Map<number, ComponentTicks> = new Map();

  /**
   * Insert component with current tick.
   */
  insert(entityId: number, component: T, tick: Tick): void {
    this.data.set(entityId, component);
    this.ticks.set(entityId, new ComponentTicks(tick));
  }

  /**
   * Get component (immutable).
   */
  get(entityId: number): T | undefined {
    return this.data.get(entityId);
  }

  /**
   * Get component with change detection.
   */
  getMut(entityId: number, currentTick: Tick): Mut<T> | undefined {
    const value = this.data.get(entityId);
    const ticks = this.ticks.get(entityId);

    if (value === undefined || ticks === undefined) {
      return undefined;
    }

    return new Mut(value, ticks, currentTick);
  }

  /**
   * Get ticks for component.
   */
  getTicks(entityId: number): ComponentTicks | undefined {
    return this.ticks.get(entityId);
  }

  /**
   * Remove component.
   */
  remove(entityId: number): boolean {
    const hadData = this.data.delete(entityId);
    this.ticks.delete(entityId);
    return hadData;
  }

  /**
   * Check if has component.
   */
  has(entityId: number): boolean {
    return this.data.has(entityId);
  }

  /**
   * Get all entities with this component.
   */
  entities(): number[] {
    return Array.from(this.data.keys());
  }

  /**
   * Filter entities by change detection.
   */
  filterByChange(
    filter: ChangeFilter,
    lastRun: Tick,
    currentTick: Tick
  ): number[] {
    if (filter === ChangeFilter.None) {
      return this.entities();
    }

    const filtered: number[] = [];

    for (const [entityId, ticks] of this.ticks.entries()) {
      if (matchesChangeFilter(ticks, filter, lastRun, currentTick)) {
        filtered.push(entityId);
      }
    }

    return filtered;
  }

  /**
   * Clear all data.
   */
  clear(): void {
    this.data.clear();
    this.ticks.clear();
  }
}

/**
 * Trait-like interface for change detection.
 */
export interface DetectChanges<T> {
  /** Check if component was added */
  isAdded(): boolean;

  /** Check if component was changed */
  isChanged(): boolean;

  /** Get last changed tick */
  lastChanged(): Tick;

  /** Bypass change detection */
  bypass(): T;
}

/**
 * Implement DetectChanges for Mut<T>.
 */
export class MutWithDetection<T> extends Mut<T> implements DetectChanges<T> {
  private lastRun: Tick;

  constructor(
    value: T,
    ticks: ComponentTicks,
    currentTick: Tick,
    lastRun: Tick
  ) {
    super(value, ticks, currentTick);
    this.lastRun = lastRun;
  }

  isAdded(): boolean {
    return this.getTicks().isAdded(this.lastRun, this.lastRun + 1);
  }

  isChanged(): boolean {
    return this.getTicks().isChanged(this.lastRun, this.lastRun + 1);
  }

  lastChanged(): Tick {
    return this.getTicks().changed;
  }
}
