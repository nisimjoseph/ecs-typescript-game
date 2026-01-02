# 🏗️ ECS Architecture Documentation

This document provides detailed architectural diagrams for the TypeScript ECS implementation.

> **📊 [View Interactive Diagrams →](./ARCHITECTURE_VIEWER.html)**  
> Open `ARCHITECTURE_VIEWER.html` in your browser to see all diagrams rendered visually with interactive navigation.

---

## 📊 High-Level Overview

```mermaid
graph TB
    subgraph "User Code"
        MAIN[main.ts]
        GSYS[Game Systems]
        GCOMP[Game Components]
        GBUND[Game Bundles]
        GEVT[Game Events]
        GOBS[Game Observers]
    end
    
    subgraph "ECS Framework"
        APP[App]
        WORLD[World]
        QUERY[Query]
        CMD[Commands]
    end
    
    subgraph "ECS Internals"
        ENTITY[Entity Allocator]
        COMP[Component Registry]
        ARCH[Archetypes]
        STORAGE[Storage Layer]
        EVENTS[Event System]
        OBSERVERS[Observer System]
    end
    
    MAIN --> APP
    GSYS --> APP
    GCOMP --> COMP
    GBUND --> WORLD
    GEVT --> EVENTS
    GOBS --> OBSERVERS
    
    APP --> WORLD
    WORLD --> ENTITY
    WORLD --> COMP
    WORLD --> EVENTS
    
    QUERY --> ARCH
    CMD --> WORLD
    
    COMP --> ARCH
    ARCH --> STORAGE
```

---

## 🌍 World Architecture

The `World` is the central container for all ECS data.

```mermaid
classDiagram
    class World {
        -entityAllocator: EntityAllocator
        -componentRegistry: ComponentRegistry
        -resourceRegistry: ResourceRegistry
        -commands: Commands
        +spawn() EntityBuilder
        +despawn(entity) void
        +query(...types) Query
        +getResource(type) T
        +insertResource(resource) void
        +applyCommands() void
    }
    
    class EntityAllocator {
        -entities: Entity[]
        -freeList: number[]
        -nextId: number
        +allocate() Entity
        +deallocate(entity) void
        +isAlive(entity) boolean
    }
    
    class ComponentRegistry {
        -componentInfos: Map
        -archetypes: Archetypes
        +register(type) ComponentId
        +insert(entity, component) void
        +get(entity, type) T
        +remove(entity, type) void
    }
    
    class ResourceRegistry {
        -resources: Map
        +insert(resource) void
        +get(type) T
        +remove(type) void
    }
    
    class Commands {
        -queue: Command[]
        +spawn() EntityBuilder
        +despawn(entity) void
        +insert(entity, component) void
        +apply(world) void
    }
    
    World --> EntityAllocator
    World --> ComponentRegistry
    World --> ResourceRegistry
    World --> Commands
```

---

## 📦 Storage Architecture

### Archetype System

```mermaid
graph LR
    subgraph arch0["Archetype 0"]
        A0_ID["ID: 0"]
        A0_COMP["Components: none"]
        A0_ENT["Entities: empty"]
    end
    
    subgraph arch1["Archetype 1"]
        A1_ID["ID: 1"]
        A1_COMP["Position, Velocity, Player"]
        A1_ENT["Entities: E0"]
        A1_TABLE["Table Storage"]
    end
    
    subgraph arch2["Archetype 2"]
        A2_ID["ID: 2"]
        A2_COMP["Position, Velocity, Enemy, Wander"]
        A2_ENT["Entities: E1, E2, E3"]
        A2_TABLE["Table Storage"]
    end
    
    A0_ID --> A1_ID
    A1_ID --> A2_ID
```

### Table Storage Detail

```mermaid
graph TB
    subgraph "Table for Archetype 2"
        COLS[Columns]
        
        subgraph "Position Column"
            P0["[0] {x: 100, y: 200}"]
            P1["[1] {x: 300, y: 150}"]
            P2["[2] {x: 450, y: 400}"]
        end
        
        subgraph "Velocity Column"
            V0["[0] {x: 10, y: 0}"]
            V1["[1] {x: -5, y: 5}"]
            V2["[2] {x: 0, y: 10}"]
        end
        
        subgraph "Entity Mapping"
            E1["Entity 1 → Row 0"]
            E2["Entity 2 → Row 1"]
            E3["Entity 3 → Row 2"]
        end
    end
```

### SparseSet Storage

```mermaid
graph TB
    subgraph "SparseSet"
        subgraph "Sparse Array (Entity → Dense Index)"
            S0["[0] = 2"]
            S1["[1] = null"]
            S2["[2] = 0"]
            S3["[3] = 1"]
        end
        
        subgraph "Dense Array (Components)"
            D0["[0] = ComponentA"]
            D1["[1] = ComponentB"]
            D2["[2] = ComponentC"]
        end
        
        subgraph "Entity Array (Dense → Entity)"
            E0["[0] = Entity 2"]
            E1["[1] = Entity 3"]
            E2["[2] = Entity 0"]
        end
    end
    
    S0 -.->|"Entity 0"| D2
    S2 -.->|"Entity 2"| D0
    S3 -.->|"Entity 3"| D1
```

