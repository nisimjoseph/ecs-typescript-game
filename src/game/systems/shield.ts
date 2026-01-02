/**
 * @module game/systems/shield
 * @description Shield system - handles shield activation and charging.
 * 
 * Manages player shield power, activation, draining, and recharging.
 * 
 * Interacts with:
 * - Shield component: Updates shield state
 * - Input resource: Reads 'y' key for activation
 */

import { World, Time } from '../../ecs';
import { Position, Shield, Player } from '../components';
import { Input, Logger, GameState } from '../resources';

/**
 * Handle player shield activation and charging.
 * - Press Y: Activate shield (drains power)
 * - Release Y: Deactivate shield (starts recharging)
 * - Shield lasts up to 2 seconds, recharges at 0.1 sec per second
 */
export function shieldSystem(world: World): void {
  const input = world.getResource(Input);
  const time = world.getResource(Time);
  const logger = world.getResource(Logger);
  const gameState = world.getResource(GameState);
  
  if (!input || !time) return;
  if (gameState?.isGameOver) return;

  // Query player with shield
  const playerQuery = world.query(Position, Shield, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) return;

  const [, , shield] = playerResult;

  // Check Y key for shield activation
  const wantsShield = input.isPressed('y');

  if (wantsShield) {
    // Try to activate or keep active
    if (!shield.isActive) {
      const activated = shield.activate();
      if (activated && logger) {
        logger.system('🛡️ Shield activated!');
      }
    }
    // Drain shield while active
    if (shield.isActive) {
      const stillActive = shield.drain(time.delta);
      if (!stillActive && logger) {
        logger.system('🛡️ Shield depleted!');
      }
    }
  } else {
    // Deactivate and recharge
    if (shield.isActive) {
      shield.deactivate();
      if (logger) {
        logger.system('🛡️ Shield deactivated, recharging...');
      }
    }
    shield.recharge(time.delta);
  }
}
