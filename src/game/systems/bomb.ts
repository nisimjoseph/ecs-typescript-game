/**
 * @module game/systems/bomb
 * @description Bomb system - area-of-effect attack that consumes Shield and Turbo.
 * 
 * The bomb is available only when both Shield and Turbo are fully charged.
 * When activated with 'b' key:
 * - Drains both Shield and Turbo to 0
 * - Destroys all enemies within 100px radius
 * - Deals 50% damage to enemies within 100-200px radius
 * - Creates explosion effect
 * 
 * Interacts with:
 * - Shield/Turbo components: Checks if full, drains on use
 * - Enemy entities: Applies damage based on distance
 * - Explosion component: Creates visual effect
 */

import { World, Time } from '../../ecs';
import { Position, Health, Shield, Turbo, Player, Enemy, Explosion } from '../components';
import { Input, Logger, GameState, GameConfig } from '../resources';

/** Inner radius - instant kill zone */
const BOMB_INNER_RADIUS = 100;

/** Outer radius - 50% damage zone */
const BOMB_OUTER_RADIUS = 150;

/**
 * Check if bomb is available (both Shield and Turbo fully charged).
 */
export function isBombAvailable(shield: Shield, turbo: Turbo): boolean {
  const shieldFull = shield.current >= shield.maxPower;
  const turboFull = turbo.current >= turbo.maxPower;
  return shieldFull && turboFull;
}

/**
 * Get bomb radii for rendering.
 */
export function getBombRadii(): { inner: number; outer: number } {
  return { inner: BOMB_INNER_RADIUS, outer: BOMB_OUTER_RADIUS };
}

/**
 * Handle bomb activation and damage application.
 * - Press B: Detonate bomb if available
 * - Inner zone (0-100px): Instant kill
 * - Outer zone (100-200px): 50% damage
 */
export function bombSystem(world: World): void {
  const input = world.getResource(Input);
  const time = world.getResource(Time);
  const logger = world.getResource(Logger);
  const gameState = world.getResource(GameState);
  const commands = world.getCommands();

  if (!input || !time) return;
  if (gameState?.isGameOver) return;

  // Query player with shield and turbo
  const playerQuery = world.query(Position, Shield, Turbo, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) return;

  const [playerEntity, playerPos, shield, turbo] = playerResult;

  // Check B key for bomb activation (only on key down, not hold)
  const wantsBomb = input.isJustPressed('b');

  if (wantsBomb) {
    // Check if bomb is available
    const bombAvailable = isBombAvailable(shield, turbo);

    if (!bombAvailable) {
      if (logger) {
        logger.system('💣 Bomb not ready! Need full Shield and Turbo.');
      }
      return;
    }

    // Drain both Shield and Turbo to 0
    shield.current = 0;
    shield.isActive = false;
    turbo.current = 0;
    turbo.isActive = false;

    if (logger) {
      logger.system('💣 BOMB DETONATED! Shield and Turbo depleted.');
    }

    // Create bomb explosion effect (larger, multi-ring)
    commands
      .spawn()
      .insert(new Position(playerPos.x, playerPos.y))
      .insert(new Explosion(BOMB_OUTER_RADIUS, 0.5, '#ff8800'));

    // Also create inner explosion ring
    commands
      .spawn()
      .insert(new Position(playerPos.x, playerPos.y))
      .insert(new Explosion(BOMB_INNER_RADIUS, 0.5, '#ffff00'));

    // Query all enemies and apply damage based on distance
    const enemyQuery = world.query(Position, Health, Enemy);

    for (const [enemyEntity, enemyPos, enemyHealth] of enemyQuery.iter()) {
      const dx = enemyPos.x - playerPos.x;
      const dy = enemyPos.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Inner zone: instant kill
      if (distance <= BOMB_INNER_RADIUS) {
        // Kill enemy
        enemyHealth.current = 0;

        // Spawn explosion
        commands
          .spawn()
          .insert(new Position(enemyPos.x, enemyPos.y))
          .insert(new Explosion(50, 0.4, '#ff4466'));

        commands.despawn(enemyEntity);

        // Update score
        if (gameState) {
          gameState.addScore(100);
          gameState.recordEnemyKill();
        }

        if (logger) {
          logger.component(`💥 Enemy destroyed by bomb (inner zone)`);
        }
      }
      // Outer zone: 50% damage
      else if (distance <= BOMB_OUTER_RADIUS) {
        const halfHealth = enemyHealth.max * 0.5;
        
        // If enemy has less than 50% health, kill it
        if (enemyHealth.current <= halfHealth) {
          enemyHealth.current = 0;

          commands
            .spawn()
            .insert(new Position(enemyPos.x, enemyPos.y))
            .insert(new Explosion(40, 0.4, '#ff6644'));

          commands.despawn(enemyEntity);

          if (gameState) {
            gameState.addScore(100);
            gameState.recordEnemyKill();
          }

          if (logger) {
            logger.component(`💥 Enemy destroyed by bomb (outer zone, low health)`);
          }
        } else {
          // Deal 50% max health damage
          enemyHealth.takeDamage(halfHealth);

          if (logger) {
            logger.component(`💥 Enemy damaged by bomb (outer zone, -50% HP)`);
          }
        }
      }
    }
  }
}
