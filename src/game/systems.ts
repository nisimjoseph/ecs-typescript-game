/**
 * @module game/systems
 * @description Game systems that implement game logic.
 * 
 * Systems are functions that process entities with specific components.
 * Following Bevy's pattern, each system:
 * - Queries entities with needed components
 * - Processes them based on game logic
 * - May spawn/despawn entities via Commands
 * 
 * Systems are organized by their purpose:
 * - Input systems: Handle player input
 * - Movement systems: Update positions
 * - Collision systems: Detect and handle collisions
 * - Render systems: Draw to canvas
 */

import { World, Time, system, Stage } from '../ecs';
import {
  Position,
  Velocity,
  Size,
  Rotation,
  Health,
  Damage,
  Lifetime,
  Player,
  Enemy,
  Bullet,
  PowerUp,
  Sprite,
  Trail,
  Wander,
  Collider,
  Bouncy,
  FollowTarget,
  Explosion,
} from './components';
import {
  Input,
  GameConfig,
  GameState,
  CanvasContext,
  Logger,
  SpawnTimer,
  ShootCooldown,
} from './resources';

// ============ Input Systems ============

/**
 * Clear input state at the start of each frame.
 */
export function inputClearSystem(world: World): void {
  const input = world.getResource(Input);
  if (input) {
    input.clear();
  }
}

/** Rotation speed in radians per second */
const ROTATION_SPEED = 4.0;

/**
 * Handle player movement and rotation.
 * - WASD: Move in world directions
 * - Up/Down arrows: Move forward/backward in facing direction
 * - Left/Right arrows: Rotate player
 */
export function playerInputSystem(world: World): void {
  const input = world.getResource(Input);
  const config = world.getResource(GameConfig);
  const time = world.getResource(Time);
  const gameState = world.getResource(GameState);
  const hasNoResources = !input || !config || !time;
  if (hasNoResources) return;
  if (gameState?.isGameOver) return; // Skip if game over

  // Query player with rotation
  const query = world.query(Position, Velocity, Rotation, Player);
  const result = query.single();
  if (!result) return;

  const [, pos, vel, rotation] = result;

  // Reset velocity
  vel.x = 0;
  vel.y = 0;

  // Left/Right arrows for rotation
  if (input.isPressed('arrowleft')) {
    rotation.angle -= ROTATION_SPEED * time.delta;
  }
  if (input.isPressed('arrowright')) {
    rotation.angle += ROTATION_SPEED * time.delta;
  }

  // Calculate facing direction
  const dirX = Math.cos(rotation.angle);
  const dirY = Math.sin(rotation.angle);

  // Up/Down arrows for forward/backward movement (relative to facing)
  if (input.isPressed('arrowup')) {
    vel.x = dirX * config.playerSpeed;
    vel.y = dirY * config.playerSpeed;
  }
  if (input.isPressed('arrowdown')) {
    vel.x = -dirX * config.playerSpeed;
    vel.y = -dirY * config.playerSpeed;
  }

  // WASD for movement (world-relative, overrides arrow movement)
  if (input.isPressed('w')) {
    vel.y = -config.playerSpeed;
  }
  if (input.isPressed('s')) {
    vel.y = config.playerSpeed;
  }
  if (input.isPressed('a')) {
    vel.x = -config.playerSpeed;
  }
  if (input.isPressed('d')) {
    vel.x = config.playerSpeed;
  }

  // Normalize diagonal movement
  const isMovingDiagonally = vel.x !== 0 && vel.y !== 0;
  if (isMovingDiagonally) {
    const factor = 1 / Math.sqrt(2);
    vel.x *= factor;
    vel.y *= factor;
  }

  // Keep player in bounds
  const sizeQuery = world.query(Size, Player).single();
  if (sizeQuery) {
    const halfWidth = sizeQuery[1].width / 2;
    const halfHeight = sizeQuery[1].height / 2;

    pos.x = Math.max(halfWidth, Math.min(config.canvasWidth - halfWidth, pos.x));
    pos.y = Math.max(halfHeight, Math.min(config.canvasHeight - halfHeight, pos.y));
  }
}

