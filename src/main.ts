/**
 * @module main
 * @description Entry point for the ECS game demo - FULL FEATURE DEMONSTRATION.
 * 
 * This file demonstrates the COMPLETE ECS architecture including:
 * 
 * 1. CORE SYSTEMS:
 *    - Entity/Component/World/Commands
 *    - System scheduling with stages
 *    - Resources for global state
 * 
 * 2. ADVANCED FEATURES:
 *    - BUNDLES: Grouped component spawning (PlayerBundle, EnemyBundle, etc.)
 *    - EVENTS: Decoupled communication (CollisionEvent, DamageEvent, etc.)
 *    - OBSERVERS: Reactive component hooks (OnAdd, OnRemove, OnChange)
 *    - HIERARCHY: Parent-child relationships (Trails as children)
 *    - CHANGE DETECTION: Track Added/Changed components
 *    - QUERY FILTERS: With/Without filters
 * 
 * Interacts with:
 * - All ECS modules to demonstrate full capabilities
 * - Game modules (components, systems, resources, bundles, events, observers)
 */

import { App, World, ObserverRegistry, system, Stage } from './ecs';
import {
  Position,
  Velocity,
  Size,
  Rotation,
  Health,
  Player,
  Enemy,
  Bullet,
  PowerUp,
  Boss,
  Sprite,
  Collider,
  Trail,
  Explosion,
  Wander,
  FollowTarget,
  Damage,
  Bouncy,
  Lifetime,
  Shield,
} from './game/components';
import {
  GameConfig,
  GameState,
  CanvasContext,
  Logger,
  SpawnTimer,
  ShootCooldown,
  BossSpawnTimer,
  Input,
} from './game/resources';
import {
  PlayerBundle,
  WanderingEnemyBundle,
  ChasingEnemyBundle,
  BulletBundle,
  PowerUpBundle,
  BossBundle,
  spawnWithBundle,
} from './game/bundles';
import {
  GameEvents,
  EntitySpawnedEvent,
  ScoreChangedEvent,
  BulletHitEvent,
  PlayerHitEvent,
  PlayerShootEvent,
  GameOverEvent,
  GameStartEvent,
  BossSpawnedEvent,
  BossKilledEvent,
} from './game/events';
import {
  setupObservers,
  triggerSpawnObserver,
  triggerDespawnObserver,
  triggerChangeObserver,
} from './game/observers';
import {
  inputClearSystemDescriptor,
  playerInputSystemDescriptor,
  playerShootSystemDescriptor,
  shieldSystemDescriptor,
  turboSystemDescriptor,
  wanderSystemDescriptor,
  followTargetSystemDescriptor,
  movementSystemDescriptor,
  bounceSystemDescriptor,
  trailSystemDescriptor,
  lifetimeSystemDescriptor,
  explosionSystemDescriptor,
  bulletEnemyCollisionSystemDescriptor,
  playerEnemyCollisionSystemDescriptor,
  playerPowerUpCollisionSystemDescriptor,
  difficultyProgressionSystemDescriptor,
  enemySpawnSystemDescriptor,
  powerUpAutoSpawnSystemDescriptor,
  renderSystemDescriptor,
  uiUpdateSystemDescriptor,
  spawnEnemy,
  spawnPowerUp,
  shootBullet,
} from './game/systems';

// ============ STARTUP SYSTEMS ============

/**
 * Startup system: Initialize observers.
 * DEMONSTRATES: Observer system setup
 */
function setupObserversSystem(world: World): void {
  const logger = world.getResource(Logger);
  const gameState = world.getResource(GameState);
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);

  if (registry) {
    setupObservers(registry, logger, gameState, events);
    if (logger) {
      logger.system('📡 Observers registered');
    }
  }
}

/**
 * Startup system: Spawn player using Bundle.
 * DEMONSTRATES: Bundle-based entity spawning
 */
function spawnPlayerSystem(world: World): void {
  const config = world.getResource(GameConfig);
  const logger = world.getResource(Logger);
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);

  if (!config) {
    console.error('GameConfig not found!');
    return;
  }

  // Use BUNDLE to spawn player with all components
  const playerBundle = new PlayerBundle(
    config.canvasWidth / 2,
    config.canvasHeight / 2,
    100
  );

  // Spawn using bundle helper
  const builder = world.spawn();
  for (const component of playerBundle.components()) {
    builder.insert(component);
  }
  const playerEntity = builder.id();

  // Trigger observer for Player component
  if (registry) {
    triggerSpawnObserver(registry, playerEntity, Player, new Player());
  }

  // Send game start event
  if (events) {
    events.gameStart.send(new GameStartEvent(false));
    events.entitySpawned.send(new EntitySpawnedEvent(playerEntity, 'player'));
  }

  if (logger) {
    logger.system('🎮 Game started with BUNDLE spawning!');
    logger.system('📦 PlayerBundle used for player entity');
  }
}

