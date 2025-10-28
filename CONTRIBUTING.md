# Contributing to three-nodes

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- A modern browser (Chrome, Firefox, Safari, Edge)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/three-nodes.git
cd three-nodes

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests in watch mode
npm test

# Build for production
npm run build
```

## Project Structure

```
three-nodes/
├── src/
│   ├── core/          # DAG engine (framework-agnostic)
│   ├── three/         # Three.js node implementations
│   ├── ui/            # Editor and viewport UI
│   └── types/         # Shared TypeScript types
├── index.html         # HTML entry point
└── README.md          # User documentation
```

## Code Style

We use ESLint and Prettier to maintain code quality:

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Style Guidelines

- Use TypeScript strict mode
- Prefer composition over inheritance
- Write descriptive variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Adding New Nodes

### Step 1: Create Node Class

Create a new file in `src/three/nodes/<category>/`:

```typescript
import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class MyCustomNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'MyCustomNode', 'My Custom Node');

    // Define inputs
    this.addInput({
      name: 'input',
      type: PortType.Number,
      defaultValue: 0,
    });

    // Define outputs
    this.addOutput({
      name: 'output',
      type: PortType.Number,
    });
  }

  evaluate(_context: EvaluationContext): void {
    const input = this.getInputValue<number>('input') ?? 0;
    const result = input * 2; // Your logic here
    this.setOutputValue('output', result);
  }

  // Optional: cleanup GPU resources
  dispose(): void {
    super.dispose();
    // Custom cleanup
  }
}
```

### Step 2: Register Node

Add to `src/three/index.ts`:

```typescript
import { MyCustomNode } from './nodes/custom/MyCustomNode';

export function createDefaultRegistry(): NodeRegistry {
  const registry = new NodeRegistry();

  // ... existing registrations

  registry.register(MyCustomNode, {
    type: 'MyCustomNode',
    category: 'Custom',
    label: 'My Custom Node',
    description: 'Does something custom',
  });

  return registry;
}
```

### Step 3: Test Your Node

Add tests in `src/three/nodes/<category>/__tests__/`:

```typescript
import { describe, it, expect } from 'vitest';
import { MyCustomNode } from '../MyCustomNode';

describe('MyCustomNode', () => {
  it('should process input correctly', () => {
    const node = new MyCustomNode('test');
    node.inputs.get('input')!.value = 5;
    node.evaluate({});
    expect(node.outputs.get('output')!.value).toBe(10);
  });
});
```

## Testing

We use Vitest for testing:

```bash
# Run all tests
npm test

# Run tests once
npm test -- --run

# Run specific test file
npm test -- Graph.test.ts
```

### Test Guidelines

- Write tests for all public APIs
- Test edge cases and error conditions
- Keep tests isolated and deterministic
- Use descriptive test names

## Pull Request Process

1. **Fork the repository** and create a feature branch

   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** following the style guidelines

3. **Add tests** for new functionality

4. **Run the test suite** and ensure all tests pass

   ```bash
   npm test -- --run
   npm run build
   ```

5. **Commit your changes** with clear messages

   ```bash
   git commit -m "Add feature: description"
   ```

6. **Push to your fork** and create a pull request

   ```bash
   git push origin feature/my-feature
   ```

7. **Describe your changes** in the PR description:
   - What problem does it solve?
   - How does it work?
   - Any breaking changes?
   - Screenshots (for UI changes)

## Areas for Contribution

### High Priority

- [ ] Additional geometry nodes (Plane, Cylinder, Torus, etc.)
- [ ] More material nodes (Basic, Physical, Shader)
- [ ] Transform nodes (Translate, Rotate, Scale)
- [ ] Group/hierarchy nodes
- [ ] Context menu for node creation
- [ ] Undo/redo system

### Medium Priority

- [ ] Mini-map for navigation
- [ ] Node search/filter
- [ ] Keyboard shortcuts panel
- [ ] Export to image/video
- [ ] Save/load graph files
- [ ] Example gallery

### Advanced Features

- [ ] GLSL shader nodes
- [ ] GLTF import/export
- [ ] Animation/timeline system
- [ ] Procedural noise nodes
- [ ] Post-processing effects
- [ ] Web Worker execution

## Documentation

When adding features, please update:

- **README.md**: User-facing documentation
- **ARCHITECTURE.md**: Technical design docs
- **JSDoc comments**: In-code documentation
- **Examples**: Add to `examples/` directory

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating duplicates

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Code of Conduct

Be respectful, inclusive, and professional. We want this to be a welcoming community for all contributors.
