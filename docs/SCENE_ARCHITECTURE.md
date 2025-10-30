# Scene Architecture Refactor

## Problem

The previous implementation had `AddToSceneNode` directly mutating the scene by adding objects during evaluation. This caused objects to accumulate on every graph evaluation (e.g., when adjusting sliders), leading to duplicate objects in the scene.

## Solution

Separated concerns into two distinct node types with clear responsibilities:

### 1. SceneCompilerNode (New)

**Role**: Intermediary data collector

- **Does NOT mutate the scene**
- Collects scene, objects (supports arrays via multiple connections), and camera
- Outputs a `CompiledScene` object containing:
  - `scene: THREE.Scene`
  - `objects: THREE.Object3D[]` (flattened from all inputs)
  - `camera: THREE.Camera`

**Inputs**:

- `scene` (Scene)
- `objects` (Object3D) - supports multiple connections (shift+drag)
- `camera` (Camera)

**Output**:

- `compiled` (Any) - Contains CompiledScene data

### 2. SceneOutputNode (Updated)

**Role**: Scene finalizer

- **Clears previous objects from the scene**
- Adds fresh objects from compiled scene data
- Tracks objects internally to ensure clean rebuilds
- Outputs final `SceneOutput` for rendering

**Inputs**:

- `compiled` (Any) - CompiledScene from SceneCompilerNode
- `update` (Boolean) - Enable/disable scene updates

**Output**:

- `output` (Any) - Final SceneOutput with scene and camera

### 3. AddToSceneNode (Deprecated)

The old `AddToSceneNode` is kept for backward compatibility but marked as **[DEPRECATED]** in the registry. Use `SceneCompilerNode` instead.

## Benefits

1. **No Object Accumulation**: Scene is cleared and rebuilt cleanly on every evaluation
2. **Clear Separation of Concerns**:
   - Compilation (data collection) is separate from finalization (scene mutation)
3. **Array Support**: SceneCompilerNode naturally handles multiple objects via array connections
4. **Predictable Behavior**: Every evaluation produces the exact scene specified by the graph
5. **Better for Animation**: Clean rebuilds make it safe to animate parameters

## Usage Example

```typescript
// Create scene
const sceneNode = registry.createNode('SceneNode', 'scene');
const cameraNode = registry.createNode('PerspectiveCameraNode', 'camera');
const mesh1 = registry.createNode('CreateMeshNode', 'mesh1');
const mesh2 = registry.createNode('CreateMeshNode', 'mesh2');
const light = registry.createNode('AmbientLightNode', 'light');

// Compile scene (collects all objects)
const sceneCompiler = registry.createNode('SceneCompilerNode', 'compiler');
graph.connect(sceneNode.outputs.get('scene')!, sceneCompiler.inputs.get('scene')!);
graph.connect(cameraNode.outputs.get('camera')!, sceneCompiler.inputs.get('camera')!);

// Connect multiple objects using array connections
graph.connect(mesh1.outputs.get('mesh')!, sceneCompiler.inputs.get('objects')!);
graph.connect(mesh2.outputs.get('mesh')!, sceneCompiler.inputs.get('objects')!, true); // shift+drag
graph.connect(light.outputs.get('light')!, sceneCompiler.inputs.get('objects')!, true); // shift+drag

// Output (finalizes scene)
const sceneOutput = registry.createNode('SceneOutputNode', 'output');
graph.connect(sceneCompiler.outputs.get('compiled')!, sceneOutput.inputs.get('compiled')!);
```

## Files Modified

- **Created**: `src/three/nodes/scene/SceneCompilerNode.ts`
- **Updated**: `src/three/nodes/output/SceneOutputNode.ts`
- **Updated**: `src/three/index.ts` (registration)
- **Updated**: `src/main.ts` (example scene)

## Migration Guide

### Old Pattern (Deprecated)

```typescript
const addToScene = registry.createNode('AddToSceneNode');
graph.connect(scene.outputs.get('scene')!, addToScene.inputs.get('scene')!);
graph.connect(mesh.outputs.get('mesh')!, addToScene.inputs.get('object')!);
graph.connect(addToScene.outputs.get('scene')!, sceneOutput.inputs.get('scene')!);
```

### New Pattern (Recommended)

```typescript
const sceneCompiler = registry.createNode('SceneCompilerNode');
graph.connect(scene.outputs.get('scene')!, sceneCompiler.inputs.get('scene')!);
graph.connect(mesh.outputs.get('mesh')!, sceneCompiler.inputs.get('objects')!);
graph.connect(camera.outputs.get('camera')!, sceneCompiler.inputs.get('camera')!);
graph.connect(sceneCompiler.outputs.get('compiled')!, sceneOutput.inputs.get('compiled')!);
```

## Technical Details

### SceneCompilerNode Implementation

- Collects all input values using `getInputValues()` to support array connections
- Flattens nested arrays of objects
- Does NOT call `scene.add()` or mutate any objects
- Returns pure data structure

### SceneOutputNode Implementation

- Maintains `previousObjects` array to track what was added
- Removes all previous objects before adding new ones
- Only updates when `update` input is true
- Properly handles object parent relationships

### Object Lifecycle

1. **Evaluation Start**: SceneOutputNode removes all tracked objects from scene
2. **Object Addition**: New objects from compiled data are added to scene
3. **Object Tracking**: All added objects are tracked for next evaluation
4. **Node Disposal**: Tracked objects array is cleared on dispose()

## Why This Works

**Before**: Each evaluation would call `scene.add(object)` without clearing, causing:

- Object accumulation
- Memory leaks
- Incorrect rendering

**After**: Each evaluation:

1. Clears previous objects (`scene.remove()`)
2. Adds fresh objects from compiled data
3. Result: Scene always matches current graph state

## Performance Considerations

- **Object Creation**: Geometry/material nodes create new objects on each evaluation (when parameters change)
- **Scene Management**: SceneOutputNode efficiently tracks and removes only objects it added
- **Memory**: Old objects are properly removed, allowing garbage collection
- **Evaluation**: Only evaluates when `update` is true, allowing manual control

## Future Enhancements

Potential improvements for the future:

1. **Incremental Updates**: Track object changes and only update what changed
2. **Object Pooling**: Reuse objects when parameters unchanged
3. **Scene Graph Diffing**: Compare previous and current state to minimize mutations
4. **Multi-Scene Support**: Support multiple independent scenes
5. **Scene Templates**: Pre-configured scene setups
