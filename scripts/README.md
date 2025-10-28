# Scripts

## `add_type_safety.py`

Automatically adds TypeScript generic type parameters to all Node classes for compile-time port name validation.

### Usage

```bash
npm run add-types
```

### What it does

1. Scans all `.ts` files in `src/three/nodes/`
2. Parses each file to extract input/output port names from `addInput()`/`addOutput()` calls
3. Injects generic type parameters into the class declaration
4. Handles special cases:
   - No inputs → uses `never` type
   - Dynamic ports (MergeNode, SplitNode) → uses `string` type
   - Material nodes → inherits output from `BaseMaterialNode`
   - Loader nodes → inherits base outputs from `BaseFileLoaderNode`

### Example

**Before:**

```typescript
export class BoxGeometryNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'BoxGeometryNode', 'Box Geometry');
    this.addInput({ name: 'width', ... });
    this.addInput({ name: 'height', ... });
    this.addInput({ name: 'depth', ... });
    this.addOutput({ name: 'geometry', ... });
  }
}
```

**After:**

```typescript
export class BoxGeometryNode extends BaseThreeNode<
  'width' | 'height' | 'depth',
  'geometry'
> {
  constructor(id: string) {
    super(id, 'BoxGeometryNode', 'Box Geometry');
    this.addInput({ name: 'width', ... });
    this.addInput({ name: 'height', ... });
    this.addInput({ name: 'depth', ... });
    this.addOutput({ name: 'geometry', ... });
  }
}
```

### Benefits

- ✅ Compile-time type safety for `.input()` and `.output()` methods
- ✅ IDE autocomplete for port names
- ✅ Catches typos before runtime
- ✅ Self-documenting code

### Notes

- Script is **idempotent** - safe to run multiple times
- Skips files that already have type parameters
- Skips base classes (`Node`, `BaseThreeNode`, `TweakpaneNode`, `BaseMaterialNode`, `BaseFileLoaderNode`)
- Run after creating new node classes