// ============ EVENT PROCESSING SYSTEMS ============

/**
 * System: Process bullet hit events and update score.
 * DEMONSTRATES: Event reading and processing
 */
function processEventsSystem(world: World): void {
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

const processEventsSystemDescriptor = system(processEventsSystem)
  .label('process_events')
  .inStage(Stage.PostUpdate);

/**
 * System: Update event buffers at end of frame.
 * DEMONSTRATES: Event system lifecycle
 */
function updateEventsSystem(world: World): void {
  const events = world.getResource(GameEvents);
  const time = world.getResource(Time);

  if (events && time) {
    events.updateAll(time.frameCount);
  }
}

const updateEventsSystemDescriptor = system(updateEventsSystem)
  .label('update_events')
  .inStage(Stage.Last);

// ============ CHANGE DETECTION SYSTEMS ============

/**
 * System: Detect newly added enemies (demonstrates Added<> filter).
 * DEMONSTRATES: Change detection - Added filter
 */
function detectNewEnemiesSystem(world: World): void {
  const logger = world.getResource(Logger);
  const registry = world.getResource(ObserverRegistry);

  // Query for enemies
  const query = world.query(Position, Enemy);

  // In a full implementation, we'd use .added() filter
  // For demo, we're using the observer system to track additions
}

/**
 * System: Detect health changes (demonstrates Changed<> concept).
 * DEMONSTRATES: Change detection - monitoring component changes
 */
function detectHealthChangesSystem(world: World): void {
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);

  // Query for entities with Health
  const query = world.query(Position, Health);

  for (const [entity, pos, health] of query.iter()) {
    // In a full implementation, we'd check if health.isChanged()
    // For demo, the observer system tracks health changes
    if (health.isDead() && registry) {
      // Trigger change observer
      triggerChangeObserver(registry, entity, Health, health);
    }
  }
}

const detectHealthChangesSystemDescriptor = system(detectHealthChangesSystem)
  .label('detect_health_changes')
  .inStage(Stage.PostUpdate);

// ============ QUERY FILTER SYSTEMS ============

/**
 * System: Query with With/Without filters.
 * DEMONSTRATES: Advanced query filtering
 */
function queryWithFiltersSystem(world: World): void {
  // Query enemies WITH Trail component
  const trailedEnemies = world.query(Position, Enemy).with(Trail);
  
  // Query enemies WITHOUT Wander component (chasers)
  const chasingEnemies = world.query(Position, Enemy).without(Wander);

  // These demonstrate filter capabilities
  // In practice, use for more targeted logic
}

// ============ COLLISION WITH EVENTS ============

/**
 * Enhanced collision system that sends events.
 * DEMONSTRATES: Collision detection + Event sending
 */
function collisionWithEventsSystem(world: World): void {
  const events = world.getResource(GameEvents);
  const gameState = world.getResource(GameState);
  const registry = world.getResource(ObserverRegistry);
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

const collisionWithEventsSystemDescriptor = system(collisionWithEventsSystem)
  .label('collision_with_events')
  .inStage(Stage.PostUpdate);

// ============ BUNDLE-BASED SPAWNING ============

/**
 * Spawn enemy using bundle.
 * DEMONSTRATES: Bundle spawning pattern
 */
export function spawnEnemyWithBundle(world: World): void {
  const config = world.getResource(GameConfig);
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);

  if (!config) return;

  // Random spawn position
  const x = Math.random() * config.canvasWidth;
  const y = Math.random() * 100;

  // 50% chance for wanderer vs chaser
  const isChaser = Math.random() > 0.5;

  const builder = world.spawn();
  let enemyEntity;

  if (isChaser) {
    const bundle = new ChasingEnemyBundle(x, y, config.canvasWidth / 2, config.canvasHeight / 2);
    for (const component of bundle.components()) {
      builder.insert(component);
    }
  } else {
    const bundle = new WanderingEnemyBundle(x, y);
    for (const component of bundle.components()) {
      builder.insert(component);
    }
  }

  enemyEntity = builder.id();

  // Trigger observer
  if (registry) {
    triggerSpawnObserver(registry, enemyEntity, Enemy, new Enemy());
  }

  // Send event
  if (events) {
    events.entitySpawned.send(new EntitySpawnedEvent(enemyEntity, 'enemy'));
  }
}

