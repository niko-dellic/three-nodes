# Type Safety Migration Plan

## Overview

Add generic type parameters `<TInputs, TOutputs>` to all node classes for compile-time port name validation.

**Pattern:**

```typescript
export class MyNode extends BaseThreeNode<
  'input1' | 'input2',  // All input port names
  'output1'              // All output port names
> {
  constructor(id: string) {
    super(id, 'MyNode', 'My Node');
    this.addInput({ name: 'input1', ... });
    this.addInput({ name: 'input2', ... });
    this.addOutput({ name: 'output1', ... });
  }
}
```

---

## Phase 1: Data/Input Nodes (10 nodes)

**Priority: HIGH** - Most commonly used in graphs

- [x] `NumberSliderNode` - `<never, 'value'>`
- [ ] `NumberNode` - `<'value', 'result'>`
- [ ] `ColorPickerNode` - `<never, 'color'>`
- [ ] `ColorNode` - `<'r' | 'g' | 'b', 'color'>`
- [ ] `Vector3Node` - `<'x' | 'y' | 'z', 'vector'>`
- [ ] `StringInputNode` - `<never, 'text'>`
- [ ] `BooleanInputNode` - `<never, 'value'>`
- [ ] `PointInputNode` - `<never, 'point'>`
- [ ] `ListInputNode` - `<never, 'value'>`
- [ ] `MultilineTextInputNode` - `<never, 'text'>`

---

## Phase 2: Geometry Nodes (3 nodes)

**Priority: HIGH** - Core to 3D scenes

- [x] `BoxGeometryNode` - `<'width' | 'height' | 'depth', 'geometry'>`
- [ ] `SphereGeometryNode` - `<'radius' | 'widthSegments' | 'heightSegments', 'geometry'>`

---

## Phase 3: Scene & Object Nodes (7 nodes)

**Priority: HIGH** - Essential for scene graph

- [x] `CreateMeshNode` - `<'geometry' | 'material', 'mesh'>`
- [ ] `SceneNode` - `<never, 'scene'>`
- [ ] `SceneCompilerNode` - `<'scene' | 'objects' | 'camera', 'compiled'>`
- [ ] `SceneOutputNode` - `<'compiled' | 'update', never>`
- [ ] `AddToSceneNode` - `<'scene' | 'object', 'scene'>`
- [ ] `Object3DNode` - `<'position' | 'rotation' | 'scale' | 'children', 'object'>`

---

## Phase 4: Light Nodes (3 nodes)

**Priority: HIGH** - Common in scenes

- [x] `AmbientLightNode` - `<'color' | 'intensity', 'light'>`
- [ ] `DirectionalLightNode` - `<'color' | 'intensity' | 'position', 'light'>`
- [ ] `PointLightNode` - `<'color' | 'intensity' | 'position' | 'distance' | 'decay', 'light'>`
- [ ] `SpotLightNode` - `<'color' | 'intensity' | 'position' | 'target' | 'distance' | 'angle' | 'penumbra' | 'decay', 'light'>`

---

## Phase 5: Material Nodes (8 nodes)

**Priority: MEDIUM** - Many inputs/properties

- [ ] `MeshStandardMaterialNode` - `<'color' | 'roughness' | 'metalness' | 'map' | 'normalMap' | 'emissive', 'material'>`
- [ ] `MeshBasicMaterialNode` - `<'color' | 'map' | 'alphaMap', 'material'>`
- [ ] `MeshToonMaterialNode` - `<'color' | 'gradientMap' | 'map', 'material'>`
- [ ] `MeshMatcapMaterialNode` - `<'matcap' | 'color' | 'map', 'material'>`
- [ ] `PointsMaterialNode` - `<'color' | 'size' | 'map', 'material'>`
- [ ] `LineBasicMaterialNode` - `<'color', 'material'>`
- [ ] `LineDashedMaterialNode` - `<'color' | 'dashSize' | 'gapSize', 'material'>`
- [ ] `SpriteMaterialNode` - `<'color' | 'map' | 'rotation', 'material'>`

