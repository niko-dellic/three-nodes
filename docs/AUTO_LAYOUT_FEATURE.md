# Auto-Layout Feature

## Overview

The auto-layout feature provides intelligent automatic arrangement of nodes in the graph editor based on their relationships and connections. It uses topological sorting to create a hierarchical layout from left to right, positioning nodes in layers according to their dependencies.

## Features

### Core Functionality

1. **Topological Layout**: Nodes are arranged in layers based on their input dependencies
   - Source nodes (no inputs) are placed in layer 0 (leftmost)
   - Nodes are positioned in subsequent layers based on the maximum layer of their inputs + 1
   - Creates a clear left-to-right flow showing data dependencies

2. **Smart Vertical Positioning**: 
   - For nodes with single inputs: Aligns with the center of the input node
   - For nodes with multiple inputs: Aligns with the furthest node along the Y-axis
   - This creates natural visual flow and minimizes edge crossings

3. **DOM-based Bounding Box Calculation**: 
   - Uses actual DOM element dimensions (`offsetWidth`, `offsetHeight`)
   - Respects custom node sizes set by user resizing
   - Adapts to different node types and content

4. **Configurable Spacing**:
   - Horizontal spacing: Distance between layers (100-500px)
   - Vertical spacing: Distance between nodes in the same layer (50-300px)
   - Settings are saved to localStorage and persist across sessions

5. **Animated Transitions**:
   - Optional smooth animation when applying layout
   - 400ms duration with ease-in-out easing
   - Can be disabled for instant layout

6. **History Integration**:
   - Layout changes are recorded as a single undo/redo action
   - Uses interaction grouping to prevent multiple history entries during animation

## Implementation

### New Files

#### `src/ui/AutoLayoutManager.ts`

Main class that handles all layout logic:

```typescript
export class AutoLayoutManager {
  private graph: Graph;
  private config: AutoLayoutConfig;

  constructor(graph: Graph, config?: Partial<AutoLayoutConfig>);
  
  // Apply layout instantly
  applyLayout(): void;
  
  // Apply layout with animation
  applyLayoutAnimated(duration: number): void;
  
  // Update configuration
  updateConfig(config: Partial<AutoLayoutConfig>): void;
  
  // Get current configuration
  getConfig(): AutoLayoutConfig;
}
```

**Key Methods**:

- `calculateNodeLayers()`: Uses topological sorting to determine which layer each node belongs to
- `positionNodesByLayers()`: Positions all nodes layer by layer from left to right
- `positionNodesInLayer()`: Arranges nodes within a single layer vertically
- `calculateIdealY()`: Determines optimal Y position for a node based on its inputs
- `getNodeWidth/Height()`: Extracts dimensions from DOM elements

**Layout Algorithm**:

1. Build dependency graph from node connections
2. Calculate layer index for each node via recursive depth-first search
3. Group nodes by layer
4. For each layer:
   - Calculate ideal Y positions based on input node positions
   - Sort nodes by ideal Y
   - Position nodes with proper spacing
   - Advance X position for next layer

### Modified Files

#### `src/ui/GraphEditor.ts`

**Changes**:
- Added `AutoLayoutManager` instance as private field
- Integrated auto-layout button in toolbar
- Added `showAutoLayoutDialog()` method to display settings modal
- Loads saved config from localStorage on initialization

**Toolbar Button**:
```typescript
const autoLayoutButton = document.createElement('button');
autoLayoutButton.className = 'toolbar-button auto-layout-button';
autoLayoutButton.title = 'Auto-arrange nodes';
autoLayoutButton.innerHTML = '<i class="ph ph-flow-arrow"></i>';
```

**Settings Dialog**:
- Modal overlay with blur effect
- Two range sliders for horizontal and vertical spacing
- Real-time value display as user adjusts sliders
- Checkbox to enable/disable animation
- Apply/Cancel buttons
- Keyboard support (Escape to close)
- Click outside to close

#### `src/ui/index.ts`

**Changes**:
- Added export for `AutoLayoutManager`

## User Interface

### Toolbar Button

The auto-layout button is located in the editor controls section of the toolbar, next to the "Add Node" button. It uses a flow-arrow Phosphor icon (`ph-flow-arrow`).

### Settings Dialog

When clicked, the button opens a modal dialog with:

1. **Title**: "Auto Layout Settings"
2. **Horizontal Spacing Slider**: 
   - Range: 100-500px
   - Default: 200px
   - Controls distance between layers (left to right)
3. **Vertical Spacing Slider**:
   - Range: 50-300px
   - Default: 100px
   - Controls distance between nodes in same layer (top to bottom)
4. **Animate Transitions Checkbox**:
   - Enabled by default
   - Smooth animation when applying layout
5. **Buttons**:
   - **Cancel**: Close dialog without changes
   - **Apply Layout**: Apply settings and arrange nodes