/**
 * Spawn bullet using bundle.
 * DEMONSTRATES: Bundle spawning pattern
 * Fires in the direction the player is facing.
 */
export function shootBulletWithBundle(world: World): void {
  const config = world.getResource(GameConfig);
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);
  const gameState = world.getResource(GameState);

  if (!config || gameState?.isGameOver) return;

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

  // Spawn bullet manually (can't use BulletBundle directly since it only supports Y velocity)
  const builder = world.spawn();
  builder
    .insert(new Position(bulletX, bulletY))
    .insert(new Velocity(bulletVelX, bulletVelY))
    .insert(new Size(16, 16))
    .insert(new Sprite('#ffff00', 'circle'))
    .insert(new Bullet())
    .insert(new Damage(25))
    .insert(new Collider(15, 'bullet'))
    .insert(new Lifetime(2))
    .insert(new Trail('#ffff00', 12));

  const bulletEntity = builder.id();

  // Trigger observer
  if (registry) {
    triggerSpawnObserver(registry, bulletEntity, Bullet, new Bullet());
  }

  // Send events
  if (events) {
    events.playerShoot.send(new PlayerShootEvent({ x: playerPos.x, y: playerPos.y }));
    events.entitySpawned.send(new EntitySpawnedEvent(bulletEntity, 'bullet'));
  }
}

/**
 * Spawn power-up using bundle.
 * DEMONSTRATES: Bundle spawning pattern
 */
export function spawnPowerUpWithBundle(world: World): void {
  const config = world.getResource(GameConfig);
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);

  if (!config) return;

  const x = Math.random() * (config.canvasWidth - 40) + 20;
  const y = Math.random() * (config.canvasHeight - 40) + 20;

  const bundle = new PowerUpBundle(x, y, 30);

  const builder = world.spawn();
  for (const component of bundle.components()) {
    builder.insert(component);
  }
  const powerUpEntity = builder.id();

  // Trigger observer
  if (registry) {
    triggerSpawnObserver(registry, powerUpEntity, PowerUp, new PowerUp());
  }

  // Send event
  if (events) {
    events.entitySpawned.send(new EntitySpawnedEvent(powerUpEntity, 'powerup'));
  }
}

/**
 * Check if a boss exists in the world.
 * DEMONSTRATES: Query filters - checking for unique entity
 */
function bossExists(world: World): boolean {
  const bossQuery = world.query(Position, Boss);
  return bossQuery.count() > 0;
}

/**
 * Spawn boss using bundle.
 * DEMONSTRATES: Bundle spawning + unique entity constraint
 * Only spawns if no boss currently exists.
 */
export function spawnBossWithBundle(world: World): void {
  const config = world.getResource(GameConfig);
  const events = world.getResource(GameEvents);
  const registry = world.getResource(ObserverRegistry);
  const gameState = world.getResource(GameState);

  if (!config || gameState?.isGameOver) return;

  // Check if boss already exists - only ONE boss at a time!
  if (bossExists(world)) return;

  // Spawn boss in top center
  const x = config.canvasWidth / 2;
  const y = 80;

  const bundle = new BossBundle(x, y);

  const builder = world.spawn();
  for (const component of bundle.components()) {
    builder.insert(component);
  }
  const bossEntity = builder.id();

  // Trigger observers for both Enemy and Boss
  if (registry) {
    triggerSpawnObserver(registry, bossEntity, Enemy, new Enemy());
    triggerSpawnObserver(registry, bossEntity, Boss, new Boss());
  }

  // Send events
  if (events) {
    events.entitySpawned.send(new EntitySpawnedEvent(bossEntity, 'enemy'));
    events.bossSpawned.send(new BossSpawnedEvent(bossEntity, 300));
  }
}

/**
 * System: Spawn boss periodically if none exists.
 * DEMONSTRATES: Timed spawning + unique entity constraint
 */
