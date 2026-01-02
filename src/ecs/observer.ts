/**
 * @module observer
 * @description Observer system for reacting to component changes.
 * 
 * Observers provide declarative reactivity:
 * - Trigger when components are added/removed/changed
 * - More efficient than polling in systems
 * - Decoupled from system execution order
 * 
 * Examples:
 * ```typescript
 * // React when Health component is added
 * world.observe(OnAdd(Health), (entity, health) => {
 *   console.log(`Entity ${entity.id} gained health: ${health.value}`);
 * });
 * 
 * // React when component changes
 * world.observe(OnChange(Position), (entity, pos) => {
 *   console.log(`Entity ${entity.id} moved to ${pos.x}, ${pos.y}`);
 * });
 * 
 * // React when component is removed
 * world.observe(OnRemove(Enemy), (entity) => {
 *   console.log(`Enemy ${entity.id} was destroyed`);
 * });
 * ```
 * 
 * Bevy comparison:
 * - Matches bevy_ecs/src/observer/mod.rs
 * - Event-driven component lifecycle hooks
 * - Efficient targeted updates
 * 
 * Interacts with:
 * - World: Registers and triggers observers
 * - Component: Observes component lifecycle
 * - Event: Uses event system internally
 */

import { Entity, ComponentClass } from './core/types';

/**
 * Observer trigger type.
 */
export enum ObserverTrigger {
  /** Component was added */
  OnAdd = 'OnAdd',
  /** Component was changed */
  OnChange = 'OnChange',
  /** Component was removed */
  OnRemove = 'OnRemove',
}

/**
 * Observer callback function.
 */
export type ObserverFn<T> = (entity: Entity, component?: T) => void;

/**
 * Observer descriptor.
 */
export interface ObserverDescriptor<T> {
  /** Component type to observe */
  componentClass: ComponentClass<T>;
  /** Trigger type */
  trigger: ObserverTrigger;
  /** Callback function */
  callback: ObserverFn<T>;
  /** Optional label */
  label?: string;
  /** Priority (higher runs first) */
  priority?: number;
}

/**
 * Observer instance.
 */
export class Observer<T> {
  readonly componentClass: ComponentClass<T>;
  readonly trigger: ObserverTrigger;
  readonly callback: ObserverFn<T>;
  readonly label?: string;
  readonly priority: number;

  constructor(descriptor: ObserverDescriptor<T>) {
    this.componentClass = descriptor.componentClass;
    this.trigger = descriptor.trigger;
    this.callback = descriptor.callback;
    this.label = descriptor.label;
    this.priority = descriptor.priority ?? 0;
  }

  /**
   * Execute observer callback.
   */
  execute(entity: Entity, component?: T): void {
    this.callback(entity, component);
  }
}

/**
 * Observer registry - manages all observers.
 */
export class ObserverRegistry {
  /** Observers grouped by component and trigger */
  private observers: Map<string, Observer<unknown>[]> = new Map();

  /**
   * Create key for observer lookup.
   */
  private getKey(componentClass: ComponentClass, trigger: ObserverTrigger): string {
    return `${componentClass.name}:${trigger}`;
  }

  /**
   * Register an observer.
   */
  register<T>(descriptor: ObserverDescriptor<T>): Observer<T> {
    const observer = new Observer(descriptor);
    const key = this.getKey(descriptor.componentClass, descriptor.trigger);

    if (!this.observers.has(key)) {
      this.observers.set(key, []);
    }

    const list = this.observers.get(key)!;
    list.push(observer as Observer<unknown>);

    // Sort by priority (higher first)
    list.sort((a, b) => b.priority - a.priority);

    return observer;
  }

  /**
   * Trigger observers for a component event.
   */
  trigger<T>(
    trigger: ObserverTrigger,
    entity: Entity,
    componentClass: ComponentClass<T>,
    component?: T
  ): void {
    const key = this.getKey(componentClass, trigger);
    const list = this.observers.get(key);

    if (!list) {
      return;
    }

    for (const observer of list) {
      observer.execute(entity, component);
    }
  }

  /**
   * Get all observers for a component and trigger.
   */
  getObservers<T>(
    componentClass: ComponentClass<T>,
    trigger: ObserverTrigger
  ): Observer<T>[] {
    const key = this.getKey(componentClass, trigger);
    return (this.observers.get(key) as Observer<T>[]) || [];
  }

  /**
   * Remove all observers.
   */
  clear(): void {
    this.observers.clear();
  }

  /**
   * Remove observers for specific component and trigger.
   */
  clearFor(componentClass: ComponentClass, trigger: ObserverTrigger): void {
    const key = this.getKey(componentClass, trigger);
    this.observers.delete(key);
  }

  /**
   * Get total observer count.
   */
  count(): number {
    let total = 0;
    for (const list of this.observers.values()) {
      total += list.length;
    }
    return total;
  }
}

/**
 * Observer builder for fluent API.
 */
export class ObserverBuilder<T> {
  private descriptor: Partial<ObserverDescriptor<T>>;

  constructor(componentClass: ComponentClass<T>, trigger: ObserverTrigger) {
    this.descriptor = {
      componentClass,
      trigger,
    };
  }

  /**
   * Set callback function.
   */
  run(callback: ObserverFn<T>): ObserverBuilder<T> {
    this.descriptor.callback = callback;
    return this;
  }

  /**
   * Set label.
   */
  label(label: string): ObserverBuilder<T> {
    this.descriptor.label = label;
    return this;
  }

  /**
   * Set priority.
   */
  priority(priority: number): ObserverBuilder<T> {
    this.descriptor.priority = priority;
    return this;
  }

  /**
   * Build the observer descriptor.
   */
  build(): ObserverDescriptor<T> {
    if (!this.descriptor.callback) {
      throw new Error('Observer must have a callback function');
    }
    return this.descriptor as ObserverDescriptor<T>;
  }
}

/**
 * Helper functions for creating observers.
 */

/**
 * Create observer for component addition.
 */
export function onAdd<T>(componentClass: ComponentClass<T>): ObserverBuilder<T> {
  return new ObserverBuilder(componentClass, ObserverTrigger.OnAdd);
}

/**
 * Create observer for component change.
 */
export function onChange<T>(componentClass: ComponentClass<T>): ObserverBuilder<T> {
  return new ObserverBuilder(componentClass, ObserverTrigger.OnChange);
}

/**
 * Create observer for component removal.
 */
export function onRemove<T>(componentClass: ComponentClass<T>): ObserverBuilder<T> {
  return new ObserverBuilder(componentClass, ObserverTrigger.OnRemove);
}

/**
 * Observer system - processes queued observer events.
 * In Bevy, this is handled during command application.
 */
export interface ObserverEvent {
  trigger: ObserverTrigger;
  entity: Entity;
  componentClass: ComponentClass;
  component?: unknown;
}

/**
 * Observer event queue.
 */
export class ObserverEventQueue {
  private queue: ObserverEvent[] = [];

  /**
   * Queue an observer event.
   */
  push(event: ObserverEvent): void {
    this.queue.push(event);
  }

  /**
   * Process all queued events.
   */
  flush(registry: ObserverRegistry): void {
    const events = this.queue;
    this.queue = [];

    for (const event of events) {
      registry.trigger(
        event.trigger,
        event.entity,
        event.componentClass,
        event.component
      );
    }
  }

  /**
   * Clear all queued events.
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Get queue length.
   */
  len(): number {
    return this.queue.length;
  }
}
