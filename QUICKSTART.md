# Quick Start Guide

Get up and running with three-nodes in 5 minutes.

## Installation

```bash
npm install
```

## Run the Example

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Understanding the Interface

### Two Modes

**Editor Mode** (default)

- View and edit the node graph
- Drag nodes to reposition
- Connect ports by dragging
- Zoom with mouse wheel
- Pan by dragging empty space

**Viewport Mode**

- View the 3D scene
- Orbit camera with left mouse
- Zoom with mouse wheel
- Pan with right mouse

**Switch modes:** Press `Tab` or click the button in top-right corner

## The Example Scene

The default example creates a simple 3D cube:

```
Numbers → Box Geometry ┐
                       ├→ Create Mesh → Add to Scene ┐
Color → Material ──────┘                             ├→ Scene Output
                                                     │
Camera Position → Camera ────────────────────────────┘
Light Nodes → Add to Scene
```

### Key Concepts

**Nodes:** Self-contained units that process data

- Blue ports (left): Inputs
- Blue ports (right): Outputs

**Connections:** Flow of data between nodes

- Drag from output to input
- Type-safe (colors indicate types)

**Evaluation:** Automatic update on changes

- Graph evaluated on every modification
- Dirty flags optimize recomputation

## Try Modifying the Scene

### Change Box Size

1. Find the "Width", "Height", "Depth" number nodes
2. Click in editor mode (Tab)
3. Modify the input values
4. Switch to viewport mode (Tab) to see changes

### Change Color

1. Find the "Color" node
2. Adjust R, G, B values (0-1 range)
3. View the updated material

### Add Another Geometry

While we haven't built a UI for adding nodes yet, you can modify `src/main.ts`:

```typescript
// Add a sphere
const sphereNode = registry.createNode('SphereGeometryNode')!;
sphereNode.position = { x: 300, y: 500 };
graph.addNode(sphereNode);

// Connect it to a mesh...
```

## Next Steps

### Learn the Architecture

Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand:

- How the DAG engine works
- Node evaluation order
- UI rendering approach

### Create Custom Nodes

Check [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Step-by-step node creation
- Testing guidelines
- Pull request process

### Explore the Code

Key files to start with:

- `src/core/Node.ts` - Base node class
- `src/three/nodes/` - Built-in node implementations
- `src/ui/GraphEditor.ts` - Main UI coordinator
- `src/main.ts` - Example graph setup

## Common Tasks

### Adding a New Node Type

1. Create class extending `BaseThreeNode`
2. Define inputs/outputs in constructor
3. Implement `evaluate()` method
4. Register with metadata

### Debugging the Graph

In browser console:

```javascript
// Access the graph
window.graph;

// List all nodes
window.graph.nodes;

// Check node connections
window.graph.edges;
```

### Hot Reload

Vite provides instant hot-reload:

- Edit any source file
- Browser updates automatically
- State preserved when possible

## Keyboard Shortcuts

| Key              | Action                      |
| ---------------- | --------------------------- |
| Tab              | Toggle editor/viewport mode |
| Delete/Backspace | Delete selected nodes       |
| Mouse Wheel      | Zoom (both modes)           |

## Troubleshooting

**Nothing renders in viewport:**

- Ensure SceneOutputNode has a camera connected
- Check browser console for errors

**Nodes don't update:**

- Graph is evaluated automatically
- Check if nodes are connected properly
- Verify port types match

**Performance issues:**

- Too many nodes? Graph complexity increases compute time
- Check for evaluation loops (shouldn't happen with DAG)

## Resources

- [README.md](./README.md) - Full documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical details
- [CONTRIBUTING.md](./CONTRIBUTING.md) - How to contribute

## Getting Help

- Check existing issues on GitHub
- Open a new issue with:
  - Browser and OS version
  - Steps to reproduce
  - Expected vs actual behavior
  - Console errors (if any)

Happy node graphing! 🎨
