/**
 * @module game/logic/ui_handlers
 * @description UI button handlers for game controls.
 * 
 * Sets up click handlers for game UI buttons.
 * 
 * Interacts with:
 * - Bundle spawning functions: Spawns entities on button click
 * - Game reset: Reinitializes game state
 */

import { App, World, ObserverRegistry } from '../../ecs';
import { Player } from '../components';
import {
  GameConfig,
  GameState,
  CanvasContext,
  Logger,
  SpawnTimer,
  ShootCooldown,
  BossSpawnTimer,
  Input,
} from '../resources';
import { PlayerBundle } from '../bundles';
import { GameEvents, GameStartEvent } from '../events';
import { setupObservers, triggerSpawnObserver } from '../observers';
import {
  shootBulletWithBundle,
  spawnEnemyWithBundle,
  spawnPowerUpWithBundle,
} from './bundle_spawning';
import { spawnBossWithBundle } from './boss';

/**
 * Set up UI button handlers using bundle-based spawning.
 * NOTE: All buttons blur after click to prevent SPACE key from
 * triggering both shooting AND clicking the focused button.
 */
export function setupButtonHandlers(app: App, canvas: HTMLCanvasElement): void {
  const world = app.getWorld();

  // Helper to blur button after click (prevents SPACE from re-triggering)
  const blurAfterClick = (btn: HTMLElement) => {
    btn.blur();
  };

  // Shoot button - uses bundle
  const shootBtn = document.getElementById('btn-shoot');
  if (shootBtn) {
    shootBtn.addEventListener('click', (e) => {
      const gameState = world.getResource(GameState);
      if (gameState?.isGameOver) return;
      shootBulletWithBundle(world);
      world.applyCommands();
      blurAfterClick(e.target as HTMLElement);
    });
  }

  // Spawn Enemy button - uses bundle
  const spawnEnemyBtn = document.getElementById('btn-spawn-enemy');
  if (spawnEnemyBtn) {
    spawnEnemyBtn.addEventListener('click', (e) => {
      spawnEnemyWithBundle(world);
      world.applyCommands();
      blurAfterClick(e.target as HTMLElement);
    });
  }

  // Spawn Power-up button - uses bundle
  const spawnPowerUpBtn = document.getElementById('btn-spawn-powerup');
  if (spawnPowerUpBtn) {
    spawnPowerUpBtn.addEventListener('click', (e) => {
      spawnPowerUpWithBundle(world);
      world.applyCommands();
      blurAfterClick(e.target as HTMLElement);
    });
  }

  // Spawn Boss button - manually spawn boss (only if none exists)
  const spawnBossBtn = document.getElementById('btn-spawn-boss');
  if (spawnBossBtn) {
    spawnBossBtn.addEventListener('click', (e) => {
      spawnBossWithBundle(world);
      world.applyCommands();
      blurAfterClick(e.target as HTMLElement);
    });
  }

  // Reset Game button
  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      blurAfterClick(e.target as HTMLElement);
      resetGame(app, world, canvas);
    });
  }
}

/**
 * Reset the game to initial state.
 */
function resetGame(app: App, world: World, canvas: HTMLCanvasElement): void {
  // Stop and clear everything
  app.reset();

  const config = new GameConfig(canvas.width, canvas.height);
  const gameState = new GameState();
  const events = new GameEvents();
  const registry = new ObserverRegistry();
  const logger = new Logger();

  // Re-add all resources
  world.insertResource(config);
  world.insertResource(gameState);
  world.insertResource(new Input());
  world.insertResource(new CanvasContext(canvas));
  world.insertResource(logger);
  world.insertResource(new SpawnTimer(2));
  world.insertResource(new ShootCooldown(0.15));
  world.insertResource(new BossSpawnTimer(15)); // Boss spawn timer
  world.insertResource(events);
  world.insertResource(registry);

  // Setup observers
  setupObservers(registry, logger, gameState, events);

  // Respawn player using bundle
  const playerBundle = new PlayerBundle(
    config.canvasWidth / 2,
    config.canvasHeight / 2,
    100
  );

  const builder = world.spawn();
  for (const component of playerBundle.components()) {
    builder.insert(component);
  }
  const playerEntity = builder.id();

  // Trigger observer and send events
  triggerSpawnObserver(registry, playerEntity, Player, new Player());
  events.gameStart.send(new GameStartEvent(true));

  if (logger) {
    logger.system('🔄 Game restarted with bundles!');
  }
}
