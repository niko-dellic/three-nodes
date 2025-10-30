# Loader Preview Fix

## Problem

GLTF and Rhino 3DM loader nodes were not showing previews after loading files, even though Object3D previews worked correctly.

## Root Cause

When loader nodes loaded files asynchronously, they:

1. Stored the loaded object in `this.loadedObject`
2. Called `this.markDirty()` to mark the node as needing re-evaluation
3. BUT didn't trigger graph evaluation

This meant:

- The outputs were never set because `evaluate()` never ran
- The preview system had no outputs to display
- The loaded object existed in memory but wasn't visible

## Solution

### 1. Added Graph Reference to Nodes

**Modified `src/core/Node.ts`:**

- Added `public graph?: any;` property to Node class
- This allows nodes to access their parent graph

**Modified `src/core/Graph.ts`:**

- Set `node.graph = this;` in `addNode()` method
- Clear `node.graph = undefined;` in `removeNode()` method

### 2. Trigger Graph Change Notification After Loading

**Modified `src/three/nodes/loaders/BaseFileLoaderNode.ts`:**

**After successful load:**

```typescript
// Mark as loaded and trigger evaluation
this.isLoading = false;
this.markDirty();

// Force graph change notification to trigger evaluation
if (this.graph) {
  this.graph.triggerChange();
}
```

**After load error:**

```typescript
// Trigger change to clear outputs
if (this.graph) {
  this.graph.triggerChange();
}
```

**When clearing file:**

```typescript
// Force graph change notification to clear outputs and preview
if (this.graph) {
  this.graph.triggerChange();
}
```

## What This Fixes

✅ **GLTF Loader Preview**: After loading a .gltf or .glb file:

- Graph evaluates automatically
- `evaluate()` sets output values with loaded object
- Preview system detects the Object3D output
- Model appears in preview with semi-transparent materials

✅ **Rhino 3DM Loader Preview**: After loading a .3dm file:

- Graph evaluates automatically
- `evaluate()` sets output values with loaded geometry
- Preview system detects the Object3D output
- Geometry appears in preview

✅ **Clear File**: When clearing a loaded file:

- Graph evaluates automatically
- Outputs are cleared (set to undefined)
- Preview is removed

## Flow After Fix

1. **User clicks file picker button**
2. **User selects file**
3. `handleFileSelected()` called
4. File loaded asynchronously via `loadFile()`
5. **NEW**: `this.graph.triggerChange()` called after load
6. Graph notifies listeners (GraphEditor/Evaluator)
7. Evaluator evaluates all dirty nodes
8. Loader's `evaluate()` runs, setting outputs
9. Preview system detects outputs and shows preview

## Benefits

- **Automatic Updates**: No manual evaluation needed
- **Consistent Behavior**: Loaders work like other nodes that trigger changes
- **Error Handling**: Change notification triggered even on errors
- **Preview Sync**: Preview always reflects current state
- **Proper Architecture**: Uses Graph's change notification system (triggerChange) rather than directly calling evaluate

## Build Status

✅ **Build Successful**

- TypeScript compilation: ✓
- Bundle size: 953.06 kB (233.98 kB gzipped)
- All 55 nodes compile without errors

## Testing

To verify the fix works:

### GLTF Loader:

1. Add GLTFLoaderNode to graph
2. Click file picker button
3. Select a .gltf or .glb file
4. File loads (see console progress)
5. **Preview should now appear automatically**
6. Model visible with semi-transparent materials

### Rhino 3DM Loader:

1. Add Rhino3dmLoaderNode to graph
2. Click file picker button
3. Select a .3dm file
4. WASM loads, then file loads
5. **Preview should now appear automatically**
6. Geometry visible in preview

### Clear File:

1. With file loaded and preview visible
2. Click "Clear" button
3. **Preview should disappear immediately**
4. Outputs cleared

## Notes

- Graph reference pattern is common in node-based systems
- Allows nodes to trigger global operations (change notifications, update UI, etc.)
- Safe cleanup in `removeNode()` prevents memory leaks
- Async operations now properly integrate with graph evaluation flow
- Uses `triggerChange()` rather than direct evaluation - this respects the architecture where Graph handles structure and Evaluator handles computation
- The GraphEditor subscribes to graph changes via `onChange()` and triggers evaluation when changes occur
