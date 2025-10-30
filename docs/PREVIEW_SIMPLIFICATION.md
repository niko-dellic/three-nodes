# Preview System Simplification

## Problem

The system previously maintained two separate scenes:

1. **Preview Scene** - Displayed when preview mode was "selected" or "all"
2. **Baked Scene** - The final output from the node graph

This dual-scene approach added complexity and made the viewport switch between different scenes based on preview mode.

## Solution

Simplified to a single-scene architecture:

- **Always render the baked scene** (the actual scene from the graph)
- **Add preview objects directly to the baked scene** as overlay geometry
- Preview objects are added/removed dynamically based on preview mode and selection

## Changes

### Default Settings

1. **Preview Mode**: Now defaults to `"selected"` (was `"none"`)
2. **Preview Material**: Now defaults to **MeshBasicMaterial** (unlit, semi-transparent green)
   - Color: Green (`0x00ff00`)
   - Transparency: 50% opacity
   - Unaffected by lights (BasicMaterial)
   - Double-sided rendering

### Preview Materials Updated

New material options (in order):

1. **Basic (Green)** - Semi-transparent green, unlit _(default)_
2. **Wireframe** - Green wireframe, semi-transparent
3. **Normal** - Normal map visualization
4. **Basic (Orange)** - Semi-transparent orange, unlit

### Architecture Changes

#### PreviewManager

**Removed:**

- `previewScene: THREE.Scene` - No longer maintaining a separate preview scene

**Added:**

- `currentBakedScene: THREE.Scene | null` - Reference to the current baked scene from graph
- `setBakedScene(scene: THREE.Scene | null)` - Updates the scene reference and migrates preview objects
- `dispose()` - Properly cleans up preview objects from the baked scene

**Updated:**

- `updatePreview()` - Now adds/removes preview objects directly to/from the baked scene
- `addObject3DToPreview()` - Adds preview geometry to baked scene instead of preview scene
- `addGeometryToPreview()` - Handles both single and array geometries, adds to baked scene
- `addMaterialPreview()` - Creates preview sphere in baked scene

#### LiveViewport

**Simplified rendering:**

- No more conditional scene switching
- Always renders `this.currentScene` (the baked scene)
- Preview objects are already in the baked scene (added by PreviewManager)
- Removed complex preview mode checking in render loop

**Updated:**

- `updateScene()` - Now calls `previewManager.setBakedScene()` to pass the baked scene
- `startRenderLoop()` - Simplified to always render the same scene

## Benefits

### 1. Simpler Mental Model

- One scene to think about
- Preview objects are just additional geometry in the same scene
- No scene switching confusion

### 2. Consistent Rendering

- Camera always views the same scene
- Orbit controls work consistently
- No jarring transitions between preview and baked modes

### 3. Better Visual Integration

- Preview objects appear in the same lighting environment as baked objects
- Can see both baked output and preview geometry simultaneously
- More intuitive visualization of node outputs

### 4. Easier to Maintain

- Less state management (one scene vs two)
- Clearer separation of concerns
- Fewer edge cases to handle

### 5. Unlit Preview Material (Default)

- **BasicMaterial** is unlit, so preview geometry is always visible
- Doesn't compete with or get affected by scene lighting
- Semi-transparent green color makes it clearly distinguishable from baked geometry
- Works well in any lighting condition

## Usage

### Preview Modes

- **None**: No preview objects shown, only baked scene
- **Selected** _(default)_: Shows preview of selected nodes in the baked scene
- **All**: Shows preview of all nodes, with per-node visibility toggle (V key)

### Preview Materials

1. **Basic (Green)** - Default, unlit, semi-transparent green
2. **Wireframe** - Green wireframe overlay
3. **Normal** - Shows normal map visualization
4. **Basic (Orange)** - Alternative color option

### Workflow

1. Scene graph outputs to `SceneOutputNode`
2. `LiveViewport` receives the baked scene
3. `LiveViewport` passes scene to `PreviewManager` via `setBakedScene()`
4. `PreviewManager` adds preview objects directly to the baked scene
5. `LiveViewport` renders the baked scene (with preview objects already in it)

## Implementation Details

### Scene Ownership

- The **baked scene** is owned by `SceneOutputNode` and the graph
- `PreviewManager` has a **reference** to the baked scene
- `PreviewManager` can add/remove preview objects but doesn't modify baked objects

### Object Tracking

- `PreviewManager` tracks all preview objects in `nodeObjects` Map
- When scene changes, preview objects are removed from old scene and added to new scene
- `dispose()` ensures clean removal of all preview objects

### Material Application

- Preview materials override the original materials on cloned objects
- Applied recursively to all meshes in the object hierarchy
- Original objects remain unchanged (clones are used)

### Array Support

- `addGeometryToPreview()` handles both single geometries and arrays
- Creates a `THREE.Group` for multiple geometries
- All geometries in the array get the same preview material

## Migration Notes

**No breaking changes** - The API remains the same:

- `setPreviewMode()` works as before
- Preview material cycling works as before
- Node visibility toggling works as before

**Internal changes only:**

- `getPreviewScene()` removed (not used externally)
- New `setBakedScene()` method added
- Scene management happens transparently

## Performance

**Improved:**

- Single render call instead of conditional scene switching
- No scene duplication overhead
- Fewer state checks per frame

**Same:**

- Preview object creation/disposal cost unchanged
- Material application cost unchanged

## Visual Comparison

### Before

```
Preview Mode: Selected → Render preview scene (different scene)
Preview Mode: All → Render preview scene (different scene)
Preview Mode: None → Render baked scene
```

### After

```
Preview Mode: Selected → Render baked scene + preview overlays
Preview Mode: All → Render baked scene + preview overlays
Preview Mode: None → Render baked scene
```

## Code Example

```typescript
// LiveViewport passes baked scene to PreviewManager
this.previewManager.setBakedScene(sceneOutput.scene);

// PreviewManager adds preview objects directly to baked scene
if (this.currentBakedScene) {
  const clone = object.clone();
  clone.material = this.previewMaterial; // Unlit green semi-transparent
  this.currentBakedScene.add(clone);
}

// LiveViewport always renders the same scene
this.renderer.render(this.currentScene, this.defaultCamera);
```

## Testing Checklist

- [x] Build succeeds without errors
- [x] Default preview mode is "selected"
- [x] Default preview material is green BasicMaterial
- [x] Preview objects appear in the baked scene
- [x] Switching preview modes works correctly
- [x] Changing preview materials works
- [x] Node selection updates preview correctly
- [x] Preview objects are cleaned up properly
- [x] Array geometries display correctly in preview
- [x] No scene switching artifacts

## Future Enhancements

Potential improvements:

1. **Preview Depth Ordering** - Render preview objects with depth offset to appear "on top"
2. **Preview Outlining** - Add outline shader for better preview visibility
3. **Preview Animation** - Subtle animation/pulsing for selected preview objects
4. **Preview Groups** - Group preview objects by node type or category
5. **Custom Preview Materials** - Per-node-type preview materials
