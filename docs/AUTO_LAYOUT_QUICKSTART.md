# Auto-Layout Quick Start Guide

## What is Auto-Layout?

Auto-Layout automatically arranges your nodes in a clean, organized layout based on their connections. It places source nodes on the left and arranges dependent nodes to the right in layers, creating a clear left-to-right data flow.

## How to Use

### Basic Usage

1. **Create some nodes** with connections in your graph
2. **Click the auto-layout button** in the toolbar (flow arrow icon)
3. **Adjust settings** in the dialog (optional):
   - **Horizontal Spacing**: Distance between columns (100-500px)
   - **Vertical Spacing**: Distance between rows (50-300px)
   - **Animate Transitions**: Smooth animation toggle
4. **Click "Apply Layout"**

### Tips

- **First Time Users**: Try the default settings first, they work well for most graphs
- **Large Graphs**: Increase spacing values for better readability
- **Compact Layouts**: Decrease spacing values to fit more on screen
- **Quick Apply**: Leave animation enabled for visual feedback
- **Batch Processing**: Disable animation for faster layout of very large graphs

## Layout Behavior

### How Nodes are Positioned

The auto-layout follows these rules:

1. **Horizontal (X-axis)**:
   - Nodes are arranged in **layers** from left to right
   - **Source nodes** (no inputs) go in the first layer
   - Each node is placed one layer to the right of its furthest input
   - Layer width is calculated from the widest node + horizontal spacing

2. **Vertical (Y-axis)**:
   - Within each layer, nodes are stacked vertically
   - **Single input**: Node aligns with its input's center
   - **Multiple inputs**: Node aligns with the **furthest input down the Y-axis**
   - Minimum vertical spacing is maintained between nodes

### Examples

#### Simple Chain
```
Before:
[A]
      [B]
   [C]

After:
[A] → [B] → [C]
```

#### Merge Pattern
```
Before:
[A]
   [C]
      [B]

After:
[A] ↘
     [C]
[B] ↗
(C aligns with lower of A/B)
```

#### Complex Flow
```
Before (messy):
   [D]
[A]     [F]
      [B]
   [C]
         [E]

After (organized):
[A] → [D] ↘
            [F]
[B] → [E] ↗
[C]
```

## Keyboard Shortcuts

- **Escape**: Close the settings dialog
- **Ctrl/Cmd + Z**: Undo the layout (revert to previous positions)

## Settings Persistence

Your spacing preferences are automatically saved and will be restored next time you open the editor.

## Troubleshooting

### Issue: Nodes overlap after layout
**Solution**: Increase vertical spacing in the settings

### Issue: Layout is too spread out
**Solution**: Decrease horizontal and/or vertical spacing

### Issue: Some nodes are in unexpected positions
**Explanation**: Nodes with cycles or complex dependencies may not always position exactly as expected. Try adjusting connections or manually positioning those nodes.

### Issue: Animation is choppy
**Solution**: Disable animation for better performance, especially with large graphs (100+ nodes)

## Advanced Tips

### Working with Selected Nodes

Currently, auto-layout applies to **all nodes** in the graph. To layout only part of your graph:
1. Manually position the nodes you want to keep in place far from others
2. Apply auto-layout
3. Manually reposition as needed

### Best Practices

- **Regular Cleanup**: Apply auto-layout periodically as you build your graph
- **Start Clean**: Begin with auto-layout, then make fine adjustments manually
- **Layer Logic**: Think in terms of data flow - inputs → processing → outputs
- **Group Related**: Nodes that work together will naturally group in the same layer

### Undoing Layout

Don't like the result? No problem!
- Press **Ctrl/Cmd + Z** to undo
- Your nodes return to their previous positions
- This works for both animated and instant layouts

## Configuration Options

### Horizontal Spacing
- **Range**: 100-500 pixels
- **Default**: 200 pixels
- **When to adjust**:
  - Increase for wider graphs with more complex connections
  - Decrease for compact layouts or presentation mode

### Vertical Spacing
- **Range**: 50-300 pixels
- **Default**: 100 pixels
- **When to adjust**:
  - Increase if nodes have tall controls or many ports
  - Decrease for simple nodes to maximize screen usage

### Animation
- **Default**: Enabled
- **Benefits**: 
  - Visual feedback shows where each node moves
  - Helps understand the new layout structure
  - Looks professional
- **Disable if**:
  - Working with very large graphs (>50 nodes)
  - Prefer instant results
  - Performance is a concern

## When to Use Auto-Layout

**Good Use Cases:**
- ✅ After creating many nodes quickly
- ✅ When connections become difficult to follow
- ✅ Before taking screenshots or presenting
- ✅ When starting a new section of your graph
- ✅ After loading a saved graph that was manually arranged

**Not Recommended:**
- ❌ When you have carefully positioned nodes for aesthetic reasons
- ❌ During active editing (wait until you finish a section)
- ❌ If your graph has intentional non-standard layouts

## Future Enhancements

Coming soon:
- Layout only selected nodes
- Multiple layout algorithms (circular, force-directed, grid)
- Pin nodes to prevent them from moving
- Custom layer assignments
- Smart edge routing to minimize crossings

## Need Help?

If auto-layout doesn't work as expected:
1. Check that nodes are properly connected
2. Verify the graph isn't too complex (cycles can affect layout)
3. Try adjusting spacing settings
4. Use undo if needed and manually adjust

---

**Pro Tip**: The auto-layout button is your best friend when building complex graphs. Don't be afraid to use it often - you can always undo!

