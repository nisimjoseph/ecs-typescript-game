/**
 * @module game/components/effects
 * @description Effect components - visual and gameplay effects.
 * 
 * These components create temporary visual effects like explosions.
 * 
 * Interacts with:
 * - Explosion systems: Update and render explosion effects
 */

/**
 * Explosion component - visual explosion effect.
 * Expands over time then despawns.
 */
export class Explosion {
  public currentRadius: number;
  public elapsed: number = 0;
  
  constructor(
    public maxRadius: number = 100,
    public duration: number = 0.5,
    public color: string = '#ff6600',
    public particles: { x: number; y: number; vx: number; vy: number; size: number }[] = []
  ) {
    this.currentRadius = 10;
    // Generate particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      this.particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 6
      });
    }
  }
}
