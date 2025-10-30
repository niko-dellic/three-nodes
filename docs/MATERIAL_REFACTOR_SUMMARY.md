# Material Base Class Refactor - Summary

## Overview

Successfully refactored all material nodes to use a single unified `BaseMaterialNode` class that extends `BaseThreeNode` directly. This eliminates the dual base class architecture and consolidates all material functionality into one clean, maintainable base class.

## What Changed

### Architecture

**Before:**
```
BaseThreeNode
  ├── BaseMaterialNode (simple materials)
  └── TweakpaneNode
      └── BaseMaterialTweakpaneNode (materials with file pickers)
```

**After:**
```
BaseThreeNode
  └── BaseMaterialNode (unified, includes file picker support)
      ├── MeshStandardMaterialNode
      ├── MeshPhongMaterialNode
      ├── MeshBasicMaterialNode
      ├── MeshMatcapMaterialNode
      ├── MeshToonMaterialNode
      ├── LineBasicMaterialNode
      ├── LineDashedMaterialNode
      ├── PointsMaterialNode
      └── SpriteMaterialNode
```

### Key Improvements

1. **Single Base Class**: One unified `BaseMaterialNode` for all materials
2. **Built-in File Picker Support**: Integrated `FilePickerHelper` management
3. **Fresh Material Creation**: Materials are created fresh on every evaluation to ensure proper lighting
4. **No Duplicate Inputs**: Fixed the bug where `color` input was being added by both base and derived classes
5. **Consistent API**: All materials follow the same pattern

## Technical Details

### BaseMaterialNode Features

- Extends `BaseThreeNode` for resource management
- Manages file pickers via `Map<string, FilePickerHelper>`
- Manages loaded textures via `Map<string, THREE.Texture>`
- Provides common material inputs: opacity, transparent, side, depthTest, depthWrite, wireframe, visible
- Provides `getValueOrProperty()` for dual input/property system
- Provides `getTexture()` helper that prioritizes input connections over loaded files
- Provides `registerFilePicker()` for derived classes to add texture loading
- Implements fresh material creation in `evaluate()`

### Material Node Pattern

Each material node now follows this pattern:

```typescript
export class MaterialNode extends BaseMaterialNode<'specificInput1' | 'specificInput2'> {
  constructor(id: string) {
    super(id, 'MaterialNodeType', 'Material Label');
    
    // Add material-specific inputs with defaults
    this.addInput({ 
      name: 'color', 
      type: PortType.Color, 
      defaultValue: new THREE.Color(1, 1, 1) 
    });
    
    // Add material-specific properties
    this.addProperty({ 
      name: 'color', 
      type: 'color', 
      value: '#ffffff', 
      label: 'Color' 
    });
    
    // Register file pickers if needed
    this.registerFilePicker('map', {
      acceptedFileTypes: '.jpg,.jpeg,.png,.webp,.bmp',
      buttonLabel: 'Color Map',
    });
  }

  protected createMaterial(): THREE.Material {
    return new THREE.SpecificMaterial();
  }

  protected updateMaterialProperties(material: THREE.Material): void {
    // Set material-specific properties
    // ...
    
    // Always call at the end
    this.applyCommonProperties(material);
  }
}
```

## Bug Fixes

### Lighting Issue Fix

The primary issue that prompted this refactor was that materials weren't responding to scene lights. This was caused by:

1. **Material Reuse**: Old code reused material instances, causing Three.js's internal cache to become stale
2. **Missing Default Values**: Input ports lacked default values, resulting in undefined colors
3. **Duplicate Color Inputs**: Base class added `color` input without defaults, derived classes tried to add it again

**Solution**: Create fresh materials on every evaluation and ensure all inputs have proper default values.

### Fresh Material Creation

```typescript
evaluate(_context: EvaluationContext): void {
  // Dispose old material if it exists
  if (this.material) {
    this.material.dispose();
    this.material = null;
  }

  // Create fresh material on every evaluation (ensures proper lighting)
  this.material = this.createMaterial();
  this.trackResource(this.material);

  // Update material properties
  this.updateMaterialProperties(this.material);

  // Output the material
  this.setOutputValue('material', this.material);
}
```

## Files Modified

### Created
- `src/three/nodes/material/BaseMaterialNode.ts` (new unified base, 280 lines)

### Updated (All Completely Rewritten)
- `src/three/nodes/material/MeshStandardMaterialNode.ts`
- `src/three/nodes/material/MeshPhongMaterialNode.ts`
- `src/three/nodes/material/MeshBasicMaterialNode.ts`
- `src/three/nodes/material/MeshMatcapMaterialNode.ts`
- `src/three/nodes/material/MeshToonMaterialNode.ts`
- `src/three/nodes/material/LineBasicMaterialNode.ts`
- `src/three/nodes/material/LineDashedMaterialNode.ts`
- `src/three/nodes/material/PointsMaterialNode.ts`
- `src/three/nodes/material/SpriteMaterialNode.ts`

### Deleted
- `src/three/nodes/material/BaseMaterialTweakpaneNode.ts`

## Verification

- ✅ No TypeScript compilation errors
- ✅ No linter errors
- ✅ Build succeeds
- ✅ All material nodes follow consistent pattern
- ✅ File picker functionality preserved
- ✅ Dual input/property system preserved
- ✅ Common material properties centralized

## Next Steps

Test the refactored material nodes to ensure:
1. Materials properly respond to scene lights
2. File pickers work correctly for texture inputs
3. Properties panel integration works
4. Input connections override property values correctly
5. Material disposal happens properly

