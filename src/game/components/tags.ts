/**
 * @module game/components/tags
 * @description Tag components - marker components with no data.
 * 
 * Tag components identify entity types. They have no data fields,
 * only marking entities as Player, Enemy, Bullet, etc.
 * 
 * Interacts with:
 * - Query systems: Filter entities by tag
 * - Collision systems: Identify entity types
 */

/**
 * Player tag - marks the player entity.
 */
export class Player {}

/**
 * Enemy tag - marks enemy entities.
 */
export class Enemy {}

/**
 * Bullet tag - marks bullet entities.
 */
export class Bullet {}

/**
 * PowerUp tag - marks power-up entities.
 */
export class PowerUp {}

/**
 * Boss tag - marks boss enemy entities.
 * Only ONE boss can exist at a time.
 */
export class Boss {}
