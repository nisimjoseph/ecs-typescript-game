/**
 * @module system
 * @description System definitions and scheduling for the ECS.
 * 
 * Following Bevy's system approach:
 * - Systems are functions that operate on the World
 * - Systems are organized into Stages (First, PreUpdate, Update, PostUpdate, Last)
 * - Systems can have run criteria (conditions)
 * - Systems can be labeled for ordering
 * 
 * The Schedule manages system execution order and stage progression.
 * 
 * Interacts with:
 * - World: Systems receive the World to query and modify
 * - Commands: Systems can queue deferred operations
 * - Stage: Systems are assigned to execution stages
 */

import { Stage, STAGE_ORDER, RunCriteria, SystemLabel } from './types';
import { World } from './world';

/**
 * System function signature.
 * Systems receive the World and can query/modify it.
 */
export type SystemFn = (world: World) => void;

/**
 * System configuration.
 */
export interface SystemConfig {
  /** The system function */
  fn: SystemFn;
  /** System label for identification and ordering */
  label?: SystemLabel;
  /** Stage to run in */
  stage: Stage;
  /** Run criteria - system only runs if this returns true */
  runCriteria?: RunCriteria;
  /** Systems this should run before */
  before?: SystemLabel[];
  /** Systems this should run after */
  after?: SystemLabel[];
  /** Is this system enabled? */
  enabled: boolean;
}

/**
 * Builder for configuring a system.
 */
export class SystemDescriptor {
  private config: SystemConfig;

  constructor(fn: SystemFn) {
    this.config = {
      fn,
      stage: Stage.Update,
      enabled: true,
    };
  }

  /**
   * Set the system label.
   */
  label(label: SystemLabel): SystemDescriptor {
    this.config.label = label;
    return this;
  }

  /**
   * Set the stage this system runs in.
   */
  inStage(stage: Stage): SystemDescriptor {
    this.config.stage = stage;
    return this;
  }

  /**
   * Set run criteria - system only runs when criteria returns true.
   */
  runIf(criteria: RunCriteria): SystemDescriptor {
    this.config.runCriteria = criteria;
    return this;
  }

  /**
   * This system should run before another system.
   */
  before(label: SystemLabel): SystemDescriptor {
    this.config.before = this.config.before || [];
    this.config.before.push(label);
    return this;
  }

  /**
   * This system should run after another system.
   */
  after(label: SystemLabel): SystemDescriptor {
    this.config.after = this.config.after || [];
    this.config.after.push(label);
    return this;
  }

  /**
   * Enable or disable the system.
   */
  setEnabled(enabled: boolean): SystemDescriptor {
    this.config.enabled = enabled;
    return this;
  }

  /**
   * Build the final configuration.
   */
  build(): SystemConfig {
    return { ...this.config };
  }
}

/**
 * Schedule manages and runs systems in order.
 * Similar to Bevy's Schedule.
 */
export class Schedule {
  /** Systems organized by stage */
  private stages: Map<Stage, SystemConfig[]> = new Map();

  /** System lookup by label */
  private labeledSystems: Map<SystemLabel, SystemConfig> = new Map();

  constructor() {
    // Initialize empty arrays for each stage
    for (const stage of STAGE_ORDER) {
      this.stages.set(stage, []);
    }
  }

  /**
   * Add a system to the schedule.
   */
  addSystem(descriptor: SystemDescriptor): Schedule {
    const config = descriptor.build();
    const stage = config.stage;
    const systems = this.stages.get(stage)!;

    // Add to stage
    systems.push(config);

    // Register label if present
    if (config.label) {
      this.labeledSystems.set(config.label, config);
    }

    return this;
  }

  /**
   * Add a simple system function to the Update stage.
   */
  addSystemFn(fn: SystemFn): Schedule {
    return this.addSystem(new SystemDescriptor(fn));
  }

  /**
   * Run all systems in order.
   */
  run(world: World): void {
    for (const stage of STAGE_ORDER) {
      this.runStage(stage, world);
    }
  }

  /**
   * Run systems in a specific stage.
   */
  private runStage(stage: Stage, world: World): void {
    const systems = this.stages.get(stage)!;
    const sortedSystems = this.sortSystems(systems);

    for (const system of sortedSystems) {
      this.runSystem(system, world);
    }

    // Apply commands after each stage
    world.applyCommands();
  }

  /**
   * Run a single system.
   */
  private runSystem(system: SystemConfig, world: World): void {
    // Check if enabled
    const isDisabled = !system.enabled;
    if (isDisabled) {
      return;
    }

    // Check run criteria
    if (system.runCriteria) {
      const shouldRun = system.runCriteria(world);
      if (!shouldRun) {
        return;
      }
    }

    // Run the system
    system.fn(world);
  }

  /**
   * Sort systems based on before/after constraints.
   * Uses simple topological sort.
   */
  private sortSystems(systems: SystemConfig[]): SystemConfig[] {
    // For simplicity, we'll use a basic ordering approach
    // A full implementation would use topological sort
    const sorted: SystemConfig[] = [];
    const remaining = [...systems];
    const processed = new Set<SystemConfig>();

    while (remaining.length > 0) {
      let foundSystem = false;

      for (let i = 0; i < remaining.length; i++) {
        const system = remaining[i];
        const canRun = this.canRunNow(system, processed);

        if (canRun) {
          sorted.push(system);
          processed.add(system);
          remaining.splice(i, 1);
          foundSystem = true;
          break;
        }
      }

      // If no system can run, we have a cycle or missing dependency
      // Just add remaining systems in order
      if (!foundSystem) {
        sorted.push(...remaining);
        break;
      }
    }

    return sorted;
  }

  /**
   * Check if a system's "after" dependencies are satisfied.
   */
  private canRunNow(
    system: SystemConfig,
    processed: Set<SystemConfig>
  ): boolean {
    const hasNoAfterDeps = !system.after || system.after.length === 0;
    if (hasNoAfterDeps) {
      return true;
    }

    for (const afterLabel of system.after!) {
      const dependency = this.labeledSystems.get(afterLabel);
      const dependencyNotProcessed = dependency && !processed.has(dependency);
      if (dependencyNotProcessed) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the count of systems.
   */
  systemCount(): number {
    let count = 0;
    for (const systems of this.stages.values()) {
      count += systems.length;
    }
    return count;
  }

  /**
   * Clear all systems.
   */
  clear(): void {
    for (const stage of STAGE_ORDER) {
      this.stages.set(stage, []);
    }
    this.labeledSystems.clear();
  }
}

/**
 * Helper function to create a system descriptor.
 */
export function system(fn: SystemFn): SystemDescriptor {
  return new SystemDescriptor(fn);
}
