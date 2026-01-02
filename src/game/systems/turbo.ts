/**
 * @module game/systems/turbo
 * @description Turbo system - handles turbo activation and drain.
 * 
 * Manages player turbo power, activation, draining, and recharging.
 * 
 * Interacts with:
 * - Turbo component: Updates turbo state
 * - Input resource: Reads 't' key for activation
 */

import { World, Time } from '../../ecs';
import { Position, Turbo, Player } from '../components';
import { Input, Logger, GameState } from '../resources';

/**
 * Turbo system - handles turbo activation and drain.
 * - Press 't' to activate turbo (150% speed boost)
 * - Release 't' to deactivate and recharge
 * - Turbo lasts up to 2 seconds, recharges at 0.1 sec per second
 */
export function turboSystem(world: World): void {
  const input = world.getResource(Input);
  const time = world.getResource(Time);
  const logger = world.getResource(Logger);
  const gameState = world.getResource(GameState);
  
  if (!input || !time) return;
  if (gameState?.isGameOver) return;

  // Query player with turbo
  const playerQuery = world.query(Position, Turbo, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) return;

  const [, , turbo] = playerResult;

  // Check T key for turbo activation
  const wantsTurbo = input.isPressed('t');

  if (wantsTurbo) {
    // Try to activate or keep active
    if (!turbo.isActive) {
      const activated = turbo.activate();
      if (activated && logger) {
        logger.system('🚀 Turbo activated!');
      }
    }
    // Drain turbo while active
    if (turbo.isActive) {
      const stillActive = turbo.drain(time.delta);
      if (!stillActive && logger) {
        logger.system('🚀 Turbo depleted!');
      }
    }
  } else {
    // Deactivate and recharge
    if (turbo.isActive) {
      turbo.deactivate();
      if (logger) {
        logger.system('🚀 Turbo deactivated, recharging...');
      }
    }
    turbo.recharge(time.delta);
  }
}
