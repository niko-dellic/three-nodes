# File Loader Nodes Implementation

## Overview

Successfully implemented 2 file loader nodes with shared base functionality, bringing the total new nodes to **54**.

## Implementation

### BaseFileLoaderNode Pattern

Created a reusable base class (`src/three/nodes/loaders/BaseFileLoaderNode.ts`) that provides:

**Features:**

- 📁 **File Picker UI** - Tweakpane button that triggers native file input
- **File Path Storage** - Stores selected file name in properties
- **Async Loading** - Promise-based file loading with error handling
- **Progress Tracking** - Console logging of load progress
- **Resource Management** - Automatic URL creation/cleanup with `URL.createObjectURL`
- **Dynamic UI** - Button text updates to show current file name
- 🗑️ **Clear Function** - Button to remove loaded file

**Architecture:**

- Extends `TweakpaneNode` for consistent UI integration
- Abstract `loadFile(url, file)` method for subclass implementation
- Outputs: `object`, `scene`, `loaded` (boolean status)
- Properties: `filePath`, `acceptedTypes`

### GLTFLoaderNode

**File:** `src/three/nodes/loaders/GLTFLoaderNode.ts`

**Features:**

- Loads GLTF (.gltf) and GLB (.glb) files
- Uses Three.js `GLTFLoader` from examples
- Full GLTF 2.0 specification support

**Outputs:**

- `object` - The loaded scene as Object3D
- `scene` - The main scene from GLTF
- `loaded` - Boolean indicating load status
- `animations` - Array of AnimationClip objects
- `cameras` - Array of cameras from the GLTF
- `asset` - Asset metadata (copyright, generator, version, etc.)

**Reference:** [Three.js GLTFLoader Documentation](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)

**Use Cases:**

- Load 3D models from Blender, Maya, etc.
- Import animated characters
- Load entire scenes with lights and cameras
- Access model metadata and animations

### Rhino3dmLoaderNode

**File:** `src/three/nodes/loaders/Rhino3dmLoaderNode.ts`

**Features:**

- Loads Rhino 3DM files (.3dm)
- Uses Three.js `Rhino3dmLoader` from examples
- Automatically loads Rhino3dm WASM library from CDN

**Outputs:**

- `object` - The loaded geometry as Object3D
- `scene` - Same as object (for compatibility)
- `loaded` - Boolean indicating load status

**Configuration:**

- WASM library path: `https://cdn.jsdelivr.net/npm/rhino3dm@8.4.0/`
- Can be reconfigured by extending the class

