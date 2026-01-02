/**
 * @module game/logic/event_processing
 * @description Event processing systems - handle game events.
 * 
 * These systems read events and perform actions based on them.
 * 
 * Interacts with:
 * - GameEvents: Reads from event buffers
 * - GameState: Updates score based on events
 * - Logger: Logs event details
 */

import { World, Time, system, Stage } from '../../ecs';
import { GameState, Logger } from '../resources';
import { GameEvents } from '../events';

/**
 * System: Process bullet hit events and update score.
 * DEMONSTRATES: Event reading and processing
 */
export function processEventsSystem(world: World): void {
  const events = world.getResource(GameEvents);
  const gameState = world.getResource(GameState);
  const logger = world.getResource(Logger);

  if (!events) return;

  // Process bullet hit events - add score
  for (const event of events.bulletHit.iter()) {
    if (gameState) {
      gameState.addScore(10);
    }
    if (logger) {
      logger.component(`💥 Bullet hit enemy for ${event.damage} damage`);
    }
  }

  // Process player hit events
  for (const event of events.playerHit.iter()) {
    if (logger) {
      logger.component(`🔥 Player took ${event.damage} damage, health: ${event.playerHealthRemaining}`);
    }
  }

  // Process game over events
  for (const event of events.gameOver.iter()) {
    if (logger) {
      logger.system(`☠️ GAME OVER! Score: ${event.finalScore}`);
    }
  }

  // Process score changed events
  for (const event of events.scoreChanged.iter()) {
    if (logger) {
      logger.component(`⭐ Score: +${event.points} (${event.reason})`);
    }
  }
}

export const processEventsSystemDescriptor = system(processEventsSystem)
  .label('process_events')
  .inStage(Stage.PostUpdate);

/**
 * System: Update event buffers at end of frame.
 * DEMONSTRATES: Event system lifecycle
 */
export function updateEventsSystem(world: World): void {
  const events = world.getResource(GameEvents);
  const time = world.getResource(Time);

  if (events && time) {
    events.updateAll(time.frameCount);
  }
}

export const updateEventsSystemDescriptor = system(updateEventsSystem)
  .label('update_events')
  .inStage(Stage.Last);