/**
 * Handle player shooting (Space key).
 * Bullet fires in the direction the player is facing.
 */
export function playerShootSystem(world: World): void {
  const input = world.getResource(Input);
  const config = world.getResource(GameConfig);
  const time = world.getResource(Time);
  const cooldown = world.getResource(ShootCooldown);
  const logger = world.getResource(Logger);
  const gameState = world.getResource(GameState);
  const hasNoResources = !input || !config || !time || !cooldown;
  if (hasNoResources) return;
  if (gameState?.isGameOver) return; // Skip if game over

  // Update cooldown
  cooldown.tick(time.delta);

  // Check for shoot input - space key is ' ' in keydown events
  const wantsToShoot = input.isPressed(' ');
  const canShoot = cooldown.canShoot();
  const shouldShoot = wantsToShoot && canShoot;

  if (!shouldShoot) return;

  // Get player position AND rotation
  const playerQuery = world.query(Position, Rotation, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) return;

  const [, playerPos, playerRot] = playerResult;

  // Calculate direction from rotation angle
  const dirX = Math.cos(playerRot.angle);
  const dirY = Math.sin(playerRot.angle);

  // Spawn bullet slightly in front of player (in facing direction)
  const spawnOffset = 25;
  const bulletX = playerPos.x + dirX * spawnOffset;
  const bulletY = playerPos.y + dirY * spawnOffset;

  // Bullet velocity in facing direction
  const bulletVelX = dirX * config.bulletSpeed;
  const bulletVelY = dirY * config.bulletSpeed;

  // Spawn bullet - YELLOW CIRCLE to distinguish from RED RECTANGLE enemies
  const commands = world.getCommands();
  commands
    .spawn()
    .insert(new Position(bulletX, bulletY))
    .insert(new Velocity(bulletVelX, bulletVelY))
    .insert(new Size(16, 16)) // Larger for visibility
    .insert(new Sprite('#ffff00', 'circle')) // Bright yellow CIRCLE
    .insert(new Trail('#ffff00', 12))
    .insert(new Bullet())
    .insert(new Damage(25))
    .insert(new Collider(15, 'bullet')) // Large collider for easy testing
    .insert(new Lifetime(5));

  cooldown.shoot();

  if (logger) {
    logger.system('Bullet spawned');
  }
}

// ============ Movement Systems ============

/**
 * Apply velocity to position.
 */
export function movementSystem(world: World): void {
  const time = world.getResource(Time);
  if (!time) return;

  const query = world.query(Position, Velocity);

  for (const [, pos, vel] of query.iter()) {
    pos.x += vel.x * time.delta;
    pos.y += vel.y * time.delta;
  }
}

/**
 * Update trail positions for entities with Trail component.
 */
export function trailSystem(world: World): void {
  const query = world.query(Position, Trail);

  for (const [, pos, trail] of query.iter()) {
    trail.addPoint(pos.x, pos.y);
  }
}

/**
 * Handle bouncy entities that bounce off walls.
 */
export function bounceSystem(world: World): void {
  const config = world.getResource(GameConfig);
  if (!config) return;

  const query = world.query(Position, Velocity, Size, Bouncy);

  for (const [, pos, vel, size] of query.iter()) {
    const halfWidth = size.width / 2;
    const halfHeight = size.height / 2;

    // Bounce off left/right walls
    const hitLeftWall = pos.x - halfWidth < 0;
    const hitRightWall = pos.x + halfWidth > config.canvasWidth;
    if (hitLeftWall || hitRightWall) {
      vel.x *= -1;
      pos.x = hitLeftWall ? halfWidth : config.canvasWidth - halfWidth;
    }

    // Bounce off top/bottom walls
    const hitTopWall = pos.y - halfHeight < 0;
    const hitBottomWall = pos.y + halfHeight > config.canvasHeight;
    if (hitTopWall || hitBottomWall) {
      vel.y *= -1;
      pos.y = hitTopWall ? halfHeight : config.canvasHeight - halfHeight;
    }
  }
}

// ============ AI Systems ============

/**
 * Wander AI - entities move randomly.
 */
