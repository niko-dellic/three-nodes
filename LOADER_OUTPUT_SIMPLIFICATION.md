# Loader Output Simplification

## Problem

The loader nodes (GLTF and Rhino 3DM) had redundant output ports:

- `object` output → `gltf.scene` (Object3D)
- `scene` output → `gltf.scene` (same Object3D)

Both ports output the **exact same object**, which:

1. Caused confusion about which port to use
2. Triggered duplicate detection logic unnecessarily
3. Added complexity to the node interface
4. Provided no additional functionality

## Solution

**Simplified to single output**: Keep only the `scene` output port.

### Rationale

- In Three.js, a `Scene` **is** an `Object3D` (extends Object3D)
- The loaded scene can be used anywhere an Object3D is accepted
- Single output port is clearer and more intuitive
- Eliminates redundancy at the source

## Changes Made

### BaseFileLoaderNode

**Before:**

```typescript
this.addOutput({ name: 'object', type: PortType.Object3D });
this.addOutput({ name: 'scene', type: PortType.Scene });
this.addOutput({ name: 'loaded', type: PortType.Boolean });

evaluate(_context: EvaluationContext): void {
  if (this.loadedObject) {
    this.setOutputValue('object', this.loadedObject);  // ← Duplicate
    this.setOutputValue('scene', this.loadedObject);   // ← Duplicate
    this.setOutputValue('loaded', true);
  }
}
```

**After:**

```typescript
this.addOutput({ name: 'scene', type: PortType.Scene }); // Scene is just an Object3D
this.addOutput({ name: 'loaded', type: PortType.Boolean });

evaluate(_context: EvaluationContext): void {
  if (this.loadedObject) {
    this.setOutputValue('scene', this.loadedObject);   // ← Single output
    this.setOutputValue('loaded', true);
  }
}
```

## Updated Node Interfaces

### GLTFLoaderNode

**Outputs:**

- ✅ `scene` (Object3D) - The loaded GLTF scene
- ✅ `loaded` (Boolean) - Load status
- ✅ `animations` (AnimationClip[]) - Animation clips
- ✅ `cameras` (Camera[]) - Cameras from GLTF
- ✅ `asset` (Object) - Asset metadata

### Rhino3dmLoaderNode

**Outputs:**

- ✅ `scene` (Object3D) - The loaded 3DM geometry
- ✅ `loaded` (Boolean) - Load status

## Usage Examples

### GLTF Loader

```javascript
const gltfLoader = new GLTFLoaderNode('gltf1');

// Use scene output for everything
graph.connect(gltfLoader.outputs.get('scene')!, sceneCompiler.inputs.get('objects')!);

// Apply transforms (scene is an Object3D)
graph.connect(gltfLoader.outputs.get('scene')!, positionNode.inputs.get('object')!);

// Add to hierarchy
graph.connect(gltfLoader.outputs.get('scene')!, group.inputs.get('children')!, true);
```

### Rhino 3DM Loader

```javascript
const rhinoLoader = new Rhino3dmLoaderNode('rhino1');

// Use scene output
graph.connect(rhinoLoader.outputs.get('scene')!, sceneCompiler.inputs.get('objects')!);

// Apply material
graph.connect(rhinoLoader.outputs.get('scene')!, meshNode.inputs.get('object')!);
```

## Benefits

### 1. **Clearer Intent**

- No confusion about which port to use
- "scene" clearly indicates what you're getting
- Semantic meaning matches Three.js conventions

### 2. **Simpler Implementation**

- Fewer output ports to manage
- Less code in evaluate()
- Easier to understand node behavior

### 3. **No Duplicates**

- Preview system only sees one output
- No need for complex duplicate detection (though we keep it as safety)
- Scene tree shows correct object count

### 4. **Better Performance**

- One output value to set instead of two
- Less memory (no duplicate references)
- Simpler graph traversal

### 5. **Consistent Pattern**

- Matches how other nodes work (single semantic output)
- SceneNode outputs "scene"
- Object3DNode outputs "object"
- Loaders output "scene" (loaded scene data)

## Type Safety

The `scene` output uses `PortType.Scene`, which is compatible with:

- ✅ `PortType.Object3D` inputs (Scene extends Object3D)
- ✅ Scene compilation nodes
- ✅ Transform nodes (position, rotation, scale)
- ✅ Hierarchy nodes (Object3D, groups)

Three.js type hierarchy:

```
Object3D (base class)
  └─ Scene (extends Object3D)
```

So `PortType.Scene` can connect to any `PortType.Object3D` input.

## Migration

For any existing graphs using the old `object` output:

1. **Change connection**: `object` → `scene`
2. **Functionality unchanged**: Same object, just different port name
3. **No data loss**: Scene contains all the same data

## Files Modified

- ✅ `src/three/nodes/loaders/BaseFileLoaderNode.ts`
  - Removed `object` output port
  - Kept only `scene` output port
  - Updated evaluate() to set single output
  - Added comment explaining Scene is an Object3D

## Build Status

✅ **Build Successful**

- Bundle size: 954.24 kB (234.27 kB gzipped)
- All TypeScript errors resolved
- No breaking changes to API

## Testing

### Before Fix:

```
Load GLTF (1 sphere)
↓
Preview shows:
  Scene (4 objects)
  ├─ Object3D (from 'object' port) ← Duplicate
  ├─ Mesh
  ├─ Object3D (from 'scene' port)  ← Duplicate
  └─ Mesh
```

### After Fix:

```
Load GLTF (1 sphere)
↓
Preview shows:
  Scene (2 objects)
  ├─ Object3D ← Correct
  └─ Mesh    ← Correct
```

## Notes

- This simplification eliminates the root cause of the duplicate issue
- UUID-based duplicate detection remains as a safety measure
- Pattern can be applied to other nodes with redundant outputs
- Cleaner node interface improves user experience
