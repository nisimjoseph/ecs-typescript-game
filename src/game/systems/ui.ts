/**
 * @module game/systems/ui
 * @description UI update system - updates HTML elements with game stats.
 * 
 * Updates sidebar UI elements like score, FPS, shield/turbo bars.
 * 
 * Interacts with:
 * - GameState resource: Reads score and game state
 * - Time resource: Calculates FPS
 * - Shield, Turbo components: Updates progress bars
 */

import { World, Time } from '../../ecs';
import { Shield, Turbo, Player } from '../components';
import { GameState } from '../resources';
import { isBombAvailable } from './bomb';

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

  // Update shield bar
  const shieldQuery = world.query(Shield, Player);
  const shieldResult = shieldQuery.single();
  if (shieldResult) {
    const shield = shieldResult[1];
    const shieldPercent = Math.round(shield.getPercentage() * 100);
    
    const shieldBarEl = document.getElementById('shield-bar');
    const shieldPercentEl = document.getElementById('shield-percent');
    
    if (shieldBarEl) {
      shieldBarEl.style.width = `${shieldPercent}%`;
      // Change color based on active state
      if (shield.isActive) {
        shieldBarEl.style.background = 'linear-gradient(90deg, #00ffff, #ffffff)';
      } else {
        shieldBarEl.style.background = 'linear-gradient(90deg, #00d9ff, #00ffff)';
      }
    }
    if (shieldPercentEl) {
      shieldPercentEl.textContent = `${shieldPercent}%`;
    }
  }

  // Update turbo bar
  const turboQuery = world.query(Turbo, Player);
  const turboResult = turboQuery.single();
  if (turboResult) {
    const turbo = turboResult[1];
    const turboPercent = Math.round(turbo.getPercentage() * 100);
    
    const turboBarEl = document.getElementById('turbo-bar');
    const turboPercentEl = document.getElementById('turbo-percent');
    
    if (turboBarEl) {
      turboBarEl.style.width = `${turboPercent}%`;
      // Change color based on active state
      if (turbo.isActive) {
        turboBarEl.style.background = 'linear-gradient(90deg, #ff6600, #ffaa00)';
      } else {
        turboBarEl.style.background = 'linear-gradient(90deg, #cc4400, #ff6600)';
      }
    }
    if (turboPercentEl) {
      turboPercentEl.textContent = `${turboPercent}%`;
    }
  }

  // Update bomb indicator
  if (shieldResult && turboResult) {
    const shield = shieldResult[1];
    const turbo = turboResult[1];
    const bombReady = isBombAvailable(shield, turbo);
    
    const bombIndicatorEl = document.getElementById('bomb-indicator');
    const bombStatusEl = document.getElementById('bomb-status');
    
    if (bombIndicatorEl && bombStatusEl) {
      if (bombReady) {
        bombIndicatorEl.style.border = '1px solid #ffff00';
        bombIndicatorEl.style.background = 'rgba(255, 255, 0, 0.1)';
        bombStatusEl.textContent = 'READY!';
        bombStatusEl.style.color = '#ffff00';
        bombStatusEl.style.background = '#553300';
      } else {
        bombIndicatorEl.style.border = '1px dashed #555';
        bombIndicatorEl.style.background = 'rgba(0, 0, 0, 0.3)';
        bombStatusEl.textContent = 'NOT READY';
        bombStatusEl.style.color = '#888';
        bombStatusEl.style.background = '#333';
      }
    }
  }
}