export function wanderSystem(world: World): void {
  const time = world.getResource(Time);
  const config = world.getResource(GameConfig);
  const hasNoResources = !time || !config;
  if (hasNoResources) return;

  const query = world.query(Position, Velocity, Wander);

  for (const [, pos, vel, wander] of query.iter()) {
    // Update change timer
    wander.changeTimer += time.delta;
    const shouldChangeDirection = wander.changeTimer >= wander.changeInterval;
    if (shouldChangeDirection) {
      wander.direction = Math.random() * Math.PI * 2;
      wander.changeTimer = 0;
    }

    // Apply wander velocity
    vel.x = Math.cos(wander.direction) * wander.speed;
    vel.y = Math.sin(wander.direction) * wander.speed;

    // Keep in bounds with wrapping
    const margin = 20;
    if (pos.x < -margin) pos.x = config.canvasWidth + margin;
    if (pos.x > config.canvasWidth + margin) pos.x = -margin;
    if (pos.y < -margin) pos.y = config.canvasHeight + margin;
    if (pos.y > config.canvasHeight + margin) pos.y = -margin;
  }
}

/**
 * Follow target AI - entities move toward a target.
 */
export function followTargetSystem(world: World): void {
  const time = world.getResource(Time);
  if (!time) return;

  // Update targets to player position
  const playerQuery = world.query(Position, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) return;
  const [, playerPos] = playerResult;

  const query = world.query(Position, Velocity, FollowTarget);

  for (const [, pos, vel, follow] of query.iter()) {
    // Update target to player position
    follow.targetX = playerPos.x;
    follow.targetY = playerPos.y;

    // Calculate direction to target
    const dx = follow.targetX - pos.x;
    const dy = follow.targetY - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const isCloseEnough = distance < 5;
    if (isCloseEnough) {
      vel.x = 0;
      vel.y = 0;
    } else {
      vel.x = (dx / distance) * follow.speed;
      vel.y = (dy / distance) * follow.speed;
    }
  }
}

// ============ Lifetime System ============

/**
 * Despawn entities whose lifetime has expired.
 */
export function lifetimeSystem(world: World): void {
  const time = world.getResource(Time);
  if (!time) return;

  const query = world.query(Lifetime);
  const commands = world.getCommands();

  for (const [entity, lifetime] of query.iter()) {
    lifetime.remaining -= time.delta;
    const hasExpired = lifetime.remaining <= 0;
    if (hasExpired) {
      commands.despawn(entity);
    }
  }
}

// ============ Explosion System ============

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

