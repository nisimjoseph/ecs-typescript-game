/**
 * @module game/systems/lifetime
 * @description Lifetime system - despawn entities after time expires.
 * 
 * Handles entity lifecycle and power-up relocation.
 * 
 * Interacts with:
 * - Lifetime component: Tracks remaining time
 * - PowerUp component: Relocates instead of despawning
 */

import { World, Time } from '../../ecs';
import { Lifetime, PowerUp, Position } from '../components';
import { GameConfig, Logger } from '../resources';

/**
 * Despawn entities whose lifetime has expired.
 * Power-ups are relocated instead of despawned.
 */
export function lifetimeSystem(world: World): void {
  const time = world.getResource(Time);
  const config = world.getResource(GameConfig);
  const logger = world.getResource(Logger);
  if (!time) return;

  const query = world.query(Lifetime);
  const commands = world.getCommands();

  for (const [entity, lifetime] of query.iter()) {
    lifetime.remaining -= time.delta;
    const hasExpired = lifetime.remaining <= 0;
    if (hasExpired) {
      // Check if this is a power-up - relocate instead of despawn
      const isPowerUp = world.getComponent(entity, PowerUp) !== undefined;
      
      if (isPowerUp && config) {
        // Relocate power-up to new random position
        const position = world.getComponent(entity, Position);
        if (position) {
          position.x = Math.random() * (config.canvasWidth - 60) + 30;
          position.y = Math.random() * (config.canvasHeight - 60) + 30;
          lifetime.remaining = 15; // Reset timer for another 15 seconds
          
          if (logger) {
            logger.entity('⭐ Power-up relocated to new position');
          }
        }
      } else {
        commands.despawn(entity);
      }
    }
  }
}
