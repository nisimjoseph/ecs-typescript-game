/**
 * @module game/systems/descriptors
 * @description System descriptors - define system execution order and stages.
 * 
 * System descriptors configure when and in what order systems run.
 * 
 * Interacts with:
 * - All system functions: Creates descriptors for each system
 * - Stage enum: Defines execution stages
 */

import { system, Stage } from '../../ecs';
import {
  inputClearSystem,
  playerInputSystem,
  playerShootSystem,
} from './input';
import { shieldSystem } from './shield';
import { turboSystem } from './turbo';
import {
  movementSystem,
  trailSystem,
  bounceSystem,
} from './movement';
import {
  wanderSystem,
  followTargetSystem,
} from './ai';
import { lifetimeSystem } from './lifetime';
import { explosionSystem } from './explosion';
import {
  bulletEnemyCollisionSystem,
  playerEnemyCollisionSystem,
  playerPowerUpCollisionSystem,
} from './collision';
import { difficultyProgressionSystem } from './difficulty';
import {
  enemySpawnSystem,
  powerUpAutoSpawnSystem,
} from './spawning';
import { renderSystem } from './render';
import { uiUpdateSystem } from './ui';

export const inputClearSystemDescriptor = system(inputClearSystem)
  .label('input_clear')
  .inStage(Stage.First);

export const playerInputSystemDescriptor = system(playerInputSystem)
  .label('player_input')
  .inStage(Stage.PreUpdate);

export const playerShootSystemDescriptor = system(playerShootSystem)
  .label('player_shoot')
  .inStage(Stage.PreUpdate)
  .after('player_input');

export const shieldSystemDescriptor = system(shieldSystem)
  .label('shield')
  .inStage(Stage.PreUpdate)
  .after('player_input');

export const turboSystemDescriptor = system(turboSystem)
  .label('turbo')
  .inStage(Stage.PreUpdate)
  .after('player_input');

export const wanderSystemDescriptor = system(wanderSystem)
  .label('wander')
  .inStage(Stage.Update);

export const followTargetSystemDescriptor = system(followTargetSystem)
  .label('follow_target')
  .inStage(Stage.Update);

export const movementSystemDescriptor = system(movementSystem)
  .label('movement')
  .inStage(Stage.Update)
  .after('wander')
  .after('follow_target');

export const bounceSystemDescriptor = system(bounceSystem)
  .label('bounce')
  .inStage(Stage.Update)
  .after('movement');

export const trailSystemDescriptor = system(trailSystem)
  .label('trail')
  .inStage(Stage.Update)
  .after('movement');

export const lifetimeSystemDescriptor = system(lifetimeSystem)
  .label('lifetime')
  .inStage(Stage.PostUpdate);

export const explosionSystemDescriptor = system(explosionSystem)
  .label('explosion')
  .inStage(Stage.PostUpdate);

export const bulletEnemyCollisionSystemDescriptor = system(bulletEnemyCollisionSystem)
  .label('bullet_enemy_collision')
  .inStage(Stage.PostUpdate);

export const playerEnemyCollisionSystemDescriptor = system(playerEnemyCollisionSystem)
  .label('player_enemy_collision')
  .inStage(Stage.PostUpdate);

export const playerPowerUpCollisionSystemDescriptor = system(playerPowerUpCollisionSystem)
  .label('player_powerup_collision')
  .inStage(Stage.PostUpdate);

export const difficultyProgressionSystemDescriptor = system(difficultyProgressionSystem)
  .label('difficulty_progression')
  .inStage(Stage.Update);

export const enemySpawnSystemDescriptor = system(enemySpawnSystem)
  .label('enemy_spawn')
  .inStage(Stage.PostUpdate);

export const powerUpAutoSpawnSystemDescriptor = system(powerUpAutoSpawnSystem)
  .label('powerup_auto_spawn')
  .inStage(Stage.PostUpdate);

export const renderSystemDescriptor = system(renderSystem)
  .label('render')
  .inStage(Stage.Last);

export const uiUpdateSystemDescriptor = system(uiUpdateSystem)
  .label('ui_update')
  .inStage(Stage.Last);