---

## 🔍 Query System

### Query Execution Flow

```mermaid
flowchart TB
    START[Query Created]
    
    START --> MATCH[Match Archetypes]
    
    MATCH --> CHECK{Has All<br>Required Components?}
    
    CHECK -->|No| SKIP[Skip Archetype]
    CHECK -->|Yes| FILTER[Apply Filters]
    
    SKIP --> NEXT{More Archetypes?}
    
    FILTER --> WITH{With Filter<br>Passes?}
    WITH -->|No| SKIP
    WITH -->|Yes| WITHOUT{Without Filter<br>Passes?}
    
    WITHOUT -->|No| SKIP
    WITHOUT -->|Yes| CHANGE{Change Detection<br>Passes?}
    
    CHANGE -->|No| SKIP
    CHANGE -->|Yes| YIELD[Yield Entity + Components]
    
    YIELD --> NEXT
    NEXT -->|Yes| CHECK
    NEXT -->|No| END[Query Complete]
```

### Query Filter Types

```mermaid
graph TB
    subgraph "Query Filters"
        BASE["query(Position, Velocity)"]
        
        WITH[".with(Health)"]
        WITHOUT[".without(Dead)"]
        ADDED[".added(Enemy)"]
        CHANGED[".changed(Health)"]
    end
    
    BASE --> WITH
    BASE --> WITHOUT
    BASE --> ADDED
    BASE --> CHANGED
    
    subgraph "Result"
        RES[Filtered Entities]
    end
    
    WITH --> RES
    WITHOUT --> RES
    ADDED --> RES
    CHANGED --> RES
```

---

## 📡 Event System

### Double-Buffered Events

```mermaid
sequenceDiagram
    participant W as Writer
    participant B1 as Buffer A
    participant B2 as Buffer B
    participant R as Reader
    
    Note over B1,B2: Frame N: Buffer A is "write", Buffer B is "read"
    
    W->>B1: send(event1)
    W->>B1: send(event2)
    R->>B2: iter() → []
    
    Note over B1,B2: End of Frame: Swap
    
    Note over B1,B2: Frame N+1: Buffer B is "write", Buffer A is "read"
    
    W->>B2: send(event3)
    R->>B1: iter() → [event1, event2]
```

### Event Flow in Game

```mermaid
flowchart LR
    subgraph "Collision Detection"
        CD[Collision System]
    end
    
    subgraph "Events"
        BE[BulletHitEvent]
        SE[ScoreEvent]
        KE[EntityKilledEvent]
    end
    
    subgraph "Event Processors"
        PS[Score System]
        LS[Logger]
        UI[UI Update]
    end
    
    CD -->|bullet hits enemy| BE
    BE -->|enemy died| SE
    BE -->|enemy died| KE
    
    SE --> PS
    BE --> LS
    KE --> LS
    SE --> UI
```

---

## 👁️ Observer System

### Observer Registration

```mermaid
graph TB
    subgraph "Observer Registry"
        REG[Registry]
        
        subgraph "OnAdd Observers"
            OA1["Player → logSpawn"]
            OA2["Enemy → logSpawn"]
            OA3["Bullet → logSpawn"]
        end
        
        subgraph "OnChange Observers"
            OC1["Health → checkDeath"]
            OC2["Position → updateSpatial"]
        end
        
        subgraph "OnRemove Observers"
            OR1["Player → gameOver"]
            OR2["Enemy → updateScore"]
        end
    end
    
    REG --> OA1
    REG --> OA2
    REG --> OA3
    REG --> OC1
    REG --> OC2
    REG --> OR1
    REG --> OR2
```

### Observer Trigger Flow

```mermaid
sequenceDiagram
    participant S as System
    participant W as World
    participant OR as Observer Registry
    participant O as Observer Callback
    
    S->>W: spawn().insert(Enemy)
    W->>OR: trigger(OnAdd, entity, Enemy)
    OR->>O: Execute callback
    O->>O: Log "Enemy spawned"
    O->>O: Send EntitySpawnedEvent
```

---

## 📦 Bundle System

### Bundle Hierarchy

```mermaid
graph TB
    subgraph "Bundle Interface"
        BI[Bundle]
    end
    
    subgraph "Game Bundles"
        PB[PlayerBundle]
        EB[EnemyBundle]
        BB[BulletBundle]
        PUB[PowerUpBundle]
    end
    
    subgraph "Enemy Variants"
        WEB[WanderingEnemyBundle]
        CEB[ChasingEnemyBundle]
    end
    
    BI --> PB
    BI --> EB
    BI --> BB
    BI --> PUB
    
    EB --> WEB
    EB --> CEB
```

### Bundle Spawning

