/**
 * @module game/logic/collision_events
 * @description Enhanced collision system with event sending and sound effects.
 * 
 * Combines collision detection with the event system for decoupled communication.
 * Also triggers appropriate sound effects for collisions.
 * 
 * Interacts with:
 * - Collision detection: Checks entity overlaps
 * - GameEvents: Sends collision, damage, score events
 * - Observer system: Triggers entity lifecycle hooks
 * - SoundManager: Plays explosion, hit, power-up sounds
 */

import { World, ObserverRegistry, system, Stage } from '../../ecs';
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
  Boss,
} from '../components';
import { GameConfig, GameState, SoundManager } from '../resources';
import {
  GameEvents,
  BulletHitEvent,
  PlayerHitEvent,
  ScoreChangedEvent,
  GameOverEvent,
} from '../events';
import { triggerDespawnObserver, triggerChangeObserver } from '../observers';

/**
 * Enhanced collision system that sends events.
 * DEMONSTRATES: Collision detection + Event sending
 */
export function collisionWithEventsSystem(world: World): void {
  const events = world.getResource(GameEvents);
  const gameState = world.getResource(GameState);
  const registry = world.getResource(ObserverRegistry);
  const soundManager = world.getResource(SoundManager);
  const commands = world.getCommands();

  if (!events || gameState?.isGameOver) return;

  // Bullet-Enemy collisions
  const bulletQuery = world.query(Position, Collider, Damage, Bullet);
  const enemyQuery = world.query(Position, Collider, Health, Enemy);

  const bullets = bulletQuery.toArray();
  const enemies = enemyQuery.toArray();

  for (const [bulletEntity, bulletPos, bulletCol, bulletDmg] of bullets) {
    for (const [enemyEntity, enemyPos, enemyCol, enemyHealth] of enemies) {
      const dx = bulletPos.x - enemyPos.x;
      const dy = bulletPos.y - enemyPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const collisionRadius = bulletCol.radius + enemyCol.radius;

      if (distance < collisionRadius) {
        // Apply damage
        const oldHealth = enemyHealth.current;
        enemyHealth.takeDamage(bulletDmg.amount);

        // Send bullet hit event
        events.bulletHit.send(new BulletHitEvent(
          bulletEntity,
          enemyEntity,
          bulletDmg.amount,
          { x: enemyPos.x, y: enemyPos.y }
        ));

        // Despawn bullet
        commands.despawn(bulletEntity);

        // Check if enemy died
        if (enemyHealth.isDead()) {
          // Check if this enemy is a boss
          const isBoss = world.hasComponent(enemyEntity, Boss);
          
          // Play appropriate explosion sound
          if (soundManager) {
            if (isBoss) {
              soundManager.playBossExplosion();
            } else {
              soundManager.playEnemyExplosion();
            }
          }

          // Trigger remove observer
          if (registry) {
            triggerDespawnObserver(registry, enemyEntity, Enemy);
          }

          // Send score event
          events.scoreChanged.send(new ScoreChangedEvent(
            100,
            (gameState?.score || 0) + 100,
            'enemy_killed'
          ));

          // Add score
          if (gameState) {
            gameState.addScore(100);
            gameState.recordEnemyKill();
          }

          // Spawn explosion using bundle concept
          commands
            .spawn()
            .insert(new Position(enemyPos.x, enemyPos.y))
            .insert(new Explosion(50, 0.5, '#ff4466'));

          // Despawn enemy
          commands.despawn(enemyEntity);
        }

        break;
      }
    }
  }

  // Player-Enemy collisions
  const playerQuery = world.query(Position, Collider, Health, Player);
  const playerResult = playerQuery.single();

  // Check if player has active shield
  const shieldQuery = world.query(Shield, Player);
  const shieldResult = shieldQuery.single();
  const playerShield = shieldResult ? shieldResult[1] : null;
  const shieldIsActive = playerShield?.isActive === true;

  if (playerResult) {
    const [playerEntity, playerPos, playerCol, playerHealth] = playerResult;

    for (const [enemyEntity, enemyPos, enemyCol, _, enemyComp] of enemies) {
      // Get enemy damage
      const enemyDamageQuery = world.query(Damage, Enemy);
      const enemyDmg = enemyDamageQuery.toArray().find(
        ([e]) => e.id === enemyEntity.id
      );

      const dx = playerPos.x - enemyPos.x;
      const dy = playerPos.y - enemyPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const collisionRadius = playerCol.radius + enemyCol.radius;

      if (distance < collisionRadius) {
        // If shield is active, block the damage
        if (shieldIsActive) {
          continue; // Shield blocks, skip damage
        }

        const baseDamage = enemyDmg ? enemyDmg[1].amount : 20;
        const damageAmount = gameState ? gameState.getScaledDamage(baseDamage) : baseDamage;
        playerHealth.takeDamage(damageAmount);

        // Play player hit sound
        if (soundManager) {
          soundManager.playPlayerPowerDown();
        }

        // Send player hit event
        events.playerHit.send(new PlayerHitEvent(
          enemyEntity,
          damageAmount,
          playerHealth.current
        ));

        // Trigger health change observer
        if (registry) {
          triggerChangeObserver(registry, playerEntity, Health, playerHealth);
        }

        // AUTO-SPAWN POWER-UP when player is hurt!
        const config = world.getResource(GameConfig);
        if (config && !playerHealth.isDead()) {
          const powerUpX = Math.random() * (config.canvasWidth - 80) + 40;
          const powerUpY = Math.random() * (config.canvasHeight - 80) + 40;
          
          commands
            .spawn()
            .insert(new Position(powerUpX, powerUpY))
            .insert(new Velocity(0, 0))
            .insert(new Size(20, 20))
            .insert(new Sprite('#00d9ff', 'circle'))
            .insert(new PowerUp())
            .insert(new Health(25, 25))
            .insert(new Collider(12, 'powerup'))
            .insert(new Lifetime(15));
        }

        // Check if player died
        if (playerHealth.isDead()) {
          // Play player explosion and game over sounds
          if (soundManager) {
            soundManager.playPlayerExplosion();
            // Delay game over sound slightly for effect
            setTimeout(() => soundManager.playGameOver(), 300);
          }

          // Trigger remove observer
          if (registry) {
            triggerDespawnObserver(registry, playerEntity, Player);
          }

          // Send game over event
          events.gameOver.send(new GameOverEvent(
            gameState?.score || 0,
            gameState?.enemiesKilled || 0,
            gameState?.powerUpsCollected || 0,
            0 // survival time - would track separately
          ));

          if (gameState) {
            gameState.isGameOver = true;
          }

          // Spawn player explosion
          commands
            .spawn()
            .insert(new Position(playerPos.x, playerPos.y))
            .insert(new Explosion(80, 0.7, '#00ff88'));

          commands.despawn(playerEntity);
        }

        // Despawn enemy after collision
        if (registry) {
          triggerDespawnObserver(registry, enemyEntity, Enemy);
        }
        
        commands
          .spawn()
          .insert(new Position(enemyPos.x, enemyPos.y))
          .insert(new Explosion(40, 0.4, '#ff4466'));
          
        commands.despawn(enemyEntity);
        break;
      }
    }
  }

  // Player-PowerUp collisions
  const powerUpQuery = world.query(Position, Collider, Health, PowerUp);
  const powerUps = powerUpQuery.toArray();

  if (playerResult) {
    const [playerEntity, playerPos, playerCol, playerHealth] = playerResult;

    for (const [powerUpEntity, powerUpPos, powerUpCol, powerUpHealth] of powerUps) {
      const dx = playerPos.x - powerUpPos.x;
      const dy = playerPos.y - powerUpPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const collisionRadius = playerCol.radius + powerUpCol.radius;

      if (distance < collisionRadius) {
        const healAmount = powerUpHealth.current; // Health component stores heal amount
        const oldHealth = playerHealth.current;
        playerHealth.heal(healAmount);

        // Play power-up sound
        if (soundManager) {
          soundManager.playPlayerPowerUp();
        }

        // Send events
        events.powerUpCollected.send({
          powerUp: powerUpEntity,
          healAmount,
          newHealth: playerHealth.current,
        });

        events.scoreChanged.send(new ScoreChangedEvent(
          50,
          (gameState?.score || 0) + 50,
          'powerup_collected'
        ));

        // Update game state
        if (gameState) {
          gameState.addScore(50);
          gameState.powerUpsCollected++;
        }

        // Trigger observers
        if (registry) {
          triggerChangeObserver(registry, playerEntity, Health, playerHealth);
          triggerDespawnObserver(registry, powerUpEntity, PowerUp);
        }

        // Despawn power-up
        commands.despawn(powerUpEntity);
      }
    }
  }
}

export const collisionWithEventsSystemDescriptor = system(collisionWithEventsSystem)
  .label('collision_with_events')
  .inStage(Stage.PostUpdate);