---

## Phase 6: Camera Nodes (3 nodes)

**Priority: MEDIUM**

- [ ] `PerspectiveCameraNode` - `<'position' | 'target' | 'fov' | 'aspect' | 'near' | 'far', 'camera'>`
- [ ] `CameraComponentNode` - `<'fov' | 'aspect' | 'near' | 'far', 'camera'>`
- [ ] `ActiveCameraNode` - `<'camera' | 'update' | 'position' | 'target', never>`

---

## Phase 7: Transform Nodes (4 nodes)

**Priority: MEDIUM**

- [ ] `PositionNode` - `<'object' | 'x' | 'y' | 'z', 'object'>`
- [ ] `RotationNode` - `<'object' | 'x' | 'y' | 'z', 'object'>`
- [ ] `ScaleNode` - `<'object' | 'x' | 'y' | 'z', 'object'>`
- [ ] `Matrix4Node` - `<'object' | 'matrix', 'object'>`
- [ ] `MoveToNode` - `<'object' | 'offset', 'object'>`

---

## Phase 8: Array Manipulation Nodes (4 nodes)

**Priority: MEDIUM**

- [ ] `MergeNode` - `<string, 'array'>` (dynamic inputs)
- [ ] `SplitNode` - `<'array', string>` (dynamic outputs)
- [ ] `IndexNode` - `<'array' | 'index', 'value'>`
- [ ] `LengthNode` - `<'array', 'length'>`

---

## Phase 9: Math Constant Nodes (2 nodes)

**Priority: LOW** - Simple constants

- [ ] `DEG2RADNode` - `<never, 'value'>`
- [ ] `RAD2DEGNode` - `<never, 'value'>`

---

## Phase 10: Math Function Nodes (13 nodes)

**Priority: LOW** - Simple input/output

- [ ] `ClampNode` - `<'value' | 'min' | 'max', 'result'>`
- [ ] `LerpNode` - `<'a' | 'b' | 't', 'result'>`
- [ ] `InverseLerpNode` - `<'a' | 'b' | 'x', 'result'>`
- [ ] `DampNode` - `<'current' | 'target' | 'lambda' | 'dt', 'result'>`
- [ ] `MapLinearNode` - `<'x' | 'a1' | 'a2' | 'b1' | 'b2', 'result'>`
- [ ] `SmoothstepNode` - `<'x' | 'min' | 'max', 'result'>`
- [ ] `SmootherStepNode` - `<'x' | 'min' | 'max', 'result'>`
- [ ] `PingPongNode` - `<'x' | 'length', 'result'>`
- [ ] `EuclideanModuloNode` - `<'n' | 'm', 'result'>`
- [ ] `RandomNode` - `<'low' | 'high', 'result'>`
- [ ] `RandIntNode` - `<'low' | 'high', 'result'>`
- [ ] `IsPowerOfTwoNode` - `<'value', 'result'>`
- [ ] `CeilPowerOfTwoNode` - `<'value', 'result'>`
- [ ] `FloorPowerOfTwoNode` - `<'value', 'result'>`

---

## Phase 11: Math Operation Nodes (12 nodes)

**Priority: LOW** - Simple binary/unary operations

- [ ] `AddNode` - `<'a' | 'b', 'result'>`
- [ ] `SubtractNode` - `<'a' | 'b', 'result'>`
- [ ] `MultiplyNode` - `<'a' | 'b', 'result'>`
- [ ] `DivideNode` - `<'a' | 'b', 'result'>`
- [ ] `PowerNode` - `<'base' | 'exponent', 'result'>`
- [ ] `SqrtNode` - `<'value', 'result'>`
- [ ] `AbsNode` - `<'value', 'result'>`
- [ ] `MinNode` - `<'a' | 'b', 'result'>`
- [ ] `MaxNode` - `<'a' | 'b', 'result'>`
- [ ] `DistanceNode` - `<'a' | 'b', 'result'>`
- [ ] `DotProductNode` - `<'a' | 'b', 'result'>`
- [ ] `CrossProductNode` - `<'a' | 'b', 'result'>`

