# Architecture Overview

## System Design

three-nodes follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────┐
│              Application Layer              │
│  (main.ts - Example graph + UI bootstrap)  │
└─────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│   Core   │  │  Three   │  │      UI      │
│   DAG    │◄─┤  Nodes   │◄─┤  Editor +    │
│  Engine  │  │ Registry │  │  Viewport    │
└──────────┘  └──────────┘  └──────────────┘
```

## Core DAG Engine

**Location:** `src/core/`

The core provides a framework-agnostic computational graph system:

### Key Classes

- **Node**: Abstract base class for all nodes
  - Manages inputs/outputs (Ports)
  - Implements `evaluate(context)` lifecycle
  - Supports dirty-flag tracking for incremental updates
  - Output caching for performance

- **Port**: Typed connection points
  - Input or output direction
  - Type validation (Number, Vector3, Geometry, etc.)
  - Value storage and defaults
  - Connection compatibility checking

- **Edge**: Directed connections between ports
  - Enforces type compatibility
  - Handles value propagation
  - Maintains graph structure

- **Graph**: Container and manager
  - Stores nodes and edges
  - Add/remove operations
  - Connection management
  - Change notification system

- **Evaluator**: Execution engine
  - Topological sort (Kahn's algorithm)
  - Dirty-flag propagation
  - Dependency resolution
  - Cycle detection

### Data Flow

1. User modifies node input or creates connection
2. Target node marked dirty
3. Evaluator performs topological sort
4. Nodes evaluated in dependency order
5. Values propagate through edges
6. Output nodes update viewport

## Three.js Integration

**Location:** `src/three/`

Node implementations for Three.js primitives:

### Node Categories

- **Data**: NumberNode, Vector3Node, ColorNode
- **Geometry**: BoxGeometryNode, SphereGeometryNode
- **Material**: MeshStandardMaterialNode
- **Scene**: CreateMeshNode, AddToSceneNode
- **Camera**: PerspectiveCameraNode
- **Lights**: AmbientLightNode, DirectionalLightNode
- **Output**: SceneOutputNode (final scene + camera)

### Registry System

**NodeRegistry** provides:

- Dynamic node registration with metadata
- Factory pattern for node instantiation
- Type lookup and categorization
- Extensibility for custom node packs

### Resource Management

**BaseThreeNode** handles:

- GPU resource tracking
- Automatic disposal on node removal
- Memory leak prevention

## UI System

**Location:** `src/ui/`

Hybrid rendering architecture for performance and usability:

### Rendering Layers

1. **Canvas Layer** (background)
   - Fast bezier curve drawing for edges
   - Hardware-accelerated transforms
   - Viewport pan/zoom applied

2. **SVG Layer** (foreground)
   - Node cards and ports
   - Easy hit-testing and styling
   - CSS integration
   - Accessibility-friendly

### Key Components

- **GraphEditor**: Main coordinator
  - Manages canvas and SVG layers
  - Orchestrates render loop
  - Handles graph changes
  - Window resize handling

- **Viewport**: Transform management
  - Pan/zoom calculations
  - Screen ↔ world coordinate conversion
  - Transform matrix application

- **CanvasRenderer**: Edge rendering
  - Cubic bezier curves
  - Connection drag preview
  - DPI-aware scaling

- **NodeRenderer**: Node UI
  - SVG card generation
  - Port rendering with type colors
  - Category-based coloring
  - Dynamic layout

- **InteractionManager**: User input
  - Pointer event handling
  - Drag states (pan, node, connection)
  - Selection management
  - Keyboard shortcuts

- **LiveViewport**: Three.js display
  - WebGL renderer setup
  - OrbitControls integration
  - Scene output monitoring
  - Render loop

- **ViewModeManager**: Mode switching
  - Editor ↔ Viewport toggle
  - Tab key handling
  - Controls enable/disable
  - UI state management

### Interaction Model

**Editor Mode:**

- Drag nodes to reposition
- Drag from port to create connections
- Mouse wheel to zoom
- Drag background to pan
- Delete key to remove selection

**Viewport Mode:**

- OrbitControls active
- Mouse to rotate camera
- Wheel to zoom
- Right-drag to pan

## Serialization

**Location:** `src/core/serializer.ts`, `src/core/deserializer.ts`

JSON-based persistence:

```typescript
{
  "version": "1.0.0",
  "nodes": [
    {
      "id": "node-123",
      "type": "BoxGeometryNode",
      "label": "My Box",
      "position": { "x": 100, "y": 100 },
      "inputs": { "width": 2 }
    }
  ],
  "edges": [
    {
      "id": "edge-456",
      "sourceNodeId": "node-123",
      "sourcePortName": "geometry",
      "targetNodeId": "node-789",
      "targetPortName": "geometry"
    }
  ]
}
```

### Features

- Stable IDs for undo/redo
- Version field for migration
- Compact representation
- Human-readable format

## Extension Points

### Adding Custom Nodes

1. Extend `BaseThreeNode`
2. Define inputs/outputs in constructor
3. Implement `evaluate(context)`
4. Register with metadata

```typescript
class MyNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'MyNode', 'My Label');
    this.addInput({ name: 'in', type: PortType.Number });
    this.addOutput({ name: 'out', type: PortType.Number });
  }

  evaluate(ctx: EvaluationContext): void {
    const val = this.getInputValue<number>('in') ?? 0;
    this.setOutputValue('out', val * 2);
  }
}

registry.register(MyNode, {
  type: 'MyNode',
  category: 'Custom',
  label: 'My Node',
});
```

### Custom Port Types

Add to `PortType` enum and update validation logic in `Port.canConnectTo()`.

### Custom Evaluators

Extend `Evaluator` to add:

- Worker-based execution
- Async node support
- Custom scheduling

## Performance Considerations

### Incremental Evaluation

- Dirty flags prevent redundant computation
- Only downstream nodes re-evaluated
- Output caching for expensive operations

### Rendering Optimization

- Canvas for bulk edge rendering
- SVG for interactive elements
- RequestAnimationFrame loop
- DPI-aware canvas sizing

### Memory Management

- Automatic GPU resource disposal
- Node lifecycle hooks
- Resource tracking in BaseThreeNode

## Testing Strategy

**Location:** `src/core/__tests__/`

- Unit tests for core engine
- Graph operations testing
- Evaluator correctness
- Type checking via TypeScript

Run tests: `npm test`

## Future Enhancements

Not in MVP but architecturally supported:

- **Web Workers**: Offload heavy nodes
- **Undo/Redo**: Leverage serialization + command pattern
- **GLSL Nodes**: Shader graph system
- **Animation**: Timeline + keyframe nodes
- **GLTF**: Import/export nodes
- **Context Menu**: Right-click node creation
- **Mini-map**: Graph overview widget
