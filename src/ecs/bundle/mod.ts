/**
 * @module bundle
 * @description Bundle system for grouping components together.
 * 
 * Bundles allow spawning entities with multiple components efficiently:
 * - Group related components
 * - Single allocation for all components
 * - Type-safe component grouping
 * 
 * Examples:
 * ```typescript
 * // Define a bundle
 * class TransformBundle implements Bundle {
 *   components() {
 *     return [
 *       new Position(0, 0),
 *       new Rotation(0),
 *       new Scale(1, 1)
 *     ];
 *   }
 * }
 * 
 * // Spawn with bundle
 * commands.spawnBundle(new TransformBundle());
 * ```
 * 
 * Bevy comparison:
 * - Matches bevy_ecs/src/bundle/mod.rs
 * - Simplified (no macro magic needed in TS)
 * - Dynamic component extraction
 * 
 * Interacts with:
 * - Commands: spawn_bundle command
 * - World: insert_bundle on entities
 * - Archetype: Bundles determine archetype
 */

import { ComponentClass } from '../core/types';

/**
 * Bundle interface - groups components together.
 */
export interface Bundle {
  /**
   * Get all components in this bundle.
   */
  components(): object[];
}

/**
 * Bundle info - metadata about a bundle type.
 */
export class BundleInfo {
  /** Component types in this bundle */
  readonly componentTypes: ComponentClass[];

  /** Bundle type name */
  readonly name: string;

  constructor(name: string, componentTypes: ComponentClass[]) {
    this.name = name;
    this.componentTypes = componentTypes;
  }

  /**
   * Get component count.
   */
  componentCount(): number {
    return this.componentTypes.length;
  }

  /**
   * Check if bundle contains component type.
   */
  hasComponent(componentType: ComponentClass): boolean {
    return this.componentTypes.includes(componentType);
  }
}

/**
 * Extract bundle info from bundle instance.
 */
export function extractBundleInfo(bundle: Bundle): BundleInfo {
  const components = bundle.components();
  const componentTypes = components.map((c) => c.constructor as ComponentClass);
  const name = bundle.constructor.name;
  return new BundleInfo(name, componentTypes);
}

/**
 * Type guard for bundles.
 */
export function isBundle(value: unknown): value is Bundle {
  return (
    typeof value === 'object' &&
    value !== null &&
    'components' in value &&
    typeof (value as Bundle).components === 'function'
  );
}

/**
 * Common bundle implementations.
 */

/**
 * Dynamic bundle - create from array of components.
 */
export class DynamicBundle implements Bundle {
  constructor(private _components: object[]) {}

  components(): object[] {
    return this._components;
  }
}

/**
 * Empty bundle - no components.
 */
export class EmptyBundle implements Bundle {
  components(): object[] {
    return [];
  }
}

/**
 * Helper to create a bundle from components.
 */
export function bundle(...components: object[]): Bundle {
  return new DynamicBundle(components);
}

/**
 * Bundle registry - tracks bundle types.
 */
export class BundleRegistry {
  private bundles: Map<string, BundleInfo> = new Map();

  /**
   * Register a bundle type.
   */
  register(bundle: Bundle): BundleInfo {
    const info = extractBundleInfo(bundle);

    if (!this.bundles.has(info.name)) {
      this.bundles.set(info.name, info);
    }

    return this.bundles.get(info.name)!;
  }

  /**
   * Get bundle info by name.
   */
  get(name: string): BundleInfo | undefined {
    return this.bundles.get(name);
  }

  /**
   * Check if bundle type is registered.
   */
  has(name: string): boolean {
    return this.bundles.has(name);
  }

  /**
   * Clear all registrations.
   */
  clear(): void {
    this.bundles.clear();
  }
}

/**
 * Bundle inserter - helper for inserting bundles into entities.
 */
export class BundleInserter {
  /**
   * Insert bundle components into entity.
   * Returns list of components to insert.
   */
  static extract(bundle: Bundle): object[] {
    return bundle.components();
  }

  /**
   * Get component types from bundle.
   */
  static getComponentTypes(bundle: Bundle): ComponentClass[] {
    const components = bundle.components();
    return components.map((c) => c.constructor as ComponentClass);
  }
}

/**
 * Bundle spawner - optimized bulk spawning with bundles.
 */
export class BundleSpawner {
  private registry: BundleRegistry;

  constructor(registry: BundleRegistry) {
    this.registry = registry;
  }

  /**
   * Prepare to spawn multiple entities with same bundle.
   */
  prepare(bundle: Bundle): BundleInfo {
    return this.registry.register(bundle);
  }

  /**
   * Spawn entity with bundle.
   */
  spawn(bundle: Bundle): { components: object[]; info: BundleInfo } {
    const info = this.prepare(bundle);
    const components = bundle.components();
    return { components, info };
  }

  /**
   * Spawn multiple entities with same bundle type.
   * More efficient than spawning individually.
   */
  spawnBatch(bundles: Bundle[]): Array<{ components: object[]; info: BundleInfo }> {
    return bundles.map((bundle) => this.spawn(bundle));
  }
}

/**
 * Pre-defined common bundles.
 */

/**
 * Example: Transform bundle for 2D transforms.
 */
export class TransformBundle implements Bundle {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public rotation: number = 0,
    public scaleX: number = 1,
    public scaleY: number = 1
  ) {}

  components(): object[] {
    return [
      { x: this.x, y: this.y },  // Position-like
      { rotation: this.rotation },  // Rotation-like
      { scaleX: this.scaleX, scaleY: this.scaleY },  // Scale-like
    ];
  }
}
