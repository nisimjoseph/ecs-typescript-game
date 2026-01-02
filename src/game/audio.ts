/**
 * @module game/audio
 * @description Sound effects manager for game audio.
 * 
 * Manages all game sound effects with embedded audio files.
 * Provides methods to play sounds at specific game events.
 * 
 * Sounds are embedded as base64 data URLs via webpack asset/inline.
 * 
 * Interacts with:
 * - Game systems: Called when events occur (explosions, shooting, etc.)
 * - Resources: Registered as a World resource
 */

// Import all sound effects as embedded base64 data URLs
import bombSound from '../../assets/sfx/bomb.mp3';
import bossExplosionSound from '../../assets/sfx/boss-explosion.mp3';
import enemyExplosion1 from '../../assets/sfx/enemy-explosion-1.mp3';
import enemyExplosion2 from '../../assets/sfx/enemy-explosion-2.mp3';
import enemyExplosion3 from '../../assets/sfx/enemy-explosion-3.mp3';
import enemyExplosion4 from '../../assets/sfx/enemy-explosion-4.mp3';
import gameOverSound from '../../assets/sfx/game-over.mp3';
import playerExplosionSound from '../../assets/sfx/player-explosion.mp3';
import playerFireShootSound from '../../assets/sfx/player-fire-shoot.mp3';
import playerPowerDownSound from '../../assets/sfx/player-power-down.mp3';
import playerPowerUpSound from '../../assets/sfx/player-power-up.mp3';

/** Enemy explosion sounds for random selection */
const ENEMY_EXPLOSION_SOUNDS = [
  enemyExplosion1,
  enemyExplosion2,
  enemyExplosion3,
  enemyExplosion4,
];

/**
 * Sound effect types for type-safe audio playback.
 */
export type SoundEffect =
  | 'bomb'
  | 'bossExplosion'
  | 'enemyExplosion'
  | 'gameOver'
  | 'playerExplosion'
  | 'playerShoot'
  | 'playerPowerDown'
  | 'playerPowerUp';

/**
 * SoundManager resource - handles all game audio playback.
 * 
 * Uses Web Audio API for low-latency sound effects.
 * Sounds are preloaded as AudioBuffer for instant playback.
 */
export class SoundManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private isInitialized = false;
  private masterVolume = 0.5;

  /**
   * Initialize the audio system.
   * Must be called after user interaction (click/keypress) due to browser policies.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new AudioContext();
      
      // Preload all sounds
      await Promise.all([
        this.loadSound('bomb', bombSound),
        this.loadSound('bossExplosion', bossExplosionSound),
        this.loadSound('enemyExplosion1', enemyExplosion1),
        this.loadSound('enemyExplosion2', enemyExplosion2),
        this.loadSound('enemyExplosion3', enemyExplosion3),
        this.loadSound('enemyExplosion4', enemyExplosion4),
        this.loadSound('gameOver', gameOverSound),
        this.loadSound('playerExplosion', playerExplosionSound),
        this.loadSound('playerShoot', playerFireShootSound),
        this.loadSound('playerPowerDown', playerPowerDownSound),
        this.loadSound('playerPowerUp', playerPowerUpSound),
      ]);

      this.isInitialized = true;
      console.log('🔊 SoundManager initialized with all sounds loaded');
    } catch (error) {
      console.error('Failed to initialize SoundManager:', error);
    }
  }

  /**
   * Load a sound from a data URL into an AudioBuffer.
   */
  private async loadSound(name: string, dataUrl: string): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Convert data URL to ArrayBuffer
      const response = await fetch(dataUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds.set(name, audioBuffer);
    } catch (error) {
      console.error(`Failed to load sound "${name}":`, error);
    }
  }

  /**
   * Play a sound by name with optional volume.
   */
  private playSound(name: string, volume: number = 1.0): void {
    if (!this.audioContext || !this.isInitialized) return;

    const buffer = this.sounds.get(name);
    if (!buffer) {
      console.warn(`Sound "${name}" not found`);
      return;
    }

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Create source and gain nodes
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = volume * this.masterVolume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    source.start(0);
  }

  /**
   * Play bomb detonation sound.
   */
  playBomb(): void {
    this.playSound('bomb', 0.8);
  }

  /**
   * Play boss explosion sound.
   */
  playBossExplosion(): void {
    this.playSound('bossExplosion', 1.0);
  }

  /**
   * Play random enemy explosion sound.
   */
  playEnemyExplosion(): void {
    const index = Math.floor(Math.random() * 4) + 1;
    this.playSound(`enemyExplosion${index}`, 0.6);
  }

  /**
   * Play game over sound.
   */
  playGameOver(): void {
    this.playSound('gameOver', 1.0);
  }

  /**
   * Play player explosion sound.
   */
  playPlayerExplosion(): void {
    this.playSound('playerExplosion', 0.9);
  }

  /**
   * Play player shooting sound.
   */
  playPlayerShoot(): void {
    this.playSound('playerShoot', 0.4);
  }

  /**
   * Play player power down (hit) sound.
   */
  playPlayerPowerDown(): void {
    this.playSound('playerPowerDown', 0.7);
  }

  /**
   * Play player power up sound.
   */
  playPlayerPowerUp(): void {
    this.playSound('playerPowerUp', 0.7);
  }

  /**
   * Set master volume (0.0 - 1.0).
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get whether sound system is ready.
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