**Reference:** [Three.js 3DMLoader Documentation](https://threejs.org/docs/#examples/en/loaders/3DMLoader)

**Use Cases:**

- Import CAD models from Rhino
- Load architectural designs
- Bring in parametric geometry

## File Picker Implementation

### How It Works

1. **Button Click** - User clicks the file picker button in the node
2. **File Dialog** - Native browser file input opens
3. **File Selection** - User selects a file (filtered by accepted types)
4. **URL Creation** - `URL.createObjectURL()` creates temporary URL
5. **Async Load** - File is loaded using the appropriate loader
6. **Resource Tracking** - Loaded objects are tracked for disposal
7. **URL Cleanup** - Object URL is revoked after loading
8. **UI Update** - Button text updates to show file name

### Browser Compatibility

- Uses standard HTML5 File API
- Works in all modern browsers
- No server-side upload required
- Files are processed entirely client-side

## Usage Examples

### Load a GLTF Model

```javascript
import { GLTFLoaderNode } from '@/three';

// Create loader node
const gltfLoader = new GLTFLoaderNode('gltf1');
graph.addNode(gltfLoader);

// User clicks file picker button in node UI
// Selects a .gltf or .glb file
// File loads automatically

// Connect to scene
graph.connect(
  gltfLoader.outputs.get('scene')!,
  sceneCompiler.inputs.get('objects')!
);

// Access animations
graph.connect(
  gltfLoader.outputs.get('animations')!,
  animationMixer.inputs.get('clips')!
);

// Access cameras
graph.connect(
  gltfLoader.outputs.get('cameras')!,
  cameraSelector.inputs.get('cameras')!
);
```

### Load a Rhino 3DM File

```javascript
import { Rhino3dmLoaderNode } from '@/three';

// Create loader node
const rhinoLoader = new Rhino3dmLoaderNode('rhino1');
graph.addNode(rhinoLoader);

// User clicks file picker button
// Selects a .3dm file
// WASM library loads, then file loads

// Connect to scene
graph.connect(
  rhinoLoader.outputs.get('scene')!,
  sceneCompiler.inputs.get('objects')!
);

// Apply transforms
graph.connect(
  rhinoLoader.outputs.get('scene')!,
  positionNode.inputs.get('object')!
);
```

### Check Load Status

```javascript
// Monitor when file is loaded
graph.connect(
  gltfLoader.outputs.get('loaded')!,
  booleanMonitor.inputs.get('value')!
);

// Conditional rendering
graph.connect(
  gltfLoader.outputs.get('loaded')!,
  sceneOutput.inputs.get('update')!
);
```

## Technical Details

### File Handling

**Accepted File Types:**

- **GLTFLoader**: `.gltf, .glb`
- **Rhino3dmLoader**: `.3dm`

**Loading Process:**

1. File selected via HTML input element
2. `File` object received from browser
3. Temporary URL created with `URL.createObjectURL(file)`
4. Loader uses URL to load file
5. Success: object stored, URL revoked, UI updated
6. Error: URL revoked, error logged, property cleared

### Resource Management

**Tracking:**

- All loaded objects tracked via `trackResource()`
- Automatic cleanup on node disposal
- URL objects cleaned up immediately after load

**Memory:**

- Files loaded into memory as needed
- No permanent file storage
- Objects disposed when node is removed

### Error Handling

**Load Errors:**

- Caught and logged to console
- File path property cleared
- UI reverts to "No file selected"
- Loading state reset

**Progress Tracking:**

- Progress events logged to console
- Shows percentage complete
- Useful for large files

## Integration

### Context Menu

**Category:** Loaders 📦🦏

**Nodes:**

- GLTF Loader 📦
- Rhino 3DM Loader 🦏

### Registry

Both nodes registered in `src/three/index.ts`:

```typescript
registry.register(GLTFLoaderNode, {
  type: 'GLTFLoaderNode',
  category: 'Loaders',
  label: 'GLTF Loader',
  description: 'Load GLTF/GLB 3D models with animations',
  icon: '📦',
});

registry.register(Rhino3dmLoaderNode, {
  type: 'Rhino3dmLoaderNode',
  category: 'Loaders',
  label: 'Rhino 3DM Loader',
  description: 'Load Rhino 3dm files',
  icon: '🦏',
});
```

## Build Status

✅ **Successful**

- TypeScript compilation: ✓
- All type errors resolved: ✓
- Bundle size: 948.04 kB (232.93 kB gzipped)
- +145 kB from loader dependencies

## Future Enhancements

### Additional Loaders to Consider

- [ ] **OBJLoader** - Wavefront .obj files
- [ ] **FBXLoader** - Autodesk FBX files
- [ ] **PLYLoader** - Polygon file format
- [ ] **STLLoader** - Stereolithography files
- [ ] **ColladaLoader** - .dae files
- [ ] **DRACOLoader** - Compressed geometry
- [ ] **KTX2Loader** - Compressed textures
- [ ] **TextureLoader** - Images/textures
- [ ] **CubeTextureLoader** - Environment maps
- [ ] **HDRLoader** - HDR environment maps

### Enhanced Features

- [ ] Drag-and-drop file loading
- [ ] URL input option (load from remote)
- [ ] File validation before loading
- [ ] Progress bar UI (instead of console)
- [ ] Batch file loading
- [ ] File caching/history
- [ ] Export loaded file metadata
- [ ] Thumbnail preview in node

## Notes

- All loaders share the `BaseFileLoaderNode` pattern
- Easy to extend for new file formats
- Browser-based file handling (no server required)
- Fully async with proper error handling
- Integrates seamlessly with existing node system
- Follows established TweakpaneNode patterns
