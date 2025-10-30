# Custom Node Creator - Quick Start Guide

## 🎯 Quick Access

To create a custom node:
1. Right-click anywhere in the graph editor
2. Navigate to **Advanced** → **✨ Custom Node**
3. The Custom Node Creator panel will slide in from the right

## 📝 Creating Your First Custom Node

### Example: Multiplier Node

Let's create a simple node that multiplies a number by a factor:

#### Step 1: Define the Node
```
Node Name: MultiplierNode
Display Label: Multiplier
Category: Math
Icon: ✖️
Description: Multiplies an input value by a configurable factor
```

#### Step 2: Add Ports

**Inputs:**
- Name: `value`, Type: `number`
- Name: `multiplier`, Type: `number`

**Outputs:**
- Name: `result`, Type: `number`

#### Step 3: Write Code

```javascript
// Get input values
const value = this.getInputValue('value') || 0;
const multiplier = this.getInputValue('multiplier') || 1;

// Calculate result
const result = value * multiplier;

// Set output
this.setOutputValue('result', result);
```

#### Step 4: Save
Click **✅ Save & Register**

Your node is now available in the context menu under **Math → Multiplier**!

## 🤖 Using AI Assistant

### Setup API Keys

1. In the Custom Node Creator, scroll to the **🤖 AI Assistant** section
2. Enter your OpenAI API key or Anthropic API key
3. Click **Save** next to each key

### Generate Code with AI

1. Fill in the node description
2. Add your input and output ports
3. Click **✨ Generate Code with AI**
4. Review and edit the generated code
5. Save when ready

**Example AI Prompt:**
```
Description: Creates a grid of spheres at regular intervals
Inputs: 
  - count (number): Number of spheres per side
  - spacing (number): Distance between spheres
Outputs:
  - objects (array): Array of Three.js sphere meshes
```

The AI will generate appropriate code including Three.js mesh creation!

## 💾 Export & Share Nodes

### Export a Node
1. Create your custom node
2. Click **💾 Export**
3. A `.customnode.json` file will download

### Import a Node
1. Click **📁 Import** in the Custom Node Creator
2. Select a `.customnode.json` file
3. The node is instantly available!

## 🔧 Available Node Methods

Inside your evaluate function, you have access to:

### Input/Output
```javascript
// Get input value (single connection)
const value = this.getInputValue('inputName');

// Get all input values (multiple connections)
const values = this.getInputValues('inputName');

// Set output value
this.setOutputValue('outputName', result);
```

### Properties
```javascript
// Get property value
const multiplier = this.getProperty('multiplier');
```

### Context
```javascript
// Access the graph (if needed)
const graph = context.graph;
```

## 📚 Examples

### Example 1: Random Number Generator

```javascript
// Properties: min (number), max (number)
const min = this.getProperty('min') || 0;
const max = this.getProperty('max') || 1;
const random = Math.random() * (max - min) + min;
this.setOutputValue('value', random);
```

### Example 2: String Formatter

```javascript
// Inputs: text (string), prefix (string), suffix (string)
const text = this.getInputValue('text') || '';
const prefix = this.getInputValue('prefix') || '';
const suffix = this.getInputValue('suffix') || '';
const formatted = prefix + text + suffix;
this.setOutputValue('result', formatted);
```

### Example 3: Vector3 Average

```javascript
// Inputs: vectors (array of Vector3)
const vectors = this.getInputValues('vectors');
if (vectors.length === 0) {
  this.setOutputValue('average', null);
  return;
}

const sum = vectors.reduce((acc, v) => {
  return {
    x: acc.x + v.x,
    y: acc.y + v.y,
    z: acc.z + v.z
  };
}, { x: 0, y: 0, z: 0 });

const avg = new THREE.Vector3(
  sum.x / vectors.length,
  sum.y / vectors.length,
  sum.z / vectors.length
);

this.setOutputValue('average', avg);
```

### Example 4: Conditional Switch

```javascript
// Inputs: condition (boolean), ifTrue (any), ifFalse (any)
const condition = this.getInputValue('condition');
const ifTrue = this.getInputValue('ifTrue');
const ifFalse = this.getInputValue('ifFalse');

const result = condition ? ifTrue : ifFalse;
this.setOutputValue('result', result);
```

## 🎨 Available Port Types

- `number` - Numeric values
- `boolean` - True/false
- `string` - Text
- `vector3` - Three.js Vector3
- `color` - Three.js Color
- `matrix4` - Three.js Matrix4
- `texture` - Three.js Texture
- `geometry` - Three.js BufferGeometry
- `material` - Three.js Material
- `object3d` - Three.js Object3D (meshes, lights, etc.)
- `scene` - Three.js Scene
- `camera` - Three.js Camera
- `light` - Three.js Light
- `point2d` - 2D point {x, y}
- `any` - Any type

## 🐛 Debugging Tips

### Console Logging
```javascript
console.log('Input value:', this.getInputValue('input'));
console.log('All inputs:', this.getInputValues('input'));
```

### Error Handling
```javascript
try {
  const value = this.getInputValue('value');
  if (!value) {
    console.warn('No value provided');
    this.setOutputValue('result', null);
    return;
  }
  // ... rest of code
} catch (error) {
  console.error('Error in custom node:', error);
  this.setOutputValue('result', null);
}
```

### Type Checking
```javascript
const value = this.getInputValue('value');
if (typeof value !== 'number') {
  console.error('Expected number, got:', typeof value);
  this.setOutputValue('result', 0);
  return;
}
```

## 🔒 Persistence

- Custom nodes are automatically saved to **localStorage**
- They persist across browser sessions
- They load automatically on app startup
- Export to files for backup or sharing

## 💡 Pro Tips

1. **Start Simple**: Create basic nodes first, then add complexity
2. **Use AI**: Let AI generate boilerplate code, then customize
3. **Test Incrementally**: Save and test after each change
4. **Handle Nulls**: Always check for undefined/null inputs
5. **Document**: Use comments in your code for future reference
6. **Share**: Export useful nodes and share with the community
7. **Properties**: Use properties for values that don't change often
8. **Type Safety**: While TypeScript types are optional, they help catch errors

## 🚀 Advanced: Using Three.js

Your custom nodes have full access to Three.js:

```javascript
// Create a custom mesh
const geometry = new THREE.SphereGeometry(1, 32, 32);
const material = new THREE.MeshStandardMaterial({ 
  color: 0x00ff00 
});
const mesh = new THREE.Mesh(geometry, material);

// Track resources for cleanup
this.trackResource(mesh);
this.trackResource(geometry);
this.trackResource(material);

this.setOutputValue('mesh', mesh);
```

## 📖 Need Help?

- Check the main implementation guide: `CUSTOM_NODE_CREATOR.md`
- Look at existing node implementations in `src/three/nodes/`
- Use the AI assistant for code generation
- The code editor provides syntax highlighting to catch basic errors

## 🎉 Have Fun!

Custom nodes unlock unlimited possibilities. Create utility nodes, data processors, Three.js helpers, or entirely new workflows. The only limit is your imagination!

