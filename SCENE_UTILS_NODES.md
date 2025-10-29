# Scene Utility Nodes

Four new utility nodes have been added to help with scene manipulation, querying, and exporting.

## 1. GLTF Exporter Node 📦

**Category:** Scene Utils  
**Reference:** [Three.js GLTFExporter](https://threejs.org/docs/#examples/en/exporters/GLTFExporter)

### Description

Exports Three.js objects or scenes to GLTF/GLB format. Can export to either JSON (`.gltf`) or binary (`.glb`) format with various export options.

### Inputs

- **object** (Object3D) - Object(s) or scene to export. Accepts single objects or arrays of objects.

### Outputs

- **data** (Any) - Exported GLTF data (JSON object for GLTF, ArrayBuffer for GLB)

### Properties

- **Binary (GLB)** (boolean, default: false) - Export as binary GLB instead of JSON GLTF
- **Only Visible** (boolean, default: true) - Only export visible objects
- **Embed Images** (boolean, default: true) - Embed images in the export
- **Max Texture Size** (number, default: 4096) - Maximum texture size in pixels
- **Include Animations** (boolean, default: true) - Include animations in export
- **Auto Download** (boolean, default: false) - Automatically download the file
- **Filename** (string, default: "scene") - Filename for auto download

### Usage Example

1. Connect a scene or object to the `object` input
2. Configure export settings in properties
3. Enable `Auto Download` to automatically save the file
4. Or connect the `data` output to other nodes for further processing

### Notes

- The export is asynchronous - results appear in the next evaluation cycle
- Multiple objects are automatically grouped before export
- When `Auto Download` is enabled, the file downloads immediately upon evaluation
- GLB format is more compact and includes binary data
- GLTF format is human-readable JSON

---

## 2. Get Object By Name Node 🔍

**Category:** Scene Utils

### Description

Searches for objects by name within an Object3D hierarchy. Supports flexible name matching with various options for exact/partial matching, case sensitivity, and recursive searching.

### Inputs

- **object** (Object3D) - Object(s) to search in. Accepts single objects or arrays.
- **name** (String) - Name to search for

### Outputs

- **found** (Object3D) - Found object(s). Returns single object or array depending on results.

### Properties

- **Recursive** (boolean, default: true) - Search through all children recursively
- **Exact Match** (boolean, default: true) - Require exact name match (vs partial/contains)
- **Case Sensitive** (boolean, default: true) - Match names with case sensitivity
- **Return First Only** (boolean, default: false) - Return only the first match found

### Usage Example

1. Connect an Object3D or scene to the `object` input
2. Enter the name to search for in the `name` input
3. Configure matching options in properties
4. The `found` output will contain the matching object(s)

### Matching Behavior

- **Exact Match ON**: Name must match exactly (e.g., "Cube" matches only "Cube")
- **Exact Match OFF**: Name can be partial (e.g., "Cu" matches "Cube", "Cube.001")
- **Case Sensitive OFF**: Ignores case (e.g., "cube" matches "Cube")
- **Recursive OFF**: Only searches the object itself and direct children

### Return Values

- **No matches**: `undefined`
- **One match**: Single Object3D
- **Multiple matches**: Array of Object3D
- **Return First Only**: Always returns single Object3D (or undefined)

---

## 3. Traverse Node 🌲

**Category:** Scene Utils  
**Reference:** [Three.js Object3D.traverse](https://threejs.org/docs/#api/en/core/Object3D.traverse)

### Description

Traverses all objects in an Object3D hierarchy and outputs them as an array. This is useful for collecting all objects in a scene for further processing with filter or other utility nodes.

### Inputs

- **object** (Object3D) - Object(s) to traverse. Accepts single objects or arrays.

### Outputs

- **objects** (Object3D) - Array of all traversed objects

### Properties

- **Include Root** (boolean, default: true) - Include the root object in the output
- **Only Visible** (boolean, default: false) - Only include visible objects
- **Max Depth** (number, default: -1) - Maximum depth to traverse (-1 = unlimited)

### Usage Example

1. Connect an Object3D or scene to the `object` input
2. Configure traversal options in properties
3. The `objects` output contains an array of all traversed objects
4. Connect to Filter Objects node or other processing nodes

### Use Cases

- **Scene Analysis**: Collect all objects for inspection or statistics
- **Bulk Operations**: Get all meshes to apply transforms or modifications
- **Hierarchy Export**: Collect objects for export or serialization
- **Combined with Filter**: Traverse → Filter → Process specific object types

### Depth Limiting

- **Max Depth = -1**: Traverse entire hierarchy (default)
- **Max Depth = 0**: Only the root object
- **Max Depth = 1**: Root and direct children
- **Max Depth = 2**: Root, children, and grandchildren, etc.

---

## 4. Filter Objects Node 🔬

**Category:** Scene Utils

### Description

Filters a list of Object3D based on various criteria including type, name, visibility, and properties. Can optionally search recursively through children before filtering.

### Inputs

- **objects** (Object3D) - Object(s) to filter. Accepts single objects or arrays.
- **name** (String, optional) - Name filter (leave empty to skip name filtering)

### Outputs

- **filtered** (Object3D) - Filtered objects. Returns single object or array.

### Properties

- **Recursive** (boolean, default: false) - Traverse children before filtering
- **Type** (string, default: "All") - Filter by object type
- **Only Visible** (boolean, default: false) - Only include visible objects
- **Name Match** (string, default: "contains") - Name matching mode
- **Case Sensitive** (boolean, default: false) - Case sensitive name matching
- **Must Have Material** (boolean, default: false) - Only objects with materials
- **Must Have Geometry** (boolean, default: false) - Only objects with geometry

### Type Filter Options

- **All**: No type filtering (default)
- **Mesh**: THREE.Mesh objects
- **Light**: Any light objects
- **Camera**: Camera objects
- **Group**: Group objects
- **Scene**: Scene objects
- **Points**: Points objects
- **Line**: Line objects
- **Sprite**: Sprite objects
- **Bone**: Bone objects
- **SkinnedMesh**: Skinned mesh objects

### Name Match Options

- **contains**: Name contains the search string (default)
- **exact**: Name exactly matches the search string
- **startsWith**: Name starts with the search string
- **endsWith**: Name ends with the search string

### Usage Examples

**Example 1: Find All Meshes**

```
Input: Scene object
Properties:
  - Type: "Mesh"
  - Recursive: true
Output: Array of all mesh objects in the scene
```

**Example 2: Find Visible Lights Named "Spot"**

```
Input: Scene object
Name Input: "Spot"
Properties:
  - Type: "Light"
  - Only Visible: true
  - Name Match: "contains"
  - Recursive: true
Output: All visible lights with "Spot" in their name
```

**Example 3: Find All Meshes with Specific Name Pattern**

```
Input: Object or array
Name Input: "Wall"
Properties:
  - Type: "Mesh"
  - Name Match: "startsWith"
  - Must Have Material: true
  - Must Have Geometry: true
Output: Meshes whose names start with "Wall" that have both material and geometry
```

### Filtering Workflow

1. **If Recursive = true**: Collect all objects in hierarchy (like Traverse node)
2. **If Recursive = false**: Use only the input objects
3. Apply filters in order:
   - Visibility filter (if `Only Visible` enabled)
   - Type filter (if not "All")
   - Name filter (if name input provided)
   - Material filter (if `Must Have Material` enabled)
   - Geometry filter (if `Must Have Geometry` enabled)
4. Return filtered results

### Return Values

- **No matches**: `undefined`
- **One match**: Single Object3D
- **Multiple matches**: Array of Object3D

---

## Workflow Patterns

### Pattern 1: Export Specific Object Types

```
Scene → Traverse → Filter (Type: Mesh) → GLTF Exporter
```

Export only mesh objects from a scene.

### Pattern 2: Find and Modify Named Objects

```
Scene → Get Object By Name → Set Material
```

Find objects by name and change their materials.

### Pattern 3: Complex Filtering

```
Scene → Traverse → Filter (Custom criteria) → Process
```

Collect all objects, filter by multiple criteria, then process them.

### Pattern 4: Export Specific Named Objects

```
Scene → Get Object By Name → GLTF Exporter
```

Find specific objects and export them.

### Pattern 5: Hierarchy Analysis

```
Scene → Traverse → [Split into multiple filters] → Individual Processing
```

Traverse entire scene, then filter into different categories for separate processing.

---

## Technical Notes

### Array Handling

All nodes support both single objects and arrays of objects as inputs. Arrays are automatically flattened and processed.

### Performance Considerations

- **Traverse Node**: Fast - uses Three.js built-in traverse
- **Filter Objects**: Performance depends on filter criteria and object count
- **Get Object By Name**: Recursive search can be slow on large hierarchies
- **GLTF Exporter**: Export is async and may take time for complex scenes

### Memory Management

- All nodes properly handle Three.js objects without creating unnecessary copies
- GLTF Exporter clones objects when grouping multiple objects
- Filter and Traverse return references to existing objects, not copies

### Graph Integration

- GLTF Exporter triggers graph re-evaluation when export completes
- All nodes properly integrate with the evaluation system
- Nodes dispose of resources correctly when removed

---

## Implementation Details

### File Locations

- `/src/three/nodes/scene/utils/GLTFExporterNode.ts`
- `/src/three/nodes/scene/utils/GetObjectByNameNode.ts`
- `/src/three/nodes/scene/utils/TraverseNode.ts`
- `/src/three/nodes/scene/utils/FilterObjectsNode.ts`

### Registration

All nodes are registered in `/src/three/index.ts` under the "Scene Utils" category.

### References

- [Three.js GLTFExporter Documentation](https://threejs.org/docs/#examples/en/exporters/GLTFExporter)
- [Three.js Object3D.traverse Documentation](https://threejs.org/docs/#api/en/core/Object3D.traverse)
