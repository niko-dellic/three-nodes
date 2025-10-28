# three-nodes

A modular, browser-based visual programming environment for Three.js. Build 3D scenes through a node graph interface inspired by Grasshopper and Houdini.

## Features

- **Engine-first architecture**: Framework-agnostic DAG evaluator with typed ports and incremental recomputation
- **Three.js integration**: Built-in nodes for geometry, materials, lights, cameras, and scene graph operations
- **Hybrid rendering**: Canvas for performant edge rendering + SVG for accessible node UI
- **Mode switching**: Toggle between node editing and 3D viewport interaction with Tab key
- **Extensible**: Plugin-ready node registry with dynamic registration
- **Serialization**: JSON-based graph persistence with versioning

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:3000 to see the example scene.

### Build

```bash
npm run build
```

## Architecture

### Core Components

```
three-nodes/
├── src/
│   ├── core/          # DAG engine (graph, nodes, evaluator)
│   ├── three/         # Three.js node implementations
│   ├── ui/            # Hybrid Canvas/SVG editor + viewport
│   └── types/         # Shared type definitions
```

### Core DAG Engine (`src/core/`)

The core provides a framework-agnostic directed acyclic graph (DAG) evaluation system:

- **Node**: Base class with typed inputs/outputs and `evaluate()` method
- **Port**: Typed connection points (Number, Vector3, Geometry, Material, etc.)
- **Edge**: Connections between ports with type validation
- **Graph**: Container managing nodes and edges
- **Evaluator**: Topological sort + dirty flag propagation for incremental updates
- **Serialization**: JSON import/export with stable IDs

### Three.js Integration (`src/three/`)

Pre-built nodes for common Three.js operations:

**Data Nodes:**

- NumberNode, Vector3Node, ColorNode

**Geometry Nodes:**

- BoxGeometryNode, SphereGeometryNode

**Material Nodes:**

- MeshStandardMaterialNode

**Scene Nodes:**

- CreateMeshNode, AddToSceneNode

**Camera/Light Nodes:**

- PerspectiveCameraNode, AmbientLightNode, DirectionalLightNode

**Output:**

- SceneOutputNode (exports scene + camera to viewport)

### UI System (`src/ui/`)

Hybrid rendering approach for performance and accessibility:

- **Canvas**: Fast bezier curve rendering for edges
- **SVG/DOM**: Easy hit-testing and styling for nodes and ports
- **ViewModeManager**: Tab-based switching between editor and 3D viewport
- **Viewport**: Pan/zoom transformation management
- **InteractionManager**: Drag nodes, create connections, keyboard shortcuts

## Usage

### Creating Nodes

```typescript
import { createDefaultRegistry } from './three';

const registry = createDefaultRegistry();
const boxNode = registry.createNode('BoxGeometryNode');
```

### Building Graphs

```typescript
import { Graph } from './core';

const graph = new Graph();
graph.addNode(boxNode);
graph.connect(outputPort, inputPort);
```

### Evaluating

```typescript
import { Evaluator } from './core';

const evaluator = new Evaluator(graph);
evaluator.evaluate();
```

### Custom Nodes

Extend `BaseThreeNode` and register with metadata:

```typescript
import { BaseThreeNode } from './three/BaseThreeNode';
import { PortType } from './types';

export class MyCustomNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'MyCustomNode', 'My Node');
    this.addInput({ name: 'input', type: PortType.Number });
    this.addOutput({ name: 'output', type: PortType.Number });
  }

  evaluate(context) {
    const input = this.getInputValue('input') ?? 0;
    this.setOutputValue('output', input * 2);
  }
}

// Register
registry.register(MyCustomNode, {
  type: 'MyCustomNode',
  category: 'Custom',
  label: 'My Node',
  description: 'Doubles the input',
});
```

## Example Graph

The default example creates a simple 3D scene with:

1. Adjustable box geometry (width, height, depth inputs)
2. Colored PBR material
3. Mesh creation and scene addition
4. Camera and lighting setup
5. Scene output to viewport

**Try it:**

- Press **Tab** to switch between editor and 3D view
- In editor mode: Drag nodes, connect ports, zoom with mouse wheel
- In viewport mode: Orbit with mouse, zoom with wheel
- Delete nodes with **Delete** key

## Extension Points

### Adding Node Packs

Create a separate module with your nodes and register them:

```typescript
import { NodeRegistry } from './three/NodeRegistry';

export function registerMyNodes(registry: NodeRegistry) {
  registry.register(MyNode1, {
    /* metadata */
  });
  registry.register(MyNode2, {
    /* metadata */
  });
}
```

### Custom Port Types

Extend the `PortType` enum and update type validation in `Port.canConnectTo()`.

### Worker Execution

Heavy compute nodes can run in Web Workers by serializing inputs/outputs. Add worker evaluation in the `Evaluator`.

## Roadmap

Future enhancements (not in MVP):

- Shader nodes (GLSL chunks, uniform bindings)
- GLTF import/export nodes
- Texture pipeline (load, filter, composite)
- Procedural geometry (noise, marching cubes)
- Animation/timeline system
- Context menu for node creation
- Mini-map for navigation
- Undo/redo system

## Development

### Testing

```bash
npm run test
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue to discuss major changes.

## Acknowledgments

Inspired by:

- Grasshopper (McNeel & Associates)
- Houdini (SideFX)
- Blender Geometry Nodes
- Three.js (mrdoob and contributors)