### Keyboard Shortcuts

- **Escape**: Close the settings dialog

## Configuration Persistence

Settings are automatically saved to localStorage under the key `autoLayoutConfig`:

```json
{
  "horizontalSpacing": 200,
  "verticalSpacing": 100
}
```

These settings are restored when the editor is loaded.

## Algorithm Details

### Topological Sorting

The layout algorithm uses a modified topological sort to determine node layers:

```
function calculateLayer(node):
  if node has no inputs:
    return 0
  else:
    return 1 + max(calculateLayer(input) for input in node.inputs)
```

This ensures:
- Source nodes (data generators) are on the left
- Each subsequent layer contains nodes that depend on previous layers
- No node is placed before its dependencies

### Vertical Positioning

For nodes with multiple inputs, the algorithm finds the input node with the maximum Y coordinate:

```typescript
// Find furthest node along Y axis
let maxY = -Infinity;
let maxYNode: Node | null = null;

for (const inputNode of inputNodes) {
  if (inputNode.position.y > maxY) {
    maxY = inputNode.position.y;
    maxYNode = inputNode;
  }
}

// Align with center of that node
return maxYNode.position.y + 
       maxYNode.height / 2 - 
       currentNode.height / 2;
```

This creates a natural flow where nodes align with their most downstream inputs, minimizing visual clutter.

### Animation

The animated layout uses requestAnimationFrame for smooth 60fps transitions:

```typescript
// Store original and target positions
// Interpolate using ease-in-out easing
const eased = progress < 0.5
  ? 2 * progress * progress
  : 1 - Math.pow(-2 * progress + 2, 2) / 2;

node.position = {
  x: original.x + (target.x - original.x) * eased,
  y: original.y + (target.y - original.y) * eased,
};
```

## Edge Cases Handled

1. **Cyclic Dependencies**: Nodes in cycles are assigned to layer 0 to prevent infinite recursion
2. **Disconnected Nodes**: Nodes with no connections are placed in layer 0
3. **Missing DOM Elements**: Falls back to custom dimensions or default values
4. **Empty Graph**: Gracefully returns without errors
5. **Animation Interruption**: Ensures final positions are set even if animation is interrupted

## Future Enhancements

Potential improvements for future versions:

1. **Multiple Layout Algorithms**: 
   - Force-directed layout
   - Hierarchical (Sugiyama) layout
   - Circular layout
   - Grid layout

2. **Smart Edge Routing**:
   - Minimize edge crossings
   - Use orthogonal connectors
   - Bundle similar edges

3. **Partial Layout**:
   - Layout only selected nodes
   - Preserve positions of pinned nodes

4. **Layout Constraints**:
   - Pin specific nodes
   - Group nodes together
   - Maintain relative positions

5. **Export/Import Layouts**:
   - Save layout presets
   - Share layouts between graphs

## Technical Notes

### Performance

- Algorithm complexity: O(N + E) where N = nodes, E = edges
- Animation performance: Uses GPU-accelerated CSS transforms
- DOM queries are optimized with caching where possible

### Browser Compatibility

- Uses modern JavaScript features (Map, Set, requestAnimationFrame)
- CSS backdrop-filter for dialog (fallback to solid background in unsupported browsers)
- Range input sliders work in all modern browsers

### Dependencies

- No external dependencies beyond existing project libraries
- Uses Three.js node graph data structures
- Integrates with existing UI components (HistoryManager, GraphEditor)

## Testing

To test the auto-layout feature:

1. Create several nodes with connections
2. Click the auto-layout button in the toolbar
3. Adjust spacing settings in the dialog
4. Toggle animation on/off
5. Apply layout and observe:
   - Nodes arrange in layers from left to right
   - Nodes with dependencies are positioned after their inputs
   - Vertical spacing is optimized to minimize crossings
   - Animation is smooth (if enabled)
6. Use Undo (Ctrl/Cmd+Z) to revert layout
7. Reload page and verify settings are persisted

## Examples

### Simple Chain
```
[A] → [B] → [C]
```
Result: Three layers, one node per layer, horizontally aligned

### Multiple Inputs
```
[A] ↘
     [C]
[B] ↗
```
Result: C aligns with the furthest input (A or B, whichever is lower)

### Complex Graph
```
[A] → [C] ↘
            [E]
[B] → [D] ↗
```
Result:
- Layer 0: A, B
- Layer 1: C, D
- Layer 2: E (aligned with lower of C/D)

## Conclusion

The auto-layout feature provides a powerful tool for organizing complex node graphs. By leveraging topological sorting and smart vertical positioning, it creates clean, readable layouts that respect node relationships and minimize visual clutter. The configurable spacing and optional animation make it adaptable to different graph sizes and user preferences.

