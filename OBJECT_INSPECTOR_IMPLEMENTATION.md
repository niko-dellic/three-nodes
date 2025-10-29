# Object Inspector Implementation

## Overview

The custom `ObjectInspector` class provides a Chrome DevTools-style object viewer for the Properties Panel. It handles nested objects, circular references, and lazy rendering just like the Chrome console.

## Key Features

### 1. **Lazy Rendering** (Chrome DevTools Pattern)

- Child nodes are **only created when you click to expand** the parent
- Initial load only renders the collapsed preview
- Prevents performance issues with deeply nested objects
- Matches Chrome's behavior exactly

```typescript
// Children only rendered on first expand
if (!isExpanded && !isRendered) {
  renderChildren(); // <-- Lazy execution
}
```

### 2. **Circular Reference Detection**

- Uses `WeakSet` to track visited objects
- Shows `[Circular]` instead of infinite recursion
- Automatically resets tracking for each new inspection
- Prevents memory leaks (WeakSet allows garbage collection)

```typescript
if (this.circularRefs.has(value)) {
  return this.createCircularReference(); // Shows "[Circular]"
}
this.circularRefs.add(value);
```

### 3. **No Depth Limit**

- Explore as deep as you need, just like Chrome DevTools
- No maxDepth parameter or checks
- Circular reference detection prevents infinite loops
- Lazy rendering means no performance penalty for deep objects

### 4. **Interactive Expansion**

- Click any object/array to expand/collapse
- Arrow indicators: `▶` (collapsed) / `▼` (expanded)
- Smooth toggle behavior
- State persists while panel is open

## Configuration

```typescript
new ObjectInspector({
  expandLevel: 0, // Auto-expand first N levels (0 = all collapsed)
  maxStringLength: 100, // Truncate long strings
  maxArrayPreview: 5, // Number of items shown in array preview
});
```

## How Nested Objects Work

### Example Structure

```javascript
const complexObject = {
  name: 'root',
  child: {
    name: 'level 1',
    child: {
      name: 'level 2',
      array: [1, 2, { nested: true }],
    },
  },
};
```

### Rendering Process

1. **Initial Render**: Only shows collapsed preview

   ```
   ▶ Object {name: "root", child: Object, ...}
   ```

2. **First Click**: Renders immediate children (lazy)

   ```
   ▼ Object {name: "root", child: Object, ...}
     name: "root"
     ▶ child: Object {name: "level 1", child: Object, ...}
   ```

3. **Second Click**: Renders next level (lazy)

   ```
   ▼ Object {name: "root", child: Object, ...}
     name: "root"
     ▼ child: Object {name: "level 1", child: Object, ...}
       name: "level 1"
       ▶ child: Object {name: "level 2", array: Array(3), ...}
   ```

4. **Continue**: Each expansion renders only that level
   - Performance stays constant
   - Memory usage scales with visible nodes only
   - Can explore arbitrarily deep structures

## Circular Reference Handling

### Example with Circular Ref

```javascript
const obj = { name: 'parent' };
obj.self = obj; // Circular reference
```

### Display

```
▼ Object {name: "parent", self: Object}
  name: "parent"
  self: [Circular]
```

The `[Circular]` indicator prevents infinite loops and clearly shows the circular relationship.

## Three.js Special Handling

The inspector recognizes Three.js objects and shows relevant properties:

- **Vector3**: Shows x, y, z
- **Color**: Shows r, g, b + hex preview
- **Mesh/Object3D**: Shows type, name, position, rotation, scale
- **Material**: Shows type, name, color, transparency

### Example

```
▼ Vector3(1.00, 2.50, 3.75)
  x: 1
  y: 2.5
  z: 3.75
```

## Performance Characteristics

| Scenario                 | Performance                         |
| ------------------------ | ----------------------------------- |
| Initial render           | O(1) - just preview                 |
| Expand one level         | O(n) - n = properties at that level |
| Deep nesting             | O(visible nodes only)               |
| Circular refs            | O(1) - WeakSet lookup               |
| Re-expand collapsed node | O(1) - already rendered             |

## Comparison to Chrome DevTools

| Feature         | Chrome DevTools | Our Inspector         |
| --------------- | --------------- | --------------------- |
| Lazy rendering  | ✅ Yes          | ✅ Yes                |
| Circular refs   | ✅ Handles      | ✅ Handles            |
| Max depth       | ✅ Yes          | ✅ Yes (configurable) |
| Type colors     | ✅ Yes          | ✅ Yes                |
| Getters/setters | ✅ Shows        | ❌ Not yet            |
| Prototype chain | ✅ Shows        | ❌ Not yet            |
| Search          | ✅ Yes          | ❌ Not yet            |

## Usage in Properties Panel

The inspector is used in the Data Flow section to display input/output values:

```typescript
const inspector = new ObjectInspector({
  expandLevel: 0, // Collapsed by default
  // No maxDepth parameter - explore infinitely deep with lazy rendering
});

const element = inspector.inspect(portValue);
container.appendChild(element);
```

## Future Enhancements (Optional)

1. **Getters/Setters**: Show computed properties
2. **Prototype Chain**: Show `__proto__` chain
3. **Search/Filter**: Find properties by name
4. **Copy Value**: Right-click to copy as JSON
5. **Expand All/Collapse All**: Bulk operations
6. **Custom Formatters**: User-defined type handlers

## Why Not Use a Library?

We chose a custom implementation because:

1. **Lightweight**: No dependencies, ~400 lines of code
2. **Integrated**: Matches our existing UI perfectly
3. **Controlled**: Can customize for Three.js objects
4. **Read-only**: Don't need editing features
5. **Performance**: Optimized for our specific use case

If editing becomes important later, we could switch to `vanilla-jsoneditor`, but for viewing, the custom solution is ideal.

## Why No Depth Limit is Safe

With our architecture, having no depth limit is completely safe:

1. **Lazy Rendering**: Each level only renders when you click to expand it
   - At depth 50, only ~50 DOM nodes exist (not thousands)
   - User must manually click 50 times to reach that depth
2. **Circular Reference Detection**: Prevents infinite loops
   - `WeakSet` tracks all visited objects
   - Shows `[Circular]` instead of recursing
3. **Memory Efficiency**: Memory grows with visible nodes, not object depth
   - Collapse a branch → memory freed
   - Only expanded paths consume resources
4. **User Control**: Depth is determined by user clicks, not automatic traversal
   - Want depth 100? Click 100 times
   - Each click is intentional and controlled

This matches Chrome DevTools behavior exactly - no arbitrary depth limits, just smart rendering and circular reference detection.
