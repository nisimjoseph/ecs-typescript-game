/**
 * @module game/systems
 * @description Game systems that implement game logic.
 * 
 * Systems are functions that process entities with specific components.
 * Following Bevy's pattern, each system:
 * - Queries entities with needed components
 * - Processes them based on game logic
 * - May spawn/despawn entities via Commands
 * 
 * This module re-exports all systems and their descriptors.
 */

// System functions
export * from './input';
export * from './shield';
export * from './turbo';
export * from './bomb';
export * from './movement';
export * from './ai';
export * from './lifetime';
export * from './explosion';
export * from './collision';
export * from './difficulty';
export * from './spawning';
export * from './render';
export * from './ui';

// System descriptors
export * from './descriptors';
