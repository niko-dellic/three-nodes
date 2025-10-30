# Downstream Dirty Propagation Fix

## Problem

When loading textures via file pickers in material nodes (or loading files in loader nodes), the changes would update the node's preview but **not propagate to downstream nodes** in the pipeline. Users had to manually change another input to trigger re-evaluation of the entire chain.

## Root Cause

The issue was with **incremental evaluation** in the graph evaluator:

1. When a texture/file was loaded asynchronously, the node called `this.markDirty()` to mark itself as needing re-evaluation
2. The node then triggered `this.graph.triggerChange()` to start evaluation
3. **However**, only the current node was marked dirty - downstream nodes were still marked as clean
4. The evaluator's incremental evaluation logic skips clean nodes, so downstream nodes wouldn't re-evaluate even though their input (the material/object) had changed
5. Result: The material preview updated, but meshes/scenes using that material didn't update

## Solution

### 1. Added `markDownstreamDirty()` Method to Node Base Class

**File: `src/core/Node.ts`**

Added a new method that marks the current node **and all downstream nodes** as dirty by walking the graph structure:

```typescript
/**
 * Mark this node and all downstream nodes as dirty
 * Used when internal state changes (e.g., file loaded, property changed)
 */
markDownstreamDirty(): void {
  if (!this.graph) return;

  const visited = new Set<string>();
  const queue: string[] = [this.id];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const node = this.graph.getNode(currentId);
    if (node) {
      node.markDirty();

      // Find all nodes connected to this node's outputs
      for (const outputPort of node.outputs.values()) {
        const edges = this.graph.getEdgesFromPort(outputPort);
        for (const edge of edges) {
          queue.push(edge.target.node.id);
        }
      }
    }
  }
}
```

This mirrors the `Evaluator.markDownstreamDirty()` method but can be called directly from any node.

### 2. Updated BaseMaterialNode

**File: `src/three/nodes/material/BaseMaterialNode.ts`**

Changed `loadTexture()` and `clearTexture()` methods:

**Before:**
```typescript
this.markDirty();
if (this.graph) {
  setTimeout(() => {
    if (this.graph) {
      this.graph.triggerChange();
    }
  }, 0);
}
```

**After:**
```typescript
// Mark this node and all downstream nodes as dirty
this.markDownstreamDirty();

if (this.graph) {
  setTimeout(() => {
    if (this.graph) {
      this.graph.triggerChange();
    }
  }, 0);
}
```

### 3. Updated BaseFileLoaderNode (For Consistency)

**File: `src/three/nodes/loaders/BaseFileLoaderNode.ts`**

Applied the same fix to file loader nodes in `handleFileSelected()` and `clearFile()` methods.

## How It Works Now

When a texture is loaded via file picker:

1. **Texture loads** → `loadTexture()` callback fires
2. **Mark downstream** → `this.markDownstreamDirty()` walks the graph and marks:
   - The material node as dirty
   - Any mesh nodes using that material as dirty
   - Any scene nodes containing those meshes as dirty
   - Any other downstream nodes as dirty
3. **Trigger evaluation** → `this.graph.triggerChange()` fires (deferred via setTimeout)
4. **Evaluator runs** → All dirty nodes are re-evaluated in topological order
5. **Pipeline updates** → Material updates, meshes get new material, scene updates, viewport renders

## Benefits

✅ **Complete Pipeline Updates**: Loading a texture now updates the entire downstream chain
✅ **No Manual Intervention**: Users don't need to wiggle other inputs to trigger updates
✅ **Consistent Behavior**: Material nodes and loader nodes now behave consistently
✅ **Proper Incremental Evaluation**: The evaluator's dirty flag optimization still works correctly

## Files Modified

1. **`src/core/Node.ts`** - Added `markDownstreamDirty()` method to base Node class
2. **`src/three/nodes/material/BaseMaterialNode.ts`** - Updated texture loading to use new method
3. **`src/three/nodes/loaders/BaseFileLoaderNode.ts`** - Updated file loading to use new method

## Verification

- ✅ No TypeScript compilation errors
- ✅ No linter errors
- ✅ Build succeeds
- ✅ All material nodes inherit the fix
- ✅ All loader nodes inherit the fix