// ============ Collision Systems ============

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
          gameState.enemiesKilled++;
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

  for (const [, enemyPos, enemyCol] of enemyQuery.iter()) {
    const hasCollision = checkCollision(playerPos, playerCol, enemyPos, enemyCol);
    if (!hasCollision) continue;

    // Player takes damage
    playerHealth.takeDamage(10);

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
        .insert(new Sprite('#00ffff', 'circle'))
        .insert(new PowerUp())
        .insert(new Health(30, 30))
        .insert(new Collider(15, 'powerup'))
        .insert(new Lifetime(8)) // Power-up lasts 8 seconds
        .insert(new Bouncy(0.5));
      
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

// ============ Spawning Systems ============

/**
 * Spawn enemies periodically.
 */
export function enemySpawnSystem(world: World): void {
  const time = world.getResource(Time);
  const config = world.getResource(GameConfig);
  const spawnTimer = world.getResource(SpawnTimer);
  const gameState = world.getResource(GameState);
  const logger = world.getResource(Logger);
  const hasNoResources = !time || !config || !spawnTimer || !gameState;
  if (hasNoResources) return;

  // Don't spawn if game over
  if (gameState.isGameOver) return;

  // Check enemy count
  const enemyQuery = world.query(Enemy);
  const enemyCount = enemyQuery.count();
  const atMaxEnemies = enemyCount >= config.maxEnemies;
  if (atMaxEnemies) return;

  // Check spawn timer
  const shouldSpawn = spawnTimer.tick(time.delta);
  if (!shouldSpawn) return;

  // Random spawn position on edge
  const edge = Math.floor(Math.random() * 4);
  let x: number, y: number;

  switch (edge) {
    case 0: // Top
      x = Math.random() * config.canvasWidth;
      y = -20;
      break;
    case 1: // Right
      x = config.canvasWidth + 20;
      y = Math.random() * config.canvasHeight;
      break;
    case 2: // Bottom
      x = Math.random() * config.canvasWidth;
      y = config.canvasHeight + 20;
      break;
    default: // Left
      x = -20;
      y = Math.random() * config.canvasHeight;
      break;
  }

  // Randomly choose enemy type
  const enemyType = Math.random();
  const commands = world.getCommands();

  if (enemyType < 0.5) {
    // Wandering enemy
    commands
      .spawn()
      .insert(new Position(x, y))
      .insert(new Velocity(0, 0))
      .insert(new Size(24, 24))
      .insert(new Sprite('#ff6b6b', 'rect'))
      .insert(new Enemy())
      .insert(new Health(50, 50))
      .insert(new Collider(12, 'enemy'))
      .insert(new Wander(40 + Math.random() * 40, 1 + Math.random() * 2))
      .insert(new Bouncy());
  } else {
    // Following enemy
    commands
      .spawn()
      .insert(new Position(x, y))
      .insert(new Velocity(0, 0))
      .insert(new Size(20, 20))
      .insert(new Sprite('#ff4444', 'circle'))
      .insert(new Enemy())
      .insert(new Health(30, 30))
      .insert(new Collider(10, 'enemy'))
      .insert(new FollowTarget(0, 0, 50 + Math.random() * 30));
  }

  if (logger) {
    logger.system('Enemy spawned');
  }
}

/**
 * Spawn a power-up (called via button or timer).
 */
export function spawnPowerUp(world: World): void {
  const config = world.getResource(GameConfig);
  const logger = world.getResource(Logger);
  if (!config) return;

  const x = Math.random() * (config.canvasWidth - 40) + 20;
  const y = Math.random() * (config.canvasHeight - 40) + 20;

  const commands = world.getCommands();
  commands
    .spawn()
    .insert(new Position(x, y))
    .insert(new Velocity(0, 0))
    .insert(new Size(16, 16))
    .insert(new Sprite('#00d9ff', 'circle'))
    .insert(new PowerUp())
    .insert(new Collider(8, 'powerup'))
    .insert(new Lifetime(10));

  if (logger) {
    logger.entity('Power-up spawned');
  }
}

/**
 * Spawn a bullet from player (called via button).
 */
export function shootBullet(world: World): void {
  const config = world.getResource(GameConfig);
  const logger = world.getResource(Logger);
  if (!config) return;

  // Get player position
  const playerQuery = world.query(Position, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) {
    console.log('No player found to shoot from!');
    return;
  }

  const [, playerPos] = playerResult;

  // Spawn bullet - YELLOW CIRCLE to distinguish from RED RECTANGLE enemies
  const commands = world.getCommands();
  commands
    .spawn()
    .insert(new Position(playerPos.x, playerPos.y - 20))
    .insert(new Velocity(0, -config.bulletSpeed))
    .insert(new Size(16, 16)) // Larger for visibility
    .insert(new Sprite('#ffff00', 'circle')) // Bright yellow CIRCLE
    .insert(new Trail('#ffff00', 12))
    .insert(new Bullet())
    .insert(new Damage(25))
    .insert(new Collider(15, 'bullet')) // Large collider for easy testing
    .insert(new Lifetime(5));

  if (logger) {
    logger.system('Bullet fired!');
  }
}

/**
 * Spawn an enemy (called via button) - spawns above player for easy testing.
 */
export function spawnEnemy(world: World): void {
  const config = world.getResource(GameConfig);
  const logger = world.getResource(Logger);
  if (!config) return;

  // Get player position to spawn enemy directly above them
  const playerQuery = world.query(Position, Player);
  const playerResult = playerQuery.single();
  let x = Math.random() * config.canvasWidth;
  let y = -20;
  
  // Spawn directly above player for easy shooting test
  if (playerResult) {
    const [, playerPos] = playerResult;
    x = playerPos.x; // Directly above
    y = playerPos.y - 60; // Very close above player
  }

  const commands = world.getCommands();
  commands
    .spawn()
    .insert(new Position(x, y))
    .insert(new Velocity(0, 0))
    .insert(new Size(24, 24))
    .insert(new Sprite('#ff6b6b', 'rect'))
    .insert(new Enemy())
    .insert(new Health(50, 50))
    .insert(new Collider(20, 'enemy')); // Large collider for easy testing
  // Note: Button-spawned enemies don't wander, making it easier to test collision

  if (logger) {
    logger.system('Enemy manually spawned (stationary)');
  }
}

// ============ Render System ============

/**
 * Render all entities to canvas.
 */
export function renderSystem(world: World): void {
  const canvasCtx = world.getResource(CanvasContext);
  if (!canvasCtx) return;

  const { ctx } = canvasCtx;

  // Clear canvas
  canvasCtx.clear();

  // Draw grid background
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < ctx.canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ctx.canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < ctx.canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ctx.canvas.width, y);
    ctx.stroke();
  }

  // Draw trails first (behind entities)
  const trailQuery = world.query(Trail);
  for (const [, trail] of trailQuery.iter()) {
    for (const point of trail.positions) {
      ctx.globalAlpha = point.alpha * 0.5;
      ctx.fillStyle = trail.color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Draw entities with Position, Size, Sprite
  const query = world.query(Position, Size, Sprite);

  for (const [entity, pos, size, sprite] of query.iter()) {
    ctx.fillStyle = sprite.color;

    // Check if entity has rotation (for player)
    const rotationResult = world.getComponent(entity, Rotation);
    const hasRotation = rotationResult !== undefined;

    if (hasRotation && sprite.shape === 'triangle') {
      // Draw rotated triangle (player)
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(rotationResult.angle + Math.PI / 2); // +PI/2 because triangle points up by default
      ctx.beginPath();
      ctx.moveTo(0, -size.height / 2); // tip
      ctx.lineTo(-size.width / 2, size.height / 2); // bottom left
      ctx.lineTo(size.width / 2, size.height / 2); // bottom right
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      // Non-rotated shapes
      switch (sprite.shape) {
        case 'rect':
          ctx.fillRect(
            pos.x - size.width / 2,
            pos.y - size.height / 2,
            size.width,
            size.height
          );
          break;

        case 'circle':
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, size.width / 2, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - size.height / 2);
          ctx.lineTo(pos.x - size.width / 2, pos.y + size.height / 2);
          ctx.lineTo(pos.x + size.width / 2, pos.y + size.height / 2);
          ctx.closePath();
          ctx.fill();
          break;
      }
    }
  }

  // Draw health bars for entities with Health
  const healthQuery = world.query(Position, Size, Health);
  for (const [, pos, size, health] of healthQuery.iter()) {
    const healthPercent = health.current / health.max;
    const barWidth = size.width;
    const barHeight = 4;
    const barY = pos.y - size.height / 2 - 8;

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(pos.x - barWidth / 2, barY, barWidth, barHeight);

    // Health fill
    const healthColor = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ffdd00' : '#ff4444';
    ctx.fillStyle = healthColor;
    ctx.fillRect(pos.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
  }

  // Draw explosions
  const explosionQuery = world.query(Position, Explosion);
  for (const [, pos, explosion] of explosionQuery.iter()) {
    const progress = explosion.elapsed / explosion.duration;
    const alpha = 1 - progress;
    
    // Draw expanding ring
    ctx.strokeStyle = explosion.color;
    ctx.lineWidth = 4;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, explosion.currentRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw inner glow
    ctx.fillStyle = explosion.color;
    ctx.globalAlpha = alpha * 0.3;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, explosion.currentRadius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw particles
    ctx.globalAlpha = alpha;
    for (const particle of explosion.particles) {
      ctx.fillStyle = explosion.color;
      ctx.beginPath();
      ctx.arc(
        pos.x + particle.x,
        pos.y + particle.y,
        particle.size * (1 - progress),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Draw Game Over overlay
  const gameState = world.getResource(GameState);
  if (gameState?.isGameOver) {
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Game Over text
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 48px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', ctx.canvas.width / 2, ctx.canvas.height / 2 - 40);
    
    // Score
    ctx.fillStyle = '#00d9ff';
    ctx.font = '24px "JetBrains Mono", monospace';
    ctx.fillText(`Final Score: ${gameState.score}`, ctx.canvas.width / 2, ctx.canvas.height / 2 + 20);
    
    // Restart hint
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '16px "JetBrains Mono", monospace';
    ctx.fillText('Click "Reset Game" to play again', ctx.canvas.width / 2, ctx.canvas.height / 2 + 60);
  }
}

// ============ UI Update System ============

/**
 * Update UI elements with game stats.
 */
export function uiUpdateSystem(world: World): void {
  const gameState = world.getResource(GameState);
  const time = world.getResource(Time);

  // Update entity count
  const entityCountEl = document.getElementById('entity-count');
  if (entityCountEl) {
    entityCountEl.textContent = world.entityCount().toString();
  }

  // Update FPS - use a smoothed value
  const fpsEl = document.getElementById('fps');
  if (fpsEl && time) {
    // Calculate FPS from frame count / elapsed time for smoother display
    const fps = time.elapsed > 0 ? Math.round(time.frameCount / time.elapsed) : 60;
    fpsEl.textContent = fps.toString();
  }

  // Update system count
  const systemCountEl = document.getElementById('system-count');
  if (systemCountEl) {
    systemCountEl.textContent = '15'; // We have 15 systems
  }

  // Update score
  const scoreEl = document.getElementById('score');
  if (scoreEl && gameState) {
    scoreEl.textContent = gameState.score.toString();
  }
}

// ============ System Descriptors with Stages ============

export const inputClearSystemDescriptor = system(inputClearSystem)
  .label('input_clear')
  .inStage(Stage.First);

export const playerInputSystemDescriptor = system(playerInputSystem)
  .label('player_input')
  .inStage(Stage.PreUpdate);

export const playerShootSystemDescriptor = system(playerShootSystem)
  .label('player_shoot')
  .inStage(Stage.PreUpdate)
  .after('player_input');

export const wanderSystemDescriptor = system(wanderSystem)
  .label('wander')
  .inStage(Stage.Update);

export const followTargetSystemDescriptor = system(followTargetSystem)
  .label('follow_target')
  .inStage(Stage.Update);

export const movementSystemDescriptor = system(movementSystem)
  .label('movement')
  .inStage(Stage.Update)
  .after('wander')
  .after('follow_target');

export const bounceSystemDescriptor = system(bounceSystem)
  .label('bounce')
  .inStage(Stage.Update)
  .after('movement');

export const trailSystemDescriptor = system(trailSystem)
  .label('trail')
  .inStage(Stage.Update)
  .after('movement');

export const lifetimeSystemDescriptor = system(lifetimeSystem)
  .label('lifetime')
  .inStage(Stage.PostUpdate);

export const explosionSystemDescriptor = system(explosionSystem)
  .label('explosion')
  .inStage(Stage.PostUpdate);

export const bulletEnemyCollisionSystemDescriptor = system(bulletEnemyCollisionSystem)
  .label('bullet_enemy_collision')
  .inStage(Stage.PostUpdate);

export const playerEnemyCollisionSystemDescriptor = system(playerEnemyCollisionSystem)
  .label('player_enemy_collision')
  .inStage(Stage.PostUpdate);

export const playerPowerUpCollisionSystemDescriptor = system(playerPowerUpCollisionSystem)
  .label('player_powerup_collision')
  .inStage(Stage.PostUpdate);

export const enemySpawnSystemDescriptor = system(enemySpawnSystem)
  .label('enemy_spawn')
  .inStage(Stage.PostUpdate);

export const renderSystemDescriptor = system(renderSystem)
  .label('render')
  .inStage(Stage.Last);

export const uiUpdateSystemDescriptor = system(uiUpdateSystem)
  .label('ui_update')
  .inStage(Stage.Last);
