/**
 * @module game/systems/collision
 * @description Collision systems - detect and handle collisions.
 * 
 * These systems check for collisions between entities and apply effects.
 * 
 * Interacts with:
 * - Collider component: Defines collision boundaries
 * - Health, Damage components: Apply damage on collision
 * - Shield component: Block damage when active
 */

import { World } from '../../ecs';
import {
  Position,
  Velocity,
  Size,
  Collider,
  Health,
  Damage,
  Lifetime,
  Bullet,
  Enemy,
  Player,
  PowerUp,
  Shield,
  Sprite,
  Explosion,
} from '../components';
import { GameState, GameConfig, Logger } from '../resources';

/**
 * Check collision between two circular colliders.
 */
function checkCollision(
  pos1: Position,
  col1: Collider,
  pos2: Position,
  col2: Collider
): boolean {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const combinedRadius = col1.radius + col2.radius;
  return distance < combinedRadius;
}

/**
 * Bullet vs Enemy collision.
 */
export function bulletEnemyCollisionSystem(world: World): void {
  const gameState = world.getResource(GameState);
  const logger = world.getResource(Logger);
  const commands = world.getCommands();

  const bulletQuery = world.query(Position, Collider, Damage, Bullet);
  const enemyQuery = world.query(Position, Collider, Health, Enemy);

  const bullets = bulletQuery.toArray();
  const enemies = enemyQuery.toArray();
  
  // Debug: Always log to console when checking collision
  if (bullets.length > 0 && enemies.length > 0) {
    console.log(`Collision check: ${bullets.length} bullets vs ${enemies.length} enemies`);
  }

  for (const [bulletEntity, bulletPos, bulletCol, bulletDmg] of bullets) {
    for (const [enemyEntity, enemyPos, enemyCol, enemyHealth] of enemies) {
      const dx = bulletPos.x - enemyPos.x;
      const dy = bulletPos.y - enemyPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const combinedRadius = bulletCol.radius + enemyCol.radius;
      
      // Log distance for debugging
      if (distance < 100) {
        console.log(`Close! dist=${distance.toFixed(1)} needed<${combinedRadius}`);
      }
      
      const hasCollision = distance < combinedRadius;
      if (!hasCollision) continue;
      
      if (logger) {
        logger.entity(`💥 HIT! Distance: ${distance.toFixed(1)} < ${combinedRadius}`);
      }

      // Apply damage
      enemyHealth.takeDamage(bulletDmg.amount);

      // Despawn bullet
      commands.despawn(bulletEntity);

      // Check if enemy died
      const enemyIsDead = enemyHealth.isDead();
      if (enemyIsDead) {
        commands.despawn(enemyEntity);
        if (gameState) {
          gameState.addScore(100);
          gameState.recordEnemyKill();
        }
        if (logger) {
          logger.entity('Enemy destroyed! +100 points');
        }
      }

      break; // Bullet can only hit one enemy
    }
  }
}

/**
 * Player vs Enemy collision.
 */
export function playerEnemyCollisionSystem(world: World): void {
  const gameState = world.getResource(GameState);
  const config = world.getResource(GameConfig);
  const logger = world.getResource(Logger);
  const commands = world.getCommands();

  // Skip if game is already over
  if (gameState?.isGameOver) return;

  const playerQuery = world.query(Position, Collider, Health, Player);
  const enemyQuery = world.query(Position, Collider, Enemy);

  const playerResult = playerQuery.single();
  if (!playerResult) return;

  const [playerEntity, playerPos, playerCol, playerHealth] = playerResult;

  // Check if player has active shield
  const shieldResult = world.query(Shield, Player).single();
  const playerShield = shieldResult ? shieldResult[1] : null;
  const shieldIsActive = playerShield?.isActive === true;

  for (const [, enemyPos, enemyCol] of enemyQuery.iter()) {
    const hasCollision = checkCollision(playerPos, playerCol, enemyPos, enemyCol);
    if (!hasCollision) continue;

    // If shield is active, block the damage
    if (shieldIsActive) {
      if (logger) {
        logger.component('🛡️ Shield blocked enemy attack!');
      }
      continue; // Shield blocks, no damage taken
    }

    // Player takes scaled damage (enemies get stronger every 10 kills)
    const baseDamage = 10;
    const scaledDamage = gameState ? gameState.getScaledDamage(baseDamage) : baseDamage;
    playerHealth.takeDamage(scaledDamage);

    if (logger) {
      logger.component(`Player hit! Health: ${playerHealth.current}`);
    }

    // AUTO-SPAWN POWER-UP when player is hurt (at random distant position)
    if (config) {
      const powerUpX = Math.random() * (config.canvasWidth - 80) + 40;
      const powerUpY = Math.random() * (config.canvasHeight - 80) + 40;
      
      commands
        .spawn()
        .insert(new Position(powerUpX, powerUpY))
        .insert(new Velocity(0, 0))
        .insert(new Size(20, 20))
        .insert(new Sprite('#00d9ff', 'circle'))
        .insert(new PowerUp())
        .insert(new Health(25, 25)) // Heals 25 HP
        .insert(new Collider(12, 'powerup'))
        .insert(new Lifetime(15)); // 15 seconds before relocating
      
      if (logger) {
        logger.entity(`⭐ Power-up spawned to help player!`);
      }
    }

    // Check game over
    const playerIsDead = playerHealth.isDead();
    if (playerIsDead && gameState) {
      gameState.isGameOver = true;
      
      // Spawn explosion at player position
      commands
        .spawn()
        .insert(new Position(playerPos.x, playerPos.y))
        .insert(new Explosion(120, 1.0, '#00ff88')); // Green explosion for player
      
      // Despawn player
      commands.despawn(playerEntity);
      
      if (logger) {
        logger.system('💥 GAME OVER! Press Reset to play again.');
      }
    }

    break; // Only one collision per frame
  }
}

/**
 * Player vs PowerUp collision.
 */
export function playerPowerUpCollisionSystem(world: World): void {
  const gameState = world.getResource(GameState);
  const logger = world.getResource(Logger);
  const commands = world.getCommands();

  const playerQuery = world.query(Position, Collider, Health, Player);
  const powerUpQuery = world.query(Position, Collider, PowerUp);

  const playerResult = playerQuery.single();
  if (!playerResult) return;

  const [, playerPos, playerCol, playerHealth] = playerResult;

  for (const [powerUpEntity, powerUpPos, powerUpCol] of powerUpQuery.iter()) {
    const hasCollision = checkCollision(playerPos, playerCol, powerUpPos, powerUpCol);
    if (!hasCollision) continue;

    // Heal player
    playerHealth.heal(25);

    // Despawn power-up
    commands.despawn(powerUpEntity);

    if (gameState) {
      gameState.addScore(50);
      gameState.powerUpsCollected++;
    }

    if (logger) {
      logger.entity(`Power-up collected! +25 HP, +50 points`);
    }
  }
}
