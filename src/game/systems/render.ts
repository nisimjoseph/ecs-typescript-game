/**
 * @module game/systems/render
 * @description Render system - draws all entities to canvas.
 * 
 * Handles rendering of sprites, trails, health bars, explosions, and UI overlays.
 * 
 * Interacts with:
 * - CanvasContext resource: Provides canvas rendering context
 * - All visual components: Sprite, Trail, Explosion, Health, Shield, Turbo
 */

import { World } from '../../ecs';
import {
  Position,
  Size,
  Sprite,
  Rotation,
  Trail,
  Health,
  Shield,
  Turbo,
  Explosion,
  Player,
} from '../components';
import { CanvasContext, GameState } from '../resources';

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

    if (hasRotation && sprite.shape === 'spaceship') {
      // Draw spaceship (player) with clear direction indication
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(rotationResult.angle + Math.PI / 2); // +PI/2 because ship points up by default
      
      const w = size.width;
      const h = size.height;
      
      // Main body (red)
      ctx.fillStyle = '#ff3333';
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.6); // Nose tip
      ctx.lineTo(w * 0.25, -h * 0.1); // Right shoulder
      ctx.lineTo(w * 0.2, h * 0.4); // Right bottom
      ctx.lineTo(-w * 0.2, h * 0.4); // Left bottom
      ctx.lineTo(-w * 0.25, -h * 0.1); // Left shoulder
      ctx.closePath();
      ctx.fill();
      
      // Left wing
      ctx.fillStyle = '#cc2222';
      ctx.beginPath();
      ctx.moveTo(-w * 0.25, -h * 0.1);
      ctx.lineTo(-w * 0.5, h * 0.3);
      ctx.lineTo(-w * 0.4, h * 0.5);
      ctx.lineTo(-w * 0.2, h * 0.4);
      ctx.closePath();
      ctx.fill();
      
      // Right wing
      ctx.beginPath();
      ctx.moveTo(w * 0.25, -h * 0.1);
      ctx.lineTo(w * 0.5, h * 0.3);
      ctx.lineTo(w * 0.4, h * 0.5);
      ctx.lineTo(w * 0.2, h * 0.4);
      ctx.closePath();
      ctx.fill();
      
      // Cockpit window (light area showing direction)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.45); // Top of window
      ctx.lineTo(w * 0.1, -h * 0.15);
      ctx.lineTo(-w * 0.1, -h * 0.15);
      ctx.closePath();
      ctx.fill();
      
      // Engine glow (back of ship)
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(0, h * 0.35, w * 0.12, 0, Math.PI * 2);
      ctx.fill();
      
      // Wing tips (antenna-like)
      ctx.fillStyle = '#ff3333';
      ctx.beginPath();
      ctx.arc(-w * 0.45, h * 0.4, w * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w * 0.45, h * 0.4, w * 0.08, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
      
      // Draw shield circle if player has active shield
      const shieldQuery = world.query(Shield, Player);
      const shieldResult = shieldQuery.single();
      if (shieldResult) {
        const playerShield = shieldResult[1];
        if (playerShield.isActive) {
          // Draw shield circle around player
          const shieldRadius = Math.max(w, h) * 0.8;
          ctx.save();
          ctx.strokeStyle = '#00d9ff';
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 100) * 0.2; // Pulsing effect
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, shieldRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner glow
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, shieldRadius - 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else if (hasRotation && sprite.shape === 'triangle') {
      // Draw rotated triangle (fallback)
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(rotationResult.angle + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -size.height / 2);
      ctx.lineTo(-size.width / 2, size.height / 2);
      ctx.lineTo(size.width / 2, size.height / 2);
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

  // Draw shield bar for player (blue bar below health bar)
  const playerShieldQuery = world.query(Position, Size, Shield, Player);
  const playerShieldResult = playerShieldQuery.single();
  if (playerShieldResult) {
    const [, pos, size, shield] = playerShieldResult;
    const shieldPercent = shield.getPercentage();
    const barWidth = size.width;
    const barHeight = 4;
    const barY = pos.y - size.height / 2 - 14; // Above the health bar

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(pos.x - barWidth / 2, barY, barWidth, barHeight);

    // Shield fill (blue, brighter when active)
    const shieldColor = shield.isActive ? '#00ffff' : '#00a0d9';
    ctx.fillStyle = shieldColor;
    ctx.fillRect(pos.x - barWidth / 2, barY, barWidth * shieldPercent, barHeight);

    // Border when active
    if (shield.isActive) {
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(pos.x - barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2);
    }
  }

  // Draw turbo bar for player (red/orange bar above shield bar)
  const playerTurboQuery = world.query(Position, Size, Turbo, Player);
  const playerTurboResult = playerTurboQuery.single();
  if (playerTurboResult) {
    const [, pos, size, turbo] = playerTurboResult;
    const turboPercent = turbo.getPercentage();
    const barWidth = size.width;
    const barHeight = 4;
    const barY = pos.y - size.height / 2 - 20; // Above the shield bar

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(pos.x - barWidth / 2, barY, barWidth, barHeight);

    // Turbo fill (orange, brighter when active)
    const turboColor = turbo.isActive ? '#ff6600' : '#cc4400';
    ctx.fillStyle = turboColor;
    ctx.fillRect(pos.x - barWidth / 2, barY, barWidth * turboPercent, barHeight);

    // Border when active
    if (turbo.isActive) {
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 1;
      ctx.strokeRect(pos.x - barWidth / 2 - 1, barY - 1, barWidth + 2, barHeight + 2);
    }
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