---

## Phase 12: Geometry Utility Nodes (9 nodes)

**Priority: LOW** - Specialized operations

- [ ] `MergeGeometriesNode` - `<'geometries', 'geometry'>`
- [ ] `MergeVerticesNode` - `<'geometry', 'geometry'>`
- [ ] `InterleaveAttributesNode` - `<'attributes', 'interleavedBuffer'>`
- [ ] `ComputeMikkTSpaceNode` - `<'geometry', 'geometry'>`
- [ ] `ComputeMorphedAttributesNode` - `<'object', 'attributes'>`
- [ ] `DeepCloneAttributeNode` - `<'attribute', 'attribute'>`
- [ ] `EstimateBytesUsedNode` - `<'geometry', 'bytes'>`
- [ ] `ToTrianglesDrawModeNode` - `<'geometry', 'geometry'>`
- [ ] `ConvertToIndexedNode` - `<'geometry', 'geometry'>`

---

## Phase 13: Animation Nodes (2 nodes)

**Priority: LOW** - Specialized feature

- [ ] `FrameNode` - `<'enabled' | 'updatable', 'deltaTime' | 'elapsedTime'>`
- [ ] `UpdatableObjectNode` - `<'object', 'updatable'>`

---

## Phase 14: Loader Nodes (2 nodes)

**Priority: LOW** - Specialized feature

- [ ] `GLTFLoaderNode` - `<never, 'scene' | 'animations' | 'cameras' | 'asset' | 'loaded'>`
- [ ] `Rhino3dmLoaderNode` - `<never, 'scene' | 'loaded'>`

---

## Phase 15: UI/Monitor Nodes (3 nodes)

**Priority: LOW** - Display only

- [ ] `ButtonNode` - `<never, 'trigger'>`
- [ ] `NumberMonitorNode` - `<'value', never>`
- [ ] `TextMonitorNode` - `<'text', never>`

---

## Implementation Strategy

### Batch Processing

Process **5-10 nodes per session** to avoid fatigue and maintain quality.

### Testing After Each Phase

1. Run `npm run build` to check for type errors
2. Test nodes in main.ts using `.input()` and `.output()` methods
3. Verify autocomplete works in IDE
4. Try intentionally wrong port names to confirm errors

### Special Cases

**Dynamic Ports (MergeNode, SplitNode)**

```typescript
// Use string for dynamic inputs/outputs
export class MergeNode extends BaseThreeNode<string, 'array'> {
  // Ports added dynamically at runtime
}
```

**No Inputs (Constants, Monitors)**

```typescript
// Use 'never' for nodes with no inputs
export class DEG2RADNode extends BaseThreeNode<never, 'value'>
```

**No Outputs (Monitor nodes)**

```typescript
// Use 'never' for nodes with no outputs
export class NumberMonitorNode extends TweakpaneNode<'value', never>
```

---

## Progress Tracking

**Total Nodes:** ~85
**Completed:** 4 (5%)

- [x] Node base class
- [x] BaseThreeNode
- [x] TweakpaneNode
- [x] NumberSliderNode
- [x] AmbientLightNode
- [x] BoxGeometryNode
- [x] CreateMeshNode

**Target:** Complete all phases incrementally

---

## Benefits After Completion

✅ **Compile-time safety** - Wrong port names caught before runtime  
✅ **IDE autocomplete** - Suggestions only show valid port names  
✅ **Refactoring safety** - Renaming ports shows all affected code  
✅ **Documentation** - Port names visible in type signatures  
✅ **No ! assertions** - Clean code without null checks

---

## Notes

- Start with **Phase 1-4** (highest priority, most commonly used)
- Phases 5-15 can be done incrementally over time
- Each phase should take 15-30 minutes
- Test after each phase to catch issues early
- Update this checklist as you progress
