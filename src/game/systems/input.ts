/**
 * @module game/systems/input
 * @description Input systems - handle player input and actions.
 * 
 * These systems process keyboard input and translate it into game actions.
 * Player position updates move the camera to follow.
 * 
 * Interacts with:
 * - Input resource: Reads keyboard state
 * - Camera resource: Updates camera to follow player
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
import { Input, GameConfig, GameState, ShootCooldown, Logger, SoundManager, MobileControlsResource, Camera } from '../resources';

/**
 * Clear input state at the start of each frame.
 */
export function inputClearSystem(world: World): void {
  const input = world.getResource(Input);
  if (input) {
    input.clear();
  }
}

/**
 * Sync mobile controls state to Input resource.
 * Must run before other input systems.
 * Also updates mobile UI based on game state.
 */
export function mobileInputSyncSystem(world: World): void {
  const input = world.getResource(Input);
  const mobileRes = world.getResource(MobileControlsResource);
  const gameState = world.getResource(GameState);
  
  const hasMobileControls = input && mobileRes?.controls;
  if (!hasMobileControls) return;
  
  // Get touch state from mobile controls and sync to Input
  const touchState = mobileRes.controls!.getInputState();
  input.setTouchState(touchState);
  
  // Update reset button visibility based on game over state
  mobileRes.controls!.setShowReset(gameState?.isGameOver ?? false);
}

/** Rotation speed in radians per second */
const ROTATION_SPEED = 4.0;

/**
 * Handle player movement and rotation.
 * Player moves freely in world space (infinite world).
 * Camera follows player to keep them centered on screen.
 * 
 * - W/S or Up/Down arrows: Move forward/backward in facing direction
 * - A/D or Left/Right arrows: Rotate player
 * - Mobile: Touch joystick for direct movement
 */
export function playerInputSystem(world: World): void {
  const input = world.getResource(Input);
  const config = world.getResource(GameConfig);
  const time = world.getResource(Time);
  const gameState = world.getResource(GameState);
  const camera = world.getResource(Camera);
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

  // Check if mobile mode
  if (input.isMobileMode()) {
    // Mobile: Use touch joystick for direct movement
    const touchMove = input.getTouchMovement();
    const hasTouchInput = Math.abs(touchMove.x) > 0.1 || Math.abs(touchMove.y) > 0.1;
    
    if (hasTouchInput) {
      // Direct movement in joystick direction
      vel.x = touchMove.x * config.playerSpeed;
      vel.y = touchMove.y * config.playerSpeed;
      
      // Update rotation to face movement direction
      rotation.angle = Math.atan2(touchMove.y, touchMove.x);
    }
  } else {
    // Desktop: Keyboard controls
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

  // Note: Player can move freely in infinite world - no bounds checking needed
  // Camera follows player after movement system runs
}

/**
 * Update camera to follow player position.
 * Must run AFTER movement system.
 */
export function cameraFollowSystem(world: World): void {
  const camera = world.getResource(Camera);
  if (!camera) return;

  const playerQuery = world.query(Position, Player);
  const playerResult = playerQuery.single();
  if (!playerResult) return;

  const [, playerPos] = playerResult;

  // Camera position = player position (player always centered)
  camera.worldX = playerPos.x;
  camera.worldY = playerPos.y;
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
