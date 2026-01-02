/**
 * @module game/systems/difficulty
 * @description Difficulty progression system.
 * 
 * Increases game difficulty over time by raising max enemy count.
 * 
 * Interacts with:
 * - GameState resource: Updates difficulty level
 */

import { World, Time } from '../../ecs';
import { GameState, Logger } from '../resources';

/**
 * Increase difficulty over time.
 * Every 30 seconds, increases max enemy count by 1.
 */
export function difficultyProgressionSystem(world: World): void {
  const time = world.getResource(Time);
  const gameState = world.getResource(GameState);
  const logger = world.getResource(Logger);
  
  if (!time || !gameState) return;
  if (gameState.isGameOver) return;

  const difficultyIncreased = gameState.updateDifficulty(time.delta);
  
  if (difficultyIncreased && logger) {
    const newMaxEnemies = gameState.getMaxEnemies();
    logger.system(`⚠️ Difficulty increased! Max enemies: ${newMaxEnemies}`);
  }
}
