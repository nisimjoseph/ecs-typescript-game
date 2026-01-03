/**
 * @module game/mobile_controls
 * @description Mobile touch controls for the game.
 * 
 * Provides virtual joystick and action buttons for mobile devices.
 * - Virtual joystick: Circle with inner knob for movement control
 * - Action buttons: Bomb, Shield, Turbo buttons with hold detection
 * 
 * Interacts with:
 * - Input resource: Sets virtual input state
 * - Canvas: Renders touch controls overlay
 */

/** Check if device is mobile/touch capable */
export function isMobileDevice(): boolean {
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  return hasTouchScreen || isMobileUA;
}

/** Touch input state for the game */
export interface TouchInputState {
  // Movement from joystick (-1 to 1)
  moveX: number;
  moveY: number;
  // Action states
  shooting: boolean;
  shieldActive: boolean;
  turboActive: boolean;
  bombTriggered: boolean;
}

/** Configuration for action buttons */
interface ActionButtonConfig {
  id: string;
  icon: string;
  color: string;
  borderColor: string;
  holdTime?: number; // ms required to trigger (for bomb)
}

const ACTION_BUTTONS: ActionButtonConfig[] = [
  { id: 'bomb', icon: '💣', color: 'rgba(255, 136, 0, 0.5)', borderColor: '#ff8800', holdTime: 250 },
  { id: 'shield', icon: '🛡️', color: 'rgba(0, 217, 255, 0.5)', borderColor: '#00d9ff' },
  { id: 'turbo', icon: '🚀', color: 'rgba(255, 102, 0, 0.5)', borderColor: '#ff6600' },
];

/** Callback type for reset button */
export type ResetCallback = () => void;

/**
 * Mobile controls manager - handles touch input and renders controls overlay.
 */
export class MobileControls {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameCanvas: HTMLCanvasElement;
  
  // Joystick state
  private joystickCenter = { x: 0, y: 0 };
  private joystickKnob = { x: 0, y: 0 };
  private joystickRadius = 50;
  private knobRadius = 20;
  private joystickActive = false;
  private joystickTouchId: number | null = null;
  
  // Action button state
  private buttonRadius = 28;
  private buttonPositions: Map<string, { x: number; y: number }> = new Map();
  private activeButtons: Map<string, { touchId: number; startTime: number }> = new Map();
  private bombTriggered = false;
  
  // Shoot button (left side, above action buttons)
  private shootButtonCenter = { x: 0, y: 0 };
  private shootButtonRadius = 32;
  private shootActive = false;
  private shootTouchId: number | null = null;
  
  // Reset button (top center, for game over)
  private resetButtonCenter = { x: 0, y: 0 };
  private resetButtonSize = { width: 120, height: 40 };
  private resetCallback: ResetCallback | null = null;
  private showReset = false;
  
  // Input state
  private inputState: TouchInputState = {
    moveX: 0,
    moveY: 0,
    shooting: false,
    shieldActive: false,
    turboActive: false,
    bombTriggered: false,
  };

