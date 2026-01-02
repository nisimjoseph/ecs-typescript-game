/**
 * @module game/systems/explosion
 * @description Explosion system - update and render explosion effects.
 * 
 * Handles visual explosion effects that expand and fade over time.
 * 
 * Interacts with:
 * - Explosion component: Updates explosion state
 */

import { World, Time } from '../../ecs';
import { Position, Explosion } from '../components';

/**
 * Update and despawn explosion effects.
 */
export function explosionSystem(world: World): void {
  const time = world.getResource(Time);
  if (!time) return;

  const query = world.query(Position, Explosion);
  const commands = world.getCommands();

  for (const [entity, pos, explosion] of query.iter()) {
    explosion.elapsed += time.delta;
    
    // Expand explosion
    const progress = explosion.elapsed / explosion.duration;
    explosion.currentRadius = explosion.maxRadius * Math.sin(progress * Math.PI);
    
    // Update particles
    for (const particle of explosion.particles) {
      particle.x += particle.vx * time.delta;
      particle.y += particle.vy * time.delta;
      // Slow down particles
      particle.vx *= 0.95;
      particle.vy *= 0.95;
    }
    
    // Despawn when finished
    if (explosion.elapsed >= explosion.duration) {
      commands.despawn(entity);
    }
  }
}
