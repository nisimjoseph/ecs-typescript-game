/**
 * @module event
 * @description Event system for decoupled communication between systems.
 * 
 * Events provide a way for systems to communicate without direct dependencies:
 * - EventWriter: Sends events
 * - EventReader: Receives events
 * - Double-buffered: Events cleared after all systems read them
 * 
 * Examples:
 * ```typescript
 * // Define event
 * class CollisionEvent {
 *   constructor(public entityA: Entity, public entityB: Entity) {}
 * }
 * 
 * // System that writes events
 * function collisionSystem(world: World) {
 *   const events = world.getResource(Events<CollisionEvent>);
 *   events.send(new CollisionEvent(e1, e2));
 * }
 * 
 * // System that reads events
 * function damageSystem(world: World) {
 *   const events = world.getResource(Events<CollisionEvent>);
 *   for (const event of events.iter()) {
 *     // Handle collision
 *   }
 * }
 * ```
 * 
 * Bevy comparison:
 * - Matches bevy_ecs/src/event/mod.rs
 * - Double-buffered event queue
 * - Automatic cleanup
 * 
 * Interacts with:
 * - World: Events stored as resources
 * - Systems: Read/write events
 * - Commands: Can send events via commands
 */

import { ComponentClass } from '../core/types';

/**
 * Event ID for ordering.
 */
export type EventId = number;

/**
 * Event instance with metadata.
 */
export interface EventInstance<T> {
  /** Unique event ID */
  id: EventId;
  /** Event data */
  event: T;
  /** Tick when event was sent */
  tick: number;
}

/**
 * Events resource - double-buffered event queue.
 * 
 * Double-buffering ensures:
 * - Events sent this frame are readable next frame
 * - Events from last frame are available until all readers finish
 * - No race conditions between readers and writers
 */
export class Events<T> {
  /** Current event buffer (being written to) */
  private current: EventInstance<T>[] = [];

  /** Previous event buffer (being read from) */
  private previous: EventInstance<T>[] = [];

  /** Next event ID */
  private nextId: EventId = 0;

  /** Current tick */
  private currentTick: number = 0;

  /**
   * Send an event.
   */
  send(event: T): EventId {
    const id = this.nextId++;
    this.current.push({
      id,
      event,
      tick: this.currentTick,
    });
    return id;
  }

  /**
   * Send multiple events.
   */
  sendBatch(events: T[]): void {
    for (const event of events) {
      this.send(event);
    }
  }

  /**
   * Get iterator over events from previous frame.
   */
  *iter(): IterableIterator<T> {
    for (const instance of this.previous) {
      yield instance.event;
    }
  }

  /**
   * Get iterator with event IDs.
   */
  *iterWithId(): IterableIterator<[EventId, T]> {
    for (const instance of this.previous) {
      yield [instance.id, instance.event];
    }
  }

  /**
   * Get all events as array.
   */
  drain(): T[] {
    return this.previous.map((instance) => instance.event);
  }

  /**
   * Check if any events are available.
   */
  isEmpty(): boolean {
    return this.previous.length === 0;
  }

  /**
   * Get number of events.
   */
  len(): number {
    return this.previous.length;
  }

  /**
   * Clear all events immediately (both buffers).
   */
  clear(): void {
    this.current = [];
    this.previous = [];
  }

  /**
   * Update - swap buffers and clear old events.
   * Called automatically by the event update system.
   */
  update(tick: number): void {
    this.currentTick = tick;
    
    // Swap buffers
    this.previous = this.current;
    this.current = [];
  }

  /**
   * Get events from current frame (for testing/debugging).
   */
  getCurrentEvents(): T[] {
    return this.current.map((instance) => instance.event);
  }
}

/**
 * Event reader - tracks which events have been read.
 * Allows multiple systems to read the same events.
 */
export class EventReader<T> {
  /** Last event ID that was read */
  private lastSeen: EventId = -1;

  /**
   * Read new events since last read.
   */
  *iter(events: Events<T>): IterableIterator<T> {
    for (const [id, event] of events.iterWithId()) {
      if (id > this.lastSeen) {
        this.lastSeen = id;
        yield event;
      }
    }
  }

  /**
   * Peek at events without marking as read.
   */
  *peek(events: Events<T>): IterableIterator<T> {
    for (const [id, event] of events.iterWithId()) {
      if (id > this.lastSeen) {
        yield event;
      }
    }
  }

  /**
   * Check if there are unread events.
   */
  hasUnread(events: Events<T>): boolean {
    for (const [id] of events.iterWithId()) {
      if (id > this.lastSeen) {
        return true;
      }
    }
    return false;
  }

  /**
   * Clear read state.
   */
  clear(): void {
    this.lastSeen = -1;
  }
}

/**
 * Event writer - sends events.
 * Just a wrapper around Events<T> for symmetry with EventReader.
 */
export class EventWriter<T> {
  private events: Events<T>;

  constructor(events: Events<T>) {
    this.events = events;
  }

  /**
   * Send an event.
   */
  send(event: T): EventId {
    return this.events.send(event);
  }

  /**
   * Send multiple events.
   */
  sendBatch(events: T[]): void {
    this.events.sendBatch(events);
  }
}

/**
 * Event registry - manages event resources.
 */
export class EventRegistry {
  private events: Map<string, Events<unknown>> = new Map();

  /**
   * Register an event type.
   */
  register<T>(eventClass: ComponentClass<T>): Events<T> {
    const name = eventClass.name;
    
    if (!this.events.has(name)) {
      this.events.set(name, new Events<T>());
    }

    return this.events.get(name) as Events<T>;
  }

  /**
   * Get events for type.
   */
  get<T>(eventClass: ComponentClass<T>): Events<T> | undefined {
    return this.events.get(eventClass.name) as Events<T> | undefined;
  }

  /**
   * Update all event buffers.
   */
  updateAll(tick: number): void {
    for (const events of this.events.values()) {
      events.update(tick);
    }
  }

  /**
   * Clear all events.
   */
  clearAll(): void {
    for (const events of this.events.values()) {
      events.clear();
    }
  }
}

/**
 * System that updates all events (swap buffers).
 * Should run at the end of each frame.
 */
export function updateEventsSystem(registry: EventRegistry, tick: number): void {
  registry.updateAll(tick);
}

/**
 * Helper to add event type to world.
 */
export function addEvent<T>(
  world: { insertResource(resource: object): void },
  eventClass: ComponentClass<T>
): void {
  world.insertResource(new Events<T>());
}