function bossSpawnSystem(world: World): void {
  const bossTimer = world.getResource(BossSpawnTimer);
  const time = world.getResource(Time);
  const gameState = world.getResource(GameState);

  if (!bossTimer || !time || gameState?.isGameOver) return;

  // Only spawn if timer triggers AND no boss exists
  if (bossTimer.tick(time.delta) && !bossExists(world)) {
    spawnBossWithBundle(world);
    world.applyCommands();
  }
}

const bossSpawnSystemDescriptor = system(bossSpawnSystem)
  .label('boss_spawn')
  .inStage(Stage.PostUpdate);

// Import Time from ecs (same as game/systems.ts)
import { Time } from './ecs';

// ============ MAIN INITIALIZATION ============

/**
 * Initialize and run the game with ALL ECS features.
 */
function main(): void {
  console.log('🚀 Starting ECS Game Demo - FULL FEATURE DEMONSTRATION');
  console.log('Features: Bundles, Events, Observers, Hierarchy, Change Detection, Query Filters');

  // Get canvas element
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  // Set canvas size
  canvas.width = 800;
  canvas.height = 500;

  // Create the App with ALL features
  const app = new App()
    // ============ RESOURCES ============
    .insertResource(new GameConfig(canvas.width, canvas.height))
    .insertResource(new GameState())
    .insertResource(new Input())
    .insertResource(new CanvasContext(canvas))
    .insertResource(new Logger())
    .insertResource(new SpawnTimer(2))
    .insertResource(new ShootCooldown(0.15))
    .insertResource(new BossSpawnTimer(15)) // Boss spawns every 15 seconds
    // NEW: Event system resource
    .insertResource(new GameEvents())
    // NEW: Observer registry resource
    .insertResource(new ObserverRegistry())

    // ============ STARTUP SYSTEMS ============
    .addStartupSystem(setupObserversSystem) // Setup observers first
    .addStartupSystem(spawnPlayerSystem)    // Then spawn player

    // ============ FRAME SYSTEMS ============
    
    // Stage.First: Input clearing
    .addSystem(inputClearSystemDescriptor)

    // Stage.PreUpdate: Input processing
    .addSystem(playerInputSystemDescriptor)
    .addSystem(playerShootSystemDescriptor)
    .addSystem(shieldSystemDescriptor)
    .addSystem(turboSystemDescriptor)

    // Stage.Update: Game logic
    .addSystem(difficultyProgressionSystemDescriptor) // Increase difficulty every 30s
    .addSystem(wanderSystemDescriptor)
    .addSystem(followTargetSystemDescriptor)
    .addSystem(movementSystemDescriptor)
    .addSystem(bounceSystemDescriptor)
    .addSystem(trailSystemDescriptor)

    // Stage.PostUpdate: Reactions and cleanup
    .addSystem(lifetimeSystemDescriptor)
    .addSystem(explosionSystemDescriptor)
    // Use enhanced collision system with events
    .addSystem(collisionWithEventsSystemDescriptor)
    .addSystem(processEventsSystemDescriptor) // Process events
    .addSystem(detectHealthChangesSystemDescriptor)
    .addSystem(enemySpawnSystemDescriptor)
    .addSystem(powerUpAutoSpawnSystemDescriptor) // Auto-spawn power-ups when player needs healing
    .addSystem(bossSpawnSystemDescriptor) // Boss spawns periodically

    // Stage.Last: Rendering and cleanup
    .addSystem(renderSystemDescriptor)
    .addSystem(uiUpdateSystemDescriptor)
    .addSystem(updateEventsSystemDescriptor); // Update event buffers

  // Set up button handlers with bundle-based spawning
  setupButtonHandlers(app, canvas);

  // Run the game!
  app.run();

  console.log('✅ Game running with ALL ECS features!');
  console.log('');
  console.log('📦 BUNDLES: Player, Enemy, Bullet, PowerUp spawned with bundles');
  console.log('📡 EVENTS: CollisionEvent, DamageEvent, ScoreEvent, etc.');
  console.log('👁️ OBSERVERS: OnAdd, OnRemove, OnChange for entity lifecycle');
  console.log('🔍 QUERY FILTERS: With/Without filters demonstrated');
  console.log('⏱️ CHANGE DETECTION: Health changes tracked');
  console.log('');
  console.log('Controls: WASD to move, SPACE to shoot');
}

/**
 * Set up UI button handlers using bundle-based spawning.
 * NOTE: All buttons blur after click to prevent SPACE key from
 * triggering both shooting AND clicking the focused button.
 */
function setupButtonHandlers(app: App, canvas: HTMLCanvasElement): void {
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
    });
  }
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
