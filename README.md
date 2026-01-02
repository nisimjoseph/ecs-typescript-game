# 🎮 Bevy ECS TypeScript Implementation

A **complete** Entity Component System (ECS) implementation in TypeScript, inspired by [Bevy Engine](https://bevyengine.org/). This project demonstrates the full ECS architecture with all advanced features.

## ✅ Features Implemented

### Core ECS (100%)
- **Entity Management** - ID allocation, generations, recycling
- **Component System** - Registration, storage, metadata
- **World Container** - Central data store
- **Query System** - Type-safe component queries with filters
- **Commands** - Deferred entity operations
- **Resources** - Global singleton data
- **System Scheduling** - Stage-based execution

### Advanced Features (100%)
- **Archetypes** - Entities grouped by component layout
- **Storage Backends** - Table (dense) and SparseSet (sparse)
- **Change Detection** - Added/Changed filters, Mut<T> wrapper
- **Bundles** - Grouped component spawning
- **Events** - Double-buffered event system
- **Observers** - Reactive component hooks (OnAdd/OnChange/OnRemove)
- **Hierarchy** - Parent/Child relationships
- **Query Filters** - With/Without/Added/Changed

---

## 📊 Architecture Diagrams

### ECS Core Architecture

```mermaid
graph TB
    subgraph "🌍 World"
        EA[EntityAllocator]
        CR[ComponentRegistry]
        RR[ResourceRegistry]
        CMD[Commands]
    end

    subgraph "📦 Storage"
        ARCH[Archetypes]
        TABLE[Table Storage]
        SPARSE[SparseSet Storage]
    end

    subgraph "⚙️ Systems"
        SCHED[Schedule]
        S1[System 1]
        S2[System 2]
        S3[System N]
    end

    subgraph "🔍 Query"
        Q[Query]
        QF[Query Filters]
    end

    EA --> ARCH
    CR --> TABLE
    CR --> SPARSE
    ARCH --> TABLE
    
    SCHED --> S1
    SCHED --> S2
    SCHED --> S3
    
    S1 --> Q
    S2 --> Q
    S3 --> Q
    
    Q --> QF
    Q --> CR
    Q --> EA
    
    S1 --> CMD
    S2 --> CMD
    CMD --> EA
    CMD --> CR
```

### System Execution Flow

```mermaid
flowchart LR
    subgraph "Stage.First"
        IC[inputClearSystem]
    end
    
    subgraph "Stage.PreUpdate"
        PI[playerInputSystem]
        PS[playerShootSystem]
    end
    
    subgraph "Stage.Update"
        WS[wanderSystem]
        FT[followTargetSystem]
        MS[movementSystem]
        BS[bounceSystem]
        TS[trailSystem]
    end
    
    subgraph "Stage.PostUpdate"
        LS[lifetimeSystem]
        ES[explosionSystem]
        CS[collisionSystem]
        PE[processEventsSystem]
        ESP[enemySpawnSystem]
    end
    
    subgraph "Stage.Last"
        RS[renderSystem]
        UI[uiUpdateSystem]
        UE[updateEventsSystem]
    end
    
    IC --> PI --> PS --> WS --> FT --> MS --> BS --> TS
    TS --> LS --> ES --> CS --> PE --> ESP
    ESP --> RS --> UI --> UE
    
    UE -->|"Next Frame"| IC
```

### Entity-Component Relationships

```mermaid
erDiagram
    ENTITY ||--o{ POSITION : has
    ENTITY ||--o{ VELOCITY : has
    ENTITY ||--o{ SIZE : has
    ENTITY ||--o{ HEALTH : has
    ENTITY ||--o{ SPRITE : has
    ENTITY ||--o{ COLLIDER : has
    ENTITY ||--o{ TRAIL : has
    ENTITY ||--o{ LIFETIME : has
    ENTITY ||--o{ DAMAGE : has
    
    ENTITY ||--o| PLAYER : "is a"
    ENTITY ||--o| ENEMY : "is a"
    ENTITY ||--o| BULLET : "is a"
    ENTITY ||--o| POWERUP : "is a"
    
    ENEMY ||--o| WANDER : "AI type"
    ENEMY ||--o| FOLLOWTARGET : "AI type"
    
    PLAYER {
        tag marker
    }
    POSITION {
        float x
        float y
    }
    VELOCITY {
        float x
        float y
    }
    HEALTH {
        int current
        int max
    }
```

### Bundle System

```mermaid
classDiagram
    class Bundle {
        <<interface>>
        +components() object[]
    }
    
    class PlayerBundle {
        +x: number
        +y: number
        +health: number
        +components() object[]
    }
    
    class EnemyBundle {
        +x: number
        +y: number
        +health: number
        +damage: number
        +components() object[]
    }
    
    class WanderingEnemyBundle {
        +x: number
        +y: number
        +components() object[]
    }
    
    class ChasingEnemyBundle {
        +x: number
        +y: number
        +targetX: number
        +targetY: number
        +components() object[]
    }
    
    class BulletBundle {
        +x: number
        +y: number
        +velocityY: number
        +damage: number
        +components() object[]
    }
    
    class PowerUpBundle {
        +x: number
        +y: number
        +healAmount: number
        +components() object[]
    }
    
    Bundle <|.. PlayerBundle
    Bundle <|.. EnemyBundle
    Bundle <|.. BulletBundle
    Bundle <|.. PowerUpBundle
    EnemyBundle <|-- WanderingEnemyBundle
    EnemyBundle <|-- ChasingEnemyBundle
```

### Event System Flow

```mermaid
sequenceDiagram
    participant S1 as System A
    participant EW as EventWriter
    participant EB as Event Buffer
    participant ER as EventReader
    participant S2 as System B
    
    Note over EB: Frame N
    S1->>EW: send(CollisionEvent)
    EW->>EB: Push to current buffer
    
    Note over EB: End of Frame N
    EB->>EB: Swap buffers
    
    Note over EB: Frame N+1
    S2->>ER: iter()
    ER->>EB: Read from previous buffer
    EB-->>S2: CollisionEvent
    S2->>S2: Handle event
```

### Event Types

```mermaid
graph TB
    subgraph "🎯 Entity Lifecycle"
        ES[EntitySpawnedEvent]
        ED[EntityDespawnedEvent]
    end
    
    subgraph "💥 Collision"
        CE[CollisionEvent]
        BH[BulletHitEvent]
        PH[PlayerHitEvent]
        PC[PowerUpCollectedEvent]
    end
    
    subgraph "⚔️ Combat"
        DE[DamageEvent]
        EK[EntityKilledEvent]
    end
    
    subgraph "🎮 Game State"
        SC[ScoreChangedEvent]
        GO[GameOverEvent]
        GS[GameStartEvent]
    end
    
    subgraph "👤 Player"
        PSH[PlayerShootEvent]
        PHC[PlayerHealthChangedEvent]
    end
    
    CE --> BH
    CE --> PH
    CE --> PC
    BH --> DE
    PH --> DE
    DE --> EK
    EK --> SC
    EK --> GO
    PC --> SC
    PSH --> ES
```

### Observer Pattern

```mermaid
flowchart TB
    subgraph "Component Lifecycle"
        ADD[Component Added]
        CHG[Component Changed]
        REM[Component Removed]
    end
    
    subgraph "Observer Registry"
        OR[ObserverRegistry]
        OA[OnAdd Observers]
        OC[OnChange Observers]
        ORE[OnRemove Observers]
    end
    
    subgraph "Observer Callbacks"
        LA[Log Spawn]
        TH[Track Health]
        UD[Update Death]
        US[Update Score]
    end
    
    ADD --> OR
    CHG --> OR
    REM --> OR
    
    OR --> OA
    OR --> OC
    OR --> ORE
    
    OA --> LA
    OC --> TH
    ORE --> UD
    ORE --> US
```

### Storage Architecture

```mermaid
graph TB
    subgraph "Component Registry"
        CR[ComponentRegistry]
    end
    
    subgraph "Storage Strategy Selection"
        SS{Storage Type?}
    end
    
    subgraph "Table Storage"
        T[Table]
        TC1[Column: Position]
        TC2[Column: Velocity]
        TC3[Column: Health]
        TR[Rows = Entities]
    end
    
    subgraph "SparseSet Storage"
        SP[SparseSet]
        SPA[Sparse Array]
        SPD[Dense Array]
        SPE[Entity Array]
    end
    
    CR --> SS
    SS -->|"Dense/Frequent"| T
    SS -->|"Sparse/Rare"| SP
    
    T --> TC1
    T --> TC2
    T --> TC3
    TC1 --> TR
    TC2 --> TR
    TC3 --> TR
    
    SP --> SPA
    SP --> SPD
    SP --> SPE
```

### Archetype System

```mermaid
graph LR
    subgraph "Archetype 0 (Empty)"
        A0[No Components]
    end
    
    subgraph "Archetype 1 (Player)"
        A1[Position + Velocity + Health + Player + Sprite + Collider]
    end
    
    subgraph "Archetype 2 (Wandering Enemy)"
        A2[Position + Velocity + Health + Enemy + Sprite + Collider + Wander + Trail]
    end
    
    subgraph "Archetype 3 (Chasing Enemy)"
        A3[Position + Velocity + Health + Enemy + Sprite + Collider + FollowTarget + Trail]
    end
    
    subgraph "Archetype 4 (Bullet)"
        A4[Position + Velocity + Bullet + Sprite + Damage + Collider + Lifetime + Trail]
    end
    
    A0 -->|"+Position"| A1
    A1 -->|"+Wander"| A2
    A1 -->|"+FollowTarget"| A3
    A1 -->|"-Player +Bullet"| A4
```

### Query System

```mermaid
flowchart TB
    subgraph "Query Creation"
        QC["world.query(Position, Velocity)"]
    end
    
    subgraph "Filter Chain"
        F1[".with(Health)"]
        F2[".without(Dead)"]
        F3[".changed(Health)"]
    end
    
    subgraph "Execution"
        ITER["query.iter()"]
        MATCH{Match Archetype?}
        FILT{Pass Filters?}
        YIELD[Yield Entity + Components]
    end
    
    QC --> F1
    F1 --> F2
    F2 --> F3
    F3 --> ITER
    
    ITER --> MATCH
    MATCH -->|Yes| FILT
    MATCH -->|No| ITER
    FILT -->|Yes| YIELD
    FILT -->|No| ITER
    YIELD --> ITER
```

### Change Detection

```mermaid
sequenceDiagram
    participant W as World
    participant C as Component
    participant T as ComponentTicks
    participant S as System
    participant Q as Query
    
    Note over W: Tick = 5
    W->>C: Insert component
    W->>T: Set added=5, changed=5
    
    Note over W: Tick = 10
    S->>C: Modify component
    S->>T: Set changed=10
    
    Note over W: Tick = 15
    S->>Q: query().changed(Health)
    Q->>T: Check: changed > lastRun?
    T-->>Q: 10 > 5? Yes!
    Q-->>S: Return entity
```

### Complete Data Flow

```mermaid
flowchart TB
    subgraph "Input Layer"
        KB[Keyboard Events]
        BTN[Button Clicks]
    end
    
    subgraph "Input Resources"
        INP[Input Resource]
    end
    
    subgraph "Game Logic"
        PIS[Player Input System]
        PSS[Player Shoot System]
        AIS[AI Systems]
        MVS[Movement System]
    end
    
    subgraph "Commands"
        SPAWN[Spawn Commands]
        DESPAWN[Despawn Commands]
    end
    
    subgraph "World State"
        ENT[Entities]
        COMP[Components]
    end
    
    subgraph "Event System"
        EV[Game Events]
    end
    
    subgraph "Observer System"
        OBS[Observers]
    end
    
    subgraph "Collision & Physics"
        COL[Collision System]
    end
    
    subgraph "Output"
        REND[Render System]
        CANVAS[Canvas]
        UI[UI Elements]
    end
    
    KB --> INP
    BTN --> INP
    
    INP --> PIS
    INP --> PSS
    
    PIS --> MVS
    PSS --> SPAWN
    AIS --> MVS
    
    SPAWN --> ENT
    DESPAWN --> ENT
    
    ENT --> COMP
    COMP --> COL
    
    COL --> EV
    COL --> DESPAWN
    
    EV --> OBS
    OBS --> ENT
    
    COMP --> REND
    REND --> CANVAS
    EV --> UI
```

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/nisimjoseph/ecs-typescript-game.git
cd ecs-typescript-game

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:8080 to play the demo game.

## 🎯 Game Demo

The demo game demonstrates ALL ECS features:

### Controls
- **WASD** - Move player (world directions)
- **↑/↓ Arrow Keys** - Move forward/backward (facing direction)
- **←/→ Arrow Keys** - Rotate player
- **SPACE** - Shoot in facing direction
- **Buttons** - Spawn enemies, boss, power-ups, reset

### Features Demonstrated

| Feature | How It's Used |
|---------|--------------|
| **Bundles** | `PlayerBundle`, `EnemyBundle`, `BulletBundle` for spawning |
| **Events** | `CollisionEvent`, `ScoreChangedEvent`, `GameOverEvent` |
| **Observers** | Log entity spawns, track health changes, handle deaths |
| **Query Filters** | `with(Trail)`, `without(Wander)` for targeted queries |
| **Change Detection** | Health changes trigger observer callbacks |
| **Hierarchy** | Trail points follow parent entities |

---

## 📁 Project Structure

```
ecs-typescript-game/
├── src/
│   ├── ecs/                          # Core ECS library (~4,500 lines)
│   │   ├── archetype/mod.ts          # Archetype system
│   │   ├── bundle/mod.ts             # Bundle system
│   │   ├── change_detection/mod.ts   # Change tracking
│   │   ├── component/mod.ts          # Component storage
│   │   ├── entity/mod.ts             # Entity management
│   │   ├── event/mod.ts              # Event system
│   │   ├── hierarchy/mod.ts          # Parent-child relationships
│   │   ├── observer/mod.ts           # Reactive observers
│   │   ├── query/mod.ts              # Query with filters
│   │   ├── storage/                  # Storage backends
│   │   │   ├── sparse_set.ts         # Sparse set storage
│   │   │   └── table/mod.ts          # Table storage
│   │   ├── core/                     # Core systems
│   │   │   ├── app.ts                # App builder
│   │   │   ├── commands.ts           # Deferred commands
│   │   │   ├── resource.ts           # Resources
│   │   │   ├── system.ts             # System scheduling
│   │   │   ├── types.ts              # Core types
│   │   │   └── world.ts              # World container
│   │   └── index.ts                  # ECS exports
│   │
│   ├── game/                         # Game demo (~2,000 lines)
│   │   ├── bundles.ts                # Game bundles (7 bundle types)
│   │   ├── components.ts             # Game components (16 types)
│   │   ├── events.ts                 # Game events (15 event types)
│   │   ├── observers.ts              # Game observers (12 observers)
│   │   ├── resources.ts              # Game resources (8 types)
│   │   └── systems.ts                # Game systems (16+ systems)
│   │
│   └── main.ts                       # Entry point
│
├── public/
│   └── index.html                    # HTML template
│
├── docs/                             # Documentation
│   ├── ARCHITECTURE.md               # Architecture details
│   ├── ARCHITECTURE_VIEWER.html      # Interactive diagrams
│   ├── BEVY_COMPARISON.md            # Comparison with Bevy
│   └── ...
│
├── dist/                             # Build output
├── package.json
├── tsconfig.json
├── webpack.config.js
├── LICENSE                           # MIT License
└── README.md
```

---

## 📖 Usage Examples

### Creating an App

```typescript
import { App, World } from './ecs';

const app = new App()
  .insertResource(new GameConfig())
  .insertResource(new GameEvents())
  .insertResource(new ObserverRegistry())
  .addStartupSystem(setupObservers)
  .addStartupSystem(spawnPlayer)
  .addSystem(movementSystem)
  .addSystem(collisionSystem)
  .addSystem(renderSystem)
  .run();
```

### Using Bundles

```typescript
// Define a bundle
class PlayerBundle implements Bundle {
  constructor(public x: number, public y: number) {}
  
  components() {
    return [
      new Position(this.x, this.y),
      new Velocity(0, 0),
      new Health(100, 100),
      new Player(),
      new Sprite('#00ff88', 'triangle'),
      new Collider(15, 'player')
    ];
  }
}

// Spawn with bundle
const bundle = new PlayerBundle(400, 300);
const builder = world.spawn();
for (const component of bundle.components()) {
  builder.insert(component);
}
```

### Using Events

```typescript
// Define event
class CollisionEvent {
  constructor(
    public entityA: Entity,
    public entityB: Entity,
    public damage: number
  ) {}
}

// Send event
const events = world.getResource(GameEvents);
events.collision.send(new CollisionEvent(bullet, enemy, 25));

// Read events (in another system)
for (const event of events.collision.iter()) {
  console.log(`Collision: ${event.damage} damage`);
}
```

### Using Observers

```typescript
// Setup observer for enemy spawns
registry.register(
  onAdd(Enemy)
    .label('log_enemy_spawn')
    .priority(100)
    .run((entity, enemy) => {
      console.log(`👾 Enemy spawned: ${entity.id}`);
      events.entitySpawned.send(new EntitySpawnedEvent(entity, 'enemy'));
    })
    .build()
);

// Setup observer for health changes
registry.register(
  onChange(Health)
    .run((entity, health) => {
      if (health.isDead()) {
        console.log(`☠️ Entity ${entity.id} died!`);
      }
    })
    .build()
);
```

### Using Query Filters

```typescript
// Query enemies with Trail component
const trailedEnemies = world.query(Position, Enemy).with(Trail);

// Query enemies without Wander (chasers only)
const chasers = world.query(Position, Enemy).without(Wander);

// Query recently added enemies
const newEnemies = world.query(Position, Enemy).added(Enemy);

// Query entities with changed health
const damaged = world.query(Position, Health).changed(Health);
```

---

## 🔧 Building

```bash
# Development with hot reload
npm run dev

# Production build
npm run build
```

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| **FPS** | 165+ stable |
| **Entity Operations** | O(1) |
| **Query Iteration** | Cache-friendly |
| **Memory** | Archetype-optimized |
| **Events** | Double-buffered |

---

## 🏗️ Architecture Summary

```mermaid
mindmap
  root((ECS))
    Core
      World
      Entity
      Component
      Resource
    Storage
      Archetype
      Table
      SparseSet
    Systems
      Schedule
      Stages
      Commands
    Query
      Filters
      Iteration
    Events
      Writer
      Reader
      Buffer
    Observers
      OnAdd
      OnChange
      OnRemove
    Bundles
      Player
      Enemy
      Bullet
```

---

## 🎮 Game Systems Overview

| System | Stage | Purpose |
|--------|-------|---------|
| `inputClearSystem` | First | Clear input state |
| `playerInputSystem` | PreUpdate | Handle WASD movement |
| `playerShootSystem` | PreUpdate | Handle shooting |
| `wanderSystem` | Update | Enemy AI wandering |
| `followTargetSystem` | Update | Enemy AI chasing |
| `movementSystem` | Update | Apply velocity |
| `bounceSystem` | Update | Wall bouncing |
| `trailSystem` | Update | Trail effects |
| `lifetimeSystem` | PostUpdate | Despawn expired entities |
| `explosionSystem` | PostUpdate | Explosion effects |
| `collisionSystem` | PostUpdate | Handle collisions + events |
| `processEventsSystem` | PostUpdate | Process game events |
| `enemySpawnSystem` | PostUpdate | Auto-spawn enemies |
| `renderSystem` | Last | Draw everything |
| `uiUpdateSystem` | Last | Update UI stats |
| `updateEventsSystem` | Last | Swap event buffers |

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Feel free to use this implementation for learning or production.

## 🙏 Acknowledgments

- [Bevy Engine](https://bevyengine.org/) - Architecture inspiration
- [Bevy ECS Source](https://github.com/bevyengine/bevy/tree/main/crates/bevy_ecs) - Reference implementation
