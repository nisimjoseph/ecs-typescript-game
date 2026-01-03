/**
 * @module main
 * @description Entry point for the ECS game demo - FULL FEATURE DEMONSTRATION.
 * 
 * This file wires together all game modules and starts the game loop.
 * 
 * FEATURES DEMONSTRATED:
 * - BUNDLES: Grouped component spawning
 * - EVENTS: Decoupled communication
 * - OBSERVERS: Reactive component hooks
 * - CHANGE DETECTION: Track component changes
 * - QUERY FILTERS: With/Without filters
 * - MOBILE SUPPORT: Touch controls with virtual joystick
 * 
 * Interacts with:
 * - All ECS modules for core functionality
 * - game/logic modules for game-specific systems
 * - game/systems for reusable systems
 * - game/mobile_controls for touch input
 */

import { App, ObserverRegistry } from './ecs';
import {
  GameConfig,
  GameState,
  CanvasContext,
  Logger,
  SpawnTimer,
  ShootCooldown,
  BossSpawnTimer,
  Input,
  SoundManager,
  MobileControlsResource,
} from './game/resources';
import { GameEvents } from './game/events';
import { MobileControls, isMobileDevice } from './game/mobile_controls';

// Import system descriptors from game/systems
import {
  inputClearSystemDescriptor,
  mobileInputSyncSystemDescriptor,
  playerInputSystemDescriptor,
  playerShootSystemDescriptor,
  shieldSystemDescriptor,
  turboSystemDescriptor,
  bombSystemDescriptor,
  wanderSystemDescriptor,
  followTargetSystemDescriptor,
  movementSystemDescriptor,
  bounceSystemDescriptor,
  trailSystemDescriptor,
  lifetimeSystemDescriptor,
  explosionSystemDescriptor,
  enemySpawnSystemDescriptor,
  powerUpAutoSpawnSystemDescriptor,
  renderSystemDescriptor,
  uiUpdateSystemDescriptor,
} from './game/systems';

// Import logic modules
import {
  setupObserversSystem,
  spawnPlayerSystem,
  processEventsSystemDescriptor,
  updateEventsSystemDescriptor,
  detectHealthChangesSystemDescriptor,
  collisionWithEventsSystemDescriptor,
  bossSpawnSystemDescriptor,
  setupButtonHandlers,
  resetGame,
} from './game/logic';

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

  // Check for mobile mode
  const isMobile = isMobileDevice();
  console.log(`📱 Mobile mode: ${isMobile}`);

  // Set canvas size based on mode
  if (isMobile) {
    document.body.classList.add('mobile-mode');
    
    // Get device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;
    
    // Set canvas buffer to match display size (accounting for DPR)
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    // Scale canvas CSS to fill screen
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    
    // Scale context to account for DPR
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    
    // Handle resize for mobile
    window.addEventListener('resize', () => {
      const newDpr = window.devicePixelRatio || 1;
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      canvas.width = newWidth * newDpr;
      canvas.height = newHeight * newDpr;
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;
      
      const resizeCtx = canvas.getContext('2d');
      if (resizeCtx) {
        resizeCtx.scale(newDpr, newDpr);
      }
    });
  } else {
    canvas.width = 800;
    canvas.height = 500;
  }

  // Create sound manager and initialize on first user interaction
  const soundManager = new SoundManager();
  
  // Initialize audio on first user interaction (browser autoplay policy)
  const initAudio = () => {
    soundManager.initialize();
    window.removeEventListener('click', initAudio);
    window.removeEventListener('keydown', initAudio);
    window.removeEventListener('touchstart', initAudio);
  };
  window.addEventListener('click', initAudio);
  window.addEventListener('keydown', initAudio);
  window.addEventListener('touchstart', initAudio);
  
  // Create input resource
  const inputResource = new Input();
  
  // Initialize mobile controls if on mobile
  let mobileControls: MobileControls | null = null;
  if (isMobile) {
    mobileControls = new MobileControls(canvas);
    inputResource.setMobileMode(true);
    console.log('📱 Mobile controls initialized');
  }

  // Calculate logical canvas size (for game logic, not buffer size)
  const logicalWidth = isMobile ? window.innerWidth : canvas.width;
  const logicalHeight = isMobile ? window.innerHeight : canvas.height;

  // Create the App with ALL features
  const app = new App()
    // ============ RESOURCES ============
    .insertResource(new GameConfig(logicalWidth, logicalHeight))
    .insertResource(new GameState())
    .insertResource(inputResource) // Use the pre-configured input resource
    .insertResource(new MobileControlsResource(mobileControls)) // Mobile controls
    .insertResource(new CanvasContext(canvas))
    .insertResource(new Logger())
    .insertResource(new SpawnTimer(2))
    .insertResource(new ShootCooldown(0.15))
    .insertResource(new BossSpawnTimer(15)) // Boss spawns every 15 seconds
    .insertResource(soundManager) // Sound effects manager
    // Event system resource
    .insertResource(new GameEvents())
    // Observer registry resource
    .insertResource(new ObserverRegistry())

    // ============ STARTUP SYSTEMS ============
    .addStartupSystem(setupObserversSystem) // Setup observers first
    .addStartupSystem(spawnPlayerSystem)    // Then spawn player

    // ============ FRAME SYSTEMS ============

    // Stage.PreUpdate: Input processing (mobile sync first)
    .addSystem(mobileInputSyncSystemDescriptor)
    .addSystem(playerInputSystemDescriptor)
    .addSystem(playerShootSystemDescriptor)
    .addSystem(shieldSystemDescriptor)
    .addSystem(turboSystemDescriptor)
    .addSystem(bombSystemDescriptor)

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
    .addSystem(updateEventsSystemDescriptor) // Update event buffers
    .addSystem(inputClearSystemDescriptor); // Clear justPressed at end of frame

  // Set up button handlers with bundle-based spawning
  setupButtonHandlers(app, canvas);

  // Set up mobile callbacks
  if (mobileControls) {
    // Reset callback
    mobileControls.setResetCallback(() => {
      resetGame(app, app.getWorld(), canvas);
      // Re-setup mobile mode after reset
      const newInput = app.getWorld().getResource(Input);
      if (newInput) {
        newInput.setMobileMode(true);
      }
      // Update mobile controls resource
      const mobileRes = app.getWorld().getResource(MobileControlsResource);
      if (mobileRes) {
        mobileRes.controls = mobileControls;
      }
    });
    
    // Mute callback
    mobileControls.setMuteCallback((muted: boolean) => {
      soundManager.setMuted(muted);
    });
  }

  // Run the game!
  app.run();

  console.log('✅ Game running with ALL ECS features!');
  console.log('');
  console.log('📦 BUNDLES: Player, Enemy, Bullet, PowerUp spawned with bundles');
  console.log('📡 EVENTS: CollisionEvent, DamageEvent, ScoreEvent, etc.');
  console.log('👁️ OBSERVERS: OnAdd, OnRemove, OnChange for entity lifecycle');
  console.log('🔍 QUERY FILTERS: With/Without filters demonstrated');
  console.log('⏱️ CHANGE DETECTION: Health changes tracked');
  console.log('🔊 SOUND EFFECTS: Embedded MP3 audio for all game events');
  console.log('');
  console.log('Controls: WASD to move, SPACE to shoot');
}

// Import difficulty system descriptor
import { difficultyProgressionSystemDescriptor } from './game/systems';

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
