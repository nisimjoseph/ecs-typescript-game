/**
 * @module game/components/visual
 * @description Visual components - sprite and trail rendering.
 * 
 * These components control how entities appear on screen.
 * 
 * Interacts with:
 * - Render systems: Draw sprites and trails
 * - Movement systems: Update trail positions
 */

/**
 * Sprite component - visual representation.
 */
export class Sprite {
  constructor(
    public color: string = '#ffffff',
    public shape: 'rect' | 'circle' | 'triangle' | 'spaceship' = 'rect'
  ) {}
}

/**
 * Trail component - leaves a trail behind.
 */
export class Trail {
  positions: { x: number; y: number; alpha: number }[] = [];

  constructor(
    public color: string = '#ffffff',
    public maxLength: number = 10
  ) {}

  addPoint(x: number, y: number): void {
    this.positions.unshift({ x, y, alpha: 1 });
    if (this.positions.length > this.maxLength) {
      this.positions.pop();
    }
    // Fade older points
    for (let i = 0; i < this.positions.length; i++) {
      this.positions[i].alpha = 1 - i / this.maxLength;
    }
  }
}
