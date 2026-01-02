/**
 * @module app
 * @description Main application builder for the ECS.
 * 
 * Following Bevy's App pattern, this module provides:
 * - App: Main application builder
 * - Plugin system for modular features
 * - Game loop management
 * - Startup systems (run once at beginning)
 * 
 * The App is the entry point for creating an ECS application.
 * It manages the World, Schedule, and game loop.
 * 
 * Example:
 *   new App()
 *     .addPlugin(inputPlugin)
 *     .addStartupSystem(spawnPlayer)
 *     .addSystem(movementSystem)
 *     .run();
 * 
 * Interacts with:
 * - World: Creates and manages the World
 * - Schedule: Adds and runs systems
 * - Plugin: Loads plugins to add functionality
 */

import { World } from './world';
import { Schedule, SystemDescriptor, SystemFn, system } from './system';

/**
 * Plugin interface - plugins add functionality to the app.
 */
export interface Plugin {
  /** Build the plugin - add systems, resources, etc. */
  build(app: App): void;
}

/**
 * Main application builder.
 * Similar to Bevy's App struct.
 */
export class App {
  /** The ECS World */
  private world: World;

  /** The main schedule for per-frame systems */
  private schedule: Schedule;

  /** Startup systems - run once at beginning */
  private startupSystems: SystemFn[] = [];

  /** Whether startup systems have run */
  private startupComplete: boolean = false;

  /** Whether the app is running */
  private running: boolean = false;

  /** RequestAnimationFrame ID for cancellation */
  private rafId: number | null = null;

  /** Time of last frame */
  private lastTime: number = 0;

  /** Frame counter */
  private frameCount: number = 0;

  /** Callbacks for each frame */
  private frameCallbacks: ((deltaTime: number) => void)[] = [];

  constructor() {
    this.world = new World();
    this.schedule = new Schedule();
  }

  // ============ Plugin System ============

  /**
   * Add a plugin to the app.
   */
  addPlugin(plugin: Plugin): App {
    plugin.build(this);
    return this;
  }

  /**
   * Add plugins from an array.
   */
  addPlugins(plugins: Plugin[]): App {
    for (const plugin of plugins) {
      this.addPlugin(plugin);
    }
    return this;
  }

  // ============ System Management ============

  /**
   * Add a startup system (runs once at the beginning).
   */
  addStartupSystem(fn: SystemFn): App {
    this.startupSystems.push(fn);
    return this;
  }

  /**
   * Add a system to the schedule.
   */
  addSystem(descriptor: SystemDescriptor | SystemFn): App {
    if (typeof descriptor === 'function') {
      this.schedule.addSystemFn(descriptor);
    } else {
      this.schedule.addSystem(descriptor);
    }
    return this;
  }

  /**
   * Add multiple systems.
   */
  addSystems(descriptors: (SystemDescriptor | SystemFn)[]): App {
    for (const descriptor of descriptors) {
      this.addSystem(descriptor);
    }
    return this;
  }

  // ============ Resource Management ============

  /**
   * Insert a resource into the world.
   */
  insertResource<T extends object>(resource: T): App {
    this.world.insertResource(resource);
    return this;
  }

  // ============ World Access ============

  /**
   * Get the world.
   */
  getWorld(): World {
    return this.world;
  }

  /**
   * Get the schedule.
   */
  getSchedule(): Schedule {
    return this.schedule;
  }

  // ============ Frame Callbacks ============

  /**
   * Add a callback to run each frame.
   */
  onFrame(callback: (deltaTime: number) => void): App {
    this.frameCallbacks.push(callback);
    return this;
  }

  // ============ Game Loop ============

  /**
   * Run startup systems.
   */
  private runStartup(): void {
    if (this.startupComplete) {
      return;
    }

    for (const startupFn of this.startupSystems) {
      startupFn(this.world);
    }

    // Apply any commands from startup
    this.world.applyCommands();

    this.startupComplete = true;
  }

  /**
   * Run a single frame.
   */
  private runFrame(timestamp: number): void {
    // Calculate delta time
    const deltaTime = this.lastTime === 0 ? 16.67 : timestamp - this.lastTime;
    this.lastTime = timestamp;

    // Update time resource if it exists
    const time = this.world.getResource(Time);
    if (time) {
      time.delta = deltaTime / 1000; // Convert to seconds
      time.elapsed += time.delta;
      time.frameCount++;
    }

    // Run frame callbacks
    for (const callback of this.frameCallbacks) {
      callback(deltaTime);
    }

    // Run all systems
    this.schedule.run(this.world);

    this.frameCount++;

    // Schedule next frame
    if (this.running) {
      this.rafId = requestAnimationFrame((t) => this.runFrame(t));
    }
  }

  /**
   * Start the application.
   */
  run(): App {
    // Add default Time resource if not present
    if (!this.world.hasResource(Time)) {
      this.world.insertResource(new Time());
    }

    // Run startup systems
    this.runStartup();

    // Start game loop
    this.running = true;
    this.lastTime = 0;
    this.rafId = requestAnimationFrame((t) => this.runFrame(t));

    return this;
  }

  /**
   * Stop the application.
   */
  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Reset the application.
   */
  reset(): void {
    this.stop();
    this.world.clear();
    this.startupComplete = false;
    this.frameCount = 0;
    this.lastTime = 0;

    // Re-add Time resource
    this.world.insertResource(new Time());

    // Re-run startup
    this.runStartup();

    // Restart
    this.running = true;
    this.rafId = requestAnimationFrame((t) => this.runFrame(t));
  }

  /**
   * Run a single update (for testing or step-by-step execution).
   */
  update(): void {
    if (!this.startupComplete) {
      this.runStartup();
    }
    this.schedule.run(this.world);
  }
}

/**
 * Time resource - provides timing information.
 * Similar to Bevy's Time resource.
 */
export class Time {
  /** Delta time in seconds since last frame */
  delta: number = 0;

  /** Total elapsed time in seconds */
  elapsed: number = 0;

  /** Frame counter */
  frameCount: number = 0;

  /** Get delta time in seconds */
  deltaSeconds(): number {
    return this.delta;
  }

  /** Get elapsed time in seconds */
  elapsedSeconds(): number {
    return this.elapsed;
  }
}
