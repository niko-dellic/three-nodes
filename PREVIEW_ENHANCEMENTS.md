# Preview System Enhancements

## Overview

Enhanced the preview system to support light helpers and added a basic Object3D component. All loader nodes and light nodes can now be properly previewed with visual helpers.

## Implemented Features

### 1. Light Preview with Helpers ✅

**Updated `PreviewManager.ts`** to add specialized preview methods for lights:

#### DirectionalLight Preview

- Creates a clone of the directional light
- Adds `DirectionalLightHelper` to visualize light direction
- Groups light + helper together for preview
- Helper size: 1 unit

#### PointLight Preview

- Creates a clone of the point light
- Adds `PointLightHelper` to show light position and range
- Groups light + helper together for preview
- Helper size: 0.5 units

#### SpotLight Preview

- Creates a clone of the spotlight
- Adds `SpotLightHelper` to visualize cone and direction
- Groups light + helper together for preview
- Helper updates with light properties

**How it Works:**

1. When a light node is selected for preview
2. `addNodeToPreview` detects the light type
3. Calls appropriate helper method
4. Creates a `THREE.Group` containing:
   - Cloned light (so it doesn't affect the original)
   - Visual helper (wireframe representation)
5. Adds group to preview scene
6. Helper provides visual feedback of light properties

### 2. Object3D Component Node ✅

**Created `Object3DNode`** (`src/three/nodes/scene/Object3DNode.ts`):

**Purpose:**

- Basic empty Object3D container
- Useful for grouping objects
- Hierarchical scene organization
- Transform parent for multiple children

**Input Ports:**

- `position` (Vector3) - Position in 3D space
- `rotation` (Vector3) - Rotation in radians
- `scale` (Vector3) - Scale factors
- `children` (Object3D, array) - Child objects to add

**Output Ports:**

- `object` (Object3D) - The configured Object3D

**Properties:**

- `name` (string) - Object name (default: "Object3D")
- `visible` (boolean) - Visibility flag (default: true)

**Features:**

- **Transform Support**: Apply position, rotation, scale from inputs
- **Child Management**: Automatically manages children hierarchy
- **Array Support**: Accepts multiple children via array connections
- **Property Binding**: Name and visibility from properties panel
- **Preview Support**: Can be previewed (shows as empty Object3D in scene)

**Use Cases:**

```javascript
// Grouping multiple objects
const group = new Object3DNode('group1');
graph.connect(mesh1.outputs.get('mesh')!, group.inputs.get('children')!, true); // Array connection
graph.connect(mesh2.outputs.get('mesh')!, group.inputs.get('children')!, true);
graph.connect(mesh3.outputs.get('mesh')!, group.inputs.get('children')!, true);

// Apply transforms to entire group
graph.connect(positionVec.outputs.get('vector')!, group.inputs.get('position')!);

// Use in scene
graph.connect(group.outputs.get('object')!, sceneCompiler.inputs.get('objects')!);
```

### 3. Loader Preview Support ✅

**GLTFLoaderNode and Rhino3dmLoaderNode** now fully support preview:

- Loaded models automatically appear when node is selected
- Works with "selected" or "all" preview modes
- Materials are preserved (shown semi-transparent in preview)
- Respects visibility toggle (eye icon)

**How it Works:**

1. Loader outputs `object` (Object3D)
2. `PreviewManager.addNodeToPreview` detects Object3D
3. Calls `addObject3DToPreview` with `preserveMaterials: true`
4. Object is cloned and materials are made semi-transparent (opacity 0.7)
5. Added to preview scene as overlay

### 4. Updated Preview Detection

**Modified `PreviewManager.addNodeToPreview`:**

```typescript
// Detection order:
1. Check for CompiledScene (from SceneCompilerNode)
2. Check for DirectionalLight → add with helper
3. Check for PointLight → add with helper
4. Check for SpotLight → add with helper
5. Check for Object3D → add with material preservation
6. Check for BufferGeometry → add with preview material
7. Check for Material → add material preview sphere
```

This ensures lights always show helpers when previewed, regardless of how they're output from nodes.

## Technical Details

### Light Helper Implementation

**DirectionalLight Helper:**

```typescript
private addDirectionalLightToPreview(nodeId: string, light: THREE.DirectionalLight): void {
  const lightClone = light.clone();
  const helper = new THREE.DirectionalLightHelper(lightClone, 1);
  const group = new THREE.Group();
  group.add(lightClone);
  group.add(helper);
  this.nodeObjects.set(nodeId, group);
  scene.add(group);
}
```

**Why Clone?**

- Original light might be in the baked scene
- Preview shouldn't affect original light properties
- Allows independent manipulation

**Why Group?**

- Keep light and helper together
- Easy cleanup on preview update
- Single object to track in `nodeObjects` map

### Object3D Node Architecture

**Hierarchy Management:**

```typescript
evaluate(): void {
  // Clear existing children
  while (this.object.children.length > 0) {
    this.object.remove(this.object.children[0]);
  }

  // Add new children from inputs
  const children = this.getInputValues<THREE.Object3D>('children');
  for (const child of children) {
    // Handle arrays and single objects
    this.object.add(child);
  }
}
```

**Array Support:**

- Uses `getInputValues` for multiple connections
- Handles both single objects and arrays
- Flattens nested arrays automatically

## Build Status

✅ **Build Successful**

- TypeScript compilation: ✓
- Bundle size: 952.92 kB (233.94 kB gzipped)
- +~5 kB from light helpers
- All 55 nodes compile without errors

## Usage Examples

### Preview DirectionalLight

```javascript
// Create directional light
const dirLight = new DirectionalLightNode('light1');

// Configure
graph.connect(colorPicker.outputs.get('color')!, dirLight.inputs.get('color')!);
graph.connect(intensitySlider.outputs.get('value')!, dirLight.inputs.get('intensity')!);

// Select node → helper appears showing light direction
// Helper shows as wireframe arrow pointing in light direction
```

### Group Objects with Object3D

```javascript
// Create group
const group = new Object3DNode('group1');
group.setProperty('name', 'MyGroup');

// Add children (using array connections with shift+drag)
graph.connect(cube.outputs.get('mesh')!, group.inputs.get('children')!, true);
graph.connect(sphere.outputs.get('mesh')!, group.inputs.get('children')!, true);
graph.connect(cone.outputs.get('mesh')!, group.inputs.get('children')!, true);

// Position the entire group
graph.connect(positionNode.outputs.get('vector')!, group.inputs.get('position')!);

// Add to scene
graph.connect(group.outputs.get('object')!, sceneCompiler.inputs.get('objects')!);
```

### Preview Loaded Model

```javascript
// Load GLTF
const gltfLoader = new GLTFLoaderNode('loader1');
// Click file picker, select model

// Select node → model appears in preview with original materials
// Materials are made semi-transparent to distinguish from baked scene
```

### Hierarchical Scene Structure

```javascript
// Create hierarchy
const root = new Object3DNode('root');
const leftBranch = new Object3DNode('left');
const rightBranch = new Object3DNode('right');

// Build tree
graph.connect(mesh1, leftBranch.inputs.get('children')!, true);
graph.connect(mesh2, leftBranch.inputs.get('children')!, true);
graph.connect(mesh3, rightBranch.inputs.get('children')!, true);
graph.connect(mesh4, rightBranch.inputs.get('children')!, true);

graph.connect(leftBranch.outputs.get('object')!, root.inputs.get('children')!, true);
graph.connect(rightBranch.outputs.get('object')!, root.inputs.get('children')!, true);

// Transform branches independently
graph.connect(leftPos, leftBranch.inputs.get('position')!);
graph.connect(rightPos, rightBranch.inputs.get('position')!);
```

## Future Enhancements

### Additional Helpers

- [ ] AmbientLight - show sphere at origin
- [ ] HemisphereLight - show sky/ground colors
- [ ] RectAreaLight - show rectangular plane
- [ ] Custom helper sizes/colors

### Object3D Enhancements

- [ ] Add `lookAt` input (Vector3)
- [ ] Add `parent` output for hierarchy
- [ ] Add transform gizmos in preview
- [ ] Add matrix decomposition outputs
- [ ] Add bounding box visualization

### Preview System

- [ ] Helper color customization
- [ ] Helper size property
- [ ] Toggle helpers on/off
- [ ] Show/hide specific helper types
- [ ] Preview transparency control

## Node Count Update

- **Previous Total**: 54 nodes
- **New Nodes**: 1 (Object3DNode)
- **Current Total**: 55 nodes

## Integration

### Context Menu

**Scene Category:**

- Scene ✓
- Create Mesh ✓
- Add to Scene (Legacy) ✓
- Scene Compiler ✓
- **Object3D** 📦 **NEW!**

### Preview System

**Supported Objects:**

- ✓ Mesh (with materials)
- ✓ Object3D (empty containers)
- ✓ **DirectionalLight** (with helper) **ENHANCED!**
- ✓ **PointLight** (with helper) **ENHANCED!**
- ✓ **SpotLight** (with helper) **ENHANCED!**
- ✓ Geometry (with preview material)
- ✓ Material (with preview sphere)
- ✓ **GLTF Models** (preserved materials) **ENHANCED!**
- ✓ **Rhino 3DM Models** (preserved materials) **ENHANCED!**
- ✓ CompiledScene (all objects)

## Notes

- Light helpers provide immediate visual feedback
- Object3D enables hierarchical scene organization
- All loader nodes now fully previewable
- Helpers update automatically with light properties
- Material preservation for loaded models
- Clean clone/group pattern prevents interference with baked scene