  constructor(gameCanvas: HTMLCanvasElement) {
    this.gameCanvas = gameCanvas;
    
    // Create overlay canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'mobile-controls-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: auto;
      z-index: 1000;
      touch-action: none;
    `;
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context for mobile controls');
    this.ctx = ctx;
    
    // Add to DOM
    document.body.appendChild(this.canvas);
    
    // Setup
    this.resize();
    this.setupTouchListeners();
    window.addEventListener('resize', () => this.resize());
    
    // Start render loop
    this.render();
  }

  /** Resize canvas and recalculate positions */
  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
    
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    // Joystick position (bottom-right)
    const joystickMargin = 80;
    this.joystickCenter = {
      x: w - joystickMargin,
      y: h - joystickMargin,
    };
    this.joystickKnob = { ...this.joystickCenter };
    
    // Left side buttons layout (compact 2x2 grid + shoot above)
    const leftMargin = 55;
    const buttonSpacing = 65;
    const bottomOffset = 55;
    
    // Bottom row: Turbo (left), Shield (right)
    this.buttonPositions.set('turbo', {
      x: leftMargin,
      y: h - bottomOffset,
    });
    this.buttonPositions.set('shield', {
      x: leftMargin + buttonSpacing,
      y: h - bottomOffset,
    });
    
    // Top row: Bomb (centered above)
    this.buttonPositions.set('bomb', {
      x: leftMargin + buttonSpacing / 2,
      y: h - bottomOffset - buttonSpacing,
    });
    
    // Shoot button (left side, above the action buttons grid)
    this.shootButtonCenter = {
      x: leftMargin + buttonSpacing / 2,
      y: h - bottomOffset - buttonSpacing * 2,
    };
    
    // Reset button (top center)
    this.resetButtonCenter = {
      x: w / 2,
      y: 40,
    };
  }

  /** Setup touch event listeners */
  private setupTouchListeners(): void {
    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    this.canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    
    for (const touch of Array.from(e.changedTouches)) {
      const x = touch.clientX;
      const y = touch.clientY;
      
      // Check joystick
      const joystickDist = this.distance(x, y, this.joystickCenter.x, this.joystickCenter.y);
      if (joystickDist <= this.joystickRadius && this.joystickTouchId === null) {
        this.joystickActive = true;
        this.joystickTouchId = touch.identifier;
        this.updateJoystickKnob(x, y);
        continue;
      }
      
      // Check shoot button
      const shootDist = this.distance(x, y, this.shootButtonCenter.x, this.shootButtonCenter.y);
      if (shootDist <= this.shootButtonRadius && this.shootTouchId === null) {
        this.shootActive = true;
        this.shootTouchId = touch.identifier;
        this.inputState.shooting = true;
        continue;
      }
      
      // Check action buttons
      for (const [id, pos] of this.buttonPositions) {
        const dist = this.distance(x, y, pos.x, pos.y);
        if (dist <= this.buttonRadius && !this.activeButtons.has(id)) {
          this.activeButtons.set(id, {
            touchId: touch.identifier,
            startTime: Date.now(),
          });
          
          // Immediate activation for shield/turbo
          if (id === 'shield') {
            this.inputState.shieldActive = true;
          } else if (id === 'turbo') {
            this.inputState.turboActive = true;
          }
          break;
        }
      }
      
      // Check reset button
      if (this.showReset) {
        const { x: rx, y: ry } = this.resetButtonCenter;
        const halfW = this.resetButtonSize.width / 2;
        const halfH = this.resetButtonSize.height / 2;
        const inResetButton = x >= rx - halfW && x <= rx + halfW && y >= ry - halfH && y <= ry + halfH;
        if (inResetButton && this.resetCallback) {
          this.resetCallback();
        }
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    
    for (const touch of Array.from(e.changedTouches)) {
      // Update joystick
      if (touch.identifier === this.joystickTouchId) {
        this.updateJoystickKnob(touch.clientX, touch.clientY);
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    
    for (const touch of Array.from(e.changedTouches)) {
      // Release joystick
      if (touch.identifier === this.joystickTouchId) {
        this.joystickActive = false;
        this.joystickTouchId = null;
        this.joystickKnob = { ...this.joystickCenter };
        this.inputState.moveX = 0;
        this.inputState.moveY = 0;
      }
      
      // Release shoot button
      if (touch.identifier === this.shootTouchId) {
        this.shootActive = false;
        this.shootTouchId = null;
        this.inputState.shooting = false;
      }
      
      // Release action buttons
      for (const [id, state] of this.activeButtons) {
        if (state.touchId === touch.identifier) {
          this.activeButtons.delete(id);
          
          if (id === 'shield') {
            this.inputState.shieldActive = false;
          } else if (id === 'turbo') {
            this.inputState.turboActive = false;
          }
          break;
        }
      }
    }
  }

  private updateJoystickKnob(touchX: number, touchY: number): void {
    const dx = touchX - this.joystickCenter.x;
    const dy = touchY - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Clamp to joystick radius
    const maxDist = this.joystickRadius - this.knobRadius / 2;
    if (dist > maxDist) {
      const scale = maxDist / dist;
      this.joystickKnob = {
        x: this.joystickCenter.x + dx * scale,
        y: this.joystickCenter.y + dy * scale,
      };
    } else {
      this.joystickKnob = { x: touchX, y: touchY };
    }
    
    // Calculate normalized input (-1 to 1)
    this.inputState.moveX = (this.joystickKnob.x - this.joystickCenter.x) / maxDist;
    this.inputState.moveY = (this.joystickKnob.y - this.joystickCenter.y) / maxDist;
  }

  private distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  /** Update and check bomb trigger (call each frame) */
  update(): void {
    this.bombTriggered = false;
    
    const bombState = this.activeButtons.get('bomb');
    if (bombState) {
      const holdDuration = Date.now() - bombState.startTime;
      const config = ACTION_BUTTONS.find((b) => b.id === 'bomb');
      if (config?.holdTime && holdDuration >= config.holdTime) {
        this.bombTriggered = true;
        this.inputState.bombTriggered = true;
        // Reset so it only triggers once per hold
        bombState.startTime = Date.now() + 100000; // Prevent re-trigger
      }
    } else {
      this.inputState.bombTriggered = false;
    }
  }

  /** Get current touch input state */
  getInputState(): TouchInputState {
    return { ...this.inputState };
  }

  /** Set callback for reset button */
  setResetCallback(callback: ResetCallback): void {
    this.resetCallback = callback;
  }

  /** Show or hide the reset button (for game over state) */
  setShowReset(show: boolean): void {
    this.showReset = show;
  }

  /** Render controls overlay */
  private render = (): void => {
    this.update();
    
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    // Clear
    ctx.clearRect(0, 0, w, h);
    
    // Draw joystick
    this.drawJoystick(ctx);
    
    // Draw shoot button
    this.drawShootButton(ctx);
    
    // Draw action buttons
    this.drawActionButtons(ctx);
    
    // Draw reset button if visible
    if (this.showReset) {
      this.drawResetButton(ctx);
    }
    
    requestAnimationFrame(this.render);
  };

  private drawJoystick(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.joystickCenter;
    
    // Outer circle (25% alpha background)
    ctx.beginPath();
    ctx.arc(x, y, this.joystickRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Inner knob (50% alpha)
    ctx.beginPath();
    ctx.arc(this.joystickKnob.x, this.joystickKnob.y, this.knobRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.joystickActive 
      ? 'rgba(255, 255, 255, 0.7)' 
      : 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawShootButton(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.shootButtonCenter;
    
    // Button background
    ctx.beginPath();
    ctx.arc(x, y, this.shootButtonRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.shootActive 
      ? 'rgba(255, 255, 0, 0.7)' 
      : 'rgba(255, 255, 0, 0.4)';
    ctx.fill();
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Icon
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('🔫', x, y);
  }

  private drawActionButtons(ctx: CanvasRenderingContext2D): void {
    for (const config of ACTION_BUTTONS) {
      const pos = this.buttonPositions.get(config.id);
      if (!pos) continue;
      
      const isActive = this.activeButtons.has(config.id);
      const buttonState = this.activeButtons.get(config.id);
      
      // Calculate hold progress for bomb
      let holdProgress = 0;
      if (config.id === 'bomb' && buttonState && config.holdTime) {
        holdProgress = Math.min(1, (Date.now() - buttonState.startTime) / config.holdTime);
      }
      
      // Button background
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.buttonRadius, 0, Math.PI * 2);
      ctx.fillStyle = isActive 
        ? config.color.replace('0.5', '0.8') 
        : config.color;
      ctx.fill();
      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Hold progress ring for bomb
      if (config.id === 'bomb' && holdProgress > 0 && holdProgress < 1) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, this.buttonRadius + 5, -Math.PI / 2, -Math.PI / 2 + holdProgress * Math.PI * 2);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      
      // Icon
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(config.icon, pos.x, pos.y);
    }
  }

  private drawResetButton(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.resetButtonCenter;
    const { width, height } = this.resetButtonSize;
    
    // Button background
    ctx.fillStyle = 'rgba(0, 255, 136, 0.8)';
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - height / 2, width, height, 8);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Text
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0a0a0f';
    ctx.fillText('RESTART', x, y);
  }

  /** Show the mobile controls */
  show(): void {
    this.canvas.style.display = 'block';
  }

  /** Hide the mobile controls */
  hide(): void {
    this.canvas.style.display = 'none';
  }

  /** Destroy and cleanup */
  destroy(): void {
    this.canvas.remove();
  }
}