```mermaid
sequenceDiagram
    participant C as Code
    participant B as Bundle
    participant W as World
    participant EB as EntityBuilder
    participant CR as ComponentRegistry
    
    C->>B: new PlayerBundle(x, y)
    C->>B: components()
    B-->>C: [Position, Velocity, Health, ...]
    
    C->>W: spawn()
    W-->>C: EntityBuilder
    
    loop For each component
        C->>EB: insert(component)
        EB->>CR: register & store
    end
    
    C->>EB: id()
    EB-->>C: Entity
```

---

## ⚙️ System Scheduling

### Stage Execution Order

```mermaid
gantt
    title System Execution Per Frame
    dateFormat X
    axisFormat %s
    
    section Stage.First
    inputClearSystem :a1, 0, 1
    
    section Stage.PreUpdate
    playerInputSystem :a2, 1, 2
    playerShootSystem :a3, 2, 3
    
    section Stage.Update
    wanderSystem :a4, 3, 4
    followTargetSystem :a5, 4, 5
    movementSystem :a6, 5, 6
    bounceSystem :a7, 6, 7
    trailSystem :a8, 7, 8
    
    section Stage.PostUpdate
    lifetimeSystem :a9, 8, 9
    explosionSystem :a10, 9, 10
    collisionSystem :a11, 10, 11
    processEventsSystem :a12, 11, 12
    enemySpawnSystem :a13, 12, 13
    
    section Stage.Last
    renderSystem :a14, 13, 14
    uiUpdateSystem :a15, 14, 15
    updateEventsSystem :a16, 15, 16
```

### System Dependencies

```mermaid
graph LR
    subgraph "Input"
        IC[inputClear]
        PI[playerInput]
        PS[playerShoot]
    end
    
    subgraph "AI"
        WS[wander]
        FT[followTarget]
    end
    
    subgraph "Physics"
        MS[movement]
        BS[bounce]
    end
    
    subgraph "Visuals"
        TS[trail]
        RS[render]
    end
    
    subgraph "Gameplay"
        LS[lifetime]
        CS[collision]
        ES[explosion]
    end
    
    IC --> PI
    PI --> PS
    PI --> MS
    
    WS --> MS
    FT --> MS
    
    MS --> BS
    MS --> TS
    
    BS --> CS
    TS --> RS
    
    CS --> ES
    LS --> CS
```

---

## 🔄 Change Detection

### Tick-Based Tracking

```mermaid
graph TB
    subgraph "World Ticks"
        T1["Tick 1: Initial spawn"]
        T5["Tick 5: Health modified"]
        T10["Tick 10: Query runs"]
    end
    
    subgraph "Component Ticks"
        CT["Health Component"]
        ADDED["added_tick: 1"]
        CHANGED["changed_tick: 5"]
    end
    
    subgraph "System State"
        SS["Last Run Tick: 3"]
    end
    
    subgraph "Detection"
        CHECK["changed_tick > last_run?"]
        RESULT["5 > 3 = true → Changed!"]
    end
    
    T1 --> ADDED
    T5 --> CHANGED
    SS --> CHECK
    CHANGED --> CHECK
    CHECK --> RESULT
```

---

## 🎮 Game Loop

### Complete Frame Flow

```mermaid
flowchart TB
    START[Frame Start]
    
    START --> TIME[Update Time]
    TIME --> FIRST[Stage.First]
    
    FIRST --> INPUT[Clear Input State]
    INPUT --> PREUPDATE[Stage.PreUpdate]
    
    PREUPDATE --> PINPUT[Process Player Input]
    PINPUT --> SHOOT[Handle Shooting]
    SHOOT --> UPDATE[Stage.Update]
    
    UPDATE --> AI[Run AI Systems]
    AI --> MOVE[Apply Movement]
    MOVE --> PHYSICS[Physics Updates]
    PHYSICS --> VISUALS[Update Visuals]
    VISUALS --> POSTUPDATE[Stage.PostUpdate]
    
    POSTUPDATE --> LIFETIME[Despawn Expired]
    LIFETIME --> COLLISION[Handle Collisions]
    COLLISION --> EVENTS[Process Events]
    EVENTS --> SPAWN[Spawn Enemies]
    SPAWN --> LAST[Stage.Last]
    
    LAST --> RENDER[Render Frame]
    RENDER --> UI[Update UI]
    UI --> EVTBUF[Swap Event Buffers]
    EVTBUF --> COMMANDS[Apply Commands]
    
    COMMANDS --> END[Frame End]
    END -->|Next Frame| START
```

---

## 📝 Summary

This architecture provides:

1. **Separation of Concerns** - Each module has a single responsibility
2. **Cache Efficiency** - Archetype-based storage for fast iteration
3. **Type Safety** - Full TypeScript generics throughout
4. **Extensibility** - Easy to add new components, systems, events
5. **Reactivity** - Observers respond to component lifecycle
6. **Decoupling** - Events allow systems to communicate without dependencies

---

**Document Version**: 1.0
**Last Updated**: January 1, 2026
