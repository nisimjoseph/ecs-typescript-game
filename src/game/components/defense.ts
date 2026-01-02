/**
 * @module game/components/defense
 * @description Defense components - shield and turbo abilities.
 * 
 * These components provide defensive and mobility abilities for the player.
 * 
 * Interacts with:
 * - Shield systems: Activate/deactivate shield, drain/recharge power
 * - Turbo systems: Activate/deactivate turbo, drain/recharge power
 * - Collision systems: Check if shield is active to block damage
 * - Movement systems: Apply turbo speed multiplier
 */

/**
 * Shield component - player's energy shield.
 * - Max 2 seconds of shield time
 * - Recharges at 0.1 sec per second (10 sec to charge 1 sec of shield)
 * - When active, player is invulnerable
 */
export class Shield {
  /** Current shield power in seconds (0 to maxPower) */
  public current: number;
  /** Maximum shield power in seconds */
  public readonly maxPower: number = 2.0;
  /** Recharge rate: seconds of shield gained per real second */
  public readonly rechargeRate: number = 0.1;
  /** Whether shield is currently active */
  public isActive: boolean = false;

  constructor(startPower: number = 2.0) {
    this.current = Math.min(startPower, this.maxPower);
  }

  /**
   * Activate shield (start blocking).
   * Returns true if shield can be activated.
   */
  activate(): boolean {
    if (this.current > 0) {
      this.isActive = true;
      return true;
    }
    return false;
  }

  /**
   * Deactivate shield (stop blocking, start recharging).
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * Drain shield power while active.
   * Returns true if shield is still active after drain.
   */
  drain(deltaTime: number): boolean {
    if (!this.isActive) return false;

    this.current -= deltaTime;
    if (this.current <= 0) {
      this.current = 0;
      this.isActive = false;
      return false;
    }
    return true;
  }

  /**
   * Recharge shield when not active.
   */
  recharge(deltaTime: number): void {
    if (this.isActive) return;

    this.current = Math.min(this.maxPower, this.current + this.rechargeRate * deltaTime);
  }

  /**
   * Get shield percentage (0 to 1).
   */
  getPercentage(): number {
    return this.current / this.maxPower;
  }
}

/**
 * Turbo component - speed boost for player.
 * 2 seconds of turbo power, 150% speed boost.
 * Recharges when not active (10 seconds to fully recharge).
 */
export class Turbo {
  public current: number;
  public isActive: boolean = false;

  constructor(
    public maxPower: number = 2.0,          // 2 seconds of turbo
    public speedMultiplier: number = 1.5,   // 150% speed
    public rechargeRate: number = 0.1       // 0.1 per second = 10 seconds to full
  ) {
    this.current = maxPower;
  }

  /**
   * Activate turbo if there's power available.
   */
  activate(): boolean {
    if (this.current > 0) {
      this.isActive = true;
      return true;
    }
    return false;
  }

  /**
   * Deactivate turbo.
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * Drain turbo power while active.
   * Returns true if still active, false if depleted.
   */
  drain(deltaTime: number): boolean {
    if (!this.isActive) return false;

    this.current = Math.max(0, this.current - deltaTime);
    
    if (this.current <= 0) {
      this.isActive = false;
      return false;
    }
    return true;
  }

  /**
   * Recharge turbo when not active.
   */
  recharge(deltaTime: number): void {
    if (this.isActive) return;

    this.current = Math.min(this.maxPower, this.current + this.rechargeRate * deltaTime);
  }

  /**
   * Get turbo percentage (0 to 1).
   */
  getPercentage(): number {
    return this.current / this.maxPower;
  }
}
