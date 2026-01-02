/**
 * @module game/systems/input
 * @description Input systems - handle player input and actions.
 * 
 * These systems process keyboard input and translate it into game actions.
 * 
 * Interacts with:
 * - Input resource: Reads keyboard state
 * - Player entities: Updates position, velocity, rotation
 * - Commands: Spawns bullets
 * - SoundManager: Plays shooting sound effects
 */

import { World, Time } from '../../ecs';
import {
  Position,
  Velocity,
  Rotation,
  Size,
  Player,
  Turbo,
  Sprite,
  Trail,
  Bullet,
  Damage,
  Collider,
  Lifetime,
} from '../components';
import { Input, GameConfig, GameState, ShootCooldown, Logger, SoundManager } from '../resources';

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
 * - W/S or Up/Down arrows: Move forward/backward in facing direction
 * - A/D or Left/Right arrows: Rotate player
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

  // A/D or Left/Right arrows for rotation
  const rotateLeft = input.isPressed('arrowleft') || input.isPressed('a');
  const rotateRight = input.isPressed('arrowright') || input.isPressed('d');
  
  if (rotateLeft) {
    rotation.angle -= ROTATION_SPEED * time.delta;
  }
  if (rotateRight) {
    rotation.angle += ROTATION_SPEED * time.delta;
  }

  // Calculate facing direction
  const dirX = Math.cos(rotation.angle);
  const dirY = Math.sin(rotation.angle);

  // W/S or Up/Down arrows for forward/backward movement (relative to facing)
  const moveForward = input.isPressed('arrowup') || input.isPressed('w');
  const moveBackward = input.isPressed('arrowdown') || input.isPressed('s');
  
  if (moveForward) {
    vel.x = dirX * config.playerSpeed;
    vel.y = dirY * config.playerSpeed;
  }
  if (moveBackward) {
    vel.x = -dirX * config.playerSpeed;
    vel.y = -dirY * config.playerSpeed;
  }

  // Apply turbo speed boost if active
  const turboQuery = world.query(Turbo, Player).single();
  if (turboQuery) {
    const turbo = turboQuery[1];
    if (turbo.isActive) {
      vel.x *= turbo.speedMultiplier;
      vel.y *= turbo.speedMultiplier;
    }
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

  // Get player position, velocity AND rotation
  const playerQuery = world.query(Position, Velocity, Rotation, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) return;

  const [, playerPos, playerVel, playerRot] = playerResult;

  // Calculate direction from rotation angle
  const dirX = Math.cos(playerRot.angle);
  const dirY = Math.sin(playerRot.angle);

  // Spawn bullet slightly in front of player (in facing direction)
  const spawnOffset = 25;
  const bulletX = playerPos.x + dirX * spawnOffset;
  const bulletY = playerPos.y + dirY * spawnOffset;

  // Calculate player's speed in the firing direction (dot product)
  const playerSpeedInFiringDir = playerVel.x * dirX + playerVel.y * dirY;
  
  // Only add player velocity if moving forward (positive dot product)
  // If moving backward, bullet uses just the base bullet speed
  const extraSpeed = Math.max(0, playerSpeedInFiringDir);
  const totalBulletSpeed = config.bulletSpeed + extraSpeed;
  
  const bulletVelX = dirX * totalBulletSpeed;
  const bulletVelY = dirY * totalBulletSpeed;

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
    .insert(new Lifetime(2));

  cooldown.shoot();

  // Play shoot sound
  const soundManager = world.getResource(SoundManager);
  if (soundManager) {
    soundManager.playPlayerShoot();
  }

  if (logger) {
    logger.system('Bullet spawned');
  }
}
