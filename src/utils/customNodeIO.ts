import { CustomNodeDefinition, CustomNodeOperationResult } from '@/types/customNode';

/**
 * Export a custom node definition as a downloadable JSON file
 */
export function exportCustomNodeToFile(definition: CustomNodeDefinition): void {
  const json = JSON.stringify(definition, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${definition.name}.customnode.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Import a custom node definition from a file
 */
export function importCustomNodeFromFile(): Promise<CustomNodeDefinition> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.customnode.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        const text = await file.text();
        const definition = JSON.parse(text);

        // Validate the definition
        const validationResult = validateCustomNodeDefinition(definition);
        if (!validationResult.success) {
          reject(new Error(validationResult.error || 'Invalid custom node definition'));
          return;
        }

        resolve(definition);
      } catch (error) {
        reject(
          new Error(
            `Failed to import file: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    };

    input.click();
  });
}

/**
 * Validate a custom node definition structure
 */
export function validateCustomNodeDefinition(
  data: any
): CustomNodeOperationResult & { definition?: CustomNodeDefinition } {
  // Check for required fields
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Invalid data: not an object' };
  }

  const required = ['id', 'name', 'label', 'category', 'evaluateCode'];
  for (const field of required) {
    if (!(field in data)) {
      return { success: false, error: `Missing required field: ${field}` };
    }
  }

  // Validate field types
  if (typeof data.id !== 'string') {
    return { success: false, error: 'Field "id" must be a string' };
  }
  if (typeof data.name !== 'string') {
    return { success: false, error: 'Field "name" must be a string' };
  }
  if (typeof data.label !== 'string') {
    return { success: false, error: 'Field "label" must be a string' };
  }
  if (typeof data.category !== 'string') {
    return { success: false, error: 'Field "category" must be a string' };
  }
  if (typeof data.evaluateCode !== 'string') {
    return { success: false, error: 'Field "evaluateCode" must be a string' };
  }

  // Validate arrays
  if (data.inputs && !Array.isArray(data.inputs)) {
    return { success: false, error: 'Field "inputs" must be an array' };
  }
  if (data.outputs && !Array.isArray(data.outputs)) {
    return { success: false, error: 'Field "outputs" must be an array' };
  }
  if (data.properties && !Array.isArray(data.properties)) {
    return { success: false, error: 'Field "properties" must be an array' };
  }

  // Validate port definitions
  if (data.inputs) {
    for (let i = 0; i < data.inputs.length; i++) {
      const input = data.inputs[i];
      if (!input.name || typeof input.name !== 'string') {
        return { success: false, error: `Input port ${i}: missing or invalid "name"` };
      }
      if (!input.type || typeof input.type !== 'string') {
        return { success: false, error: `Input port ${i}: missing or invalid "type"` };
      }
    }
  }

  if (data.outputs) {
    for (let i = 0; i < data.outputs.length; i++) {
      const output = data.outputs[i];
      if (!output.name || typeof output.name !== 'string') {
        return { success: false, error: `Output port ${i}: missing or invalid "name"` };
      }
      if (!output.type || typeof output.type !== 'string') {
        return { success: false, error: `Output port ${i}: missing or invalid "type"` };
      }
    }
  }

  // Validate properties
  if (data.properties) {
    for (let i = 0; i < data.properties.length; i++) {
      const prop = data.properties[i];
      if (!prop.name || typeof prop.name !== 'string') {
        return { success: false, error: `Property ${i}: missing or invalid "name"` };
      }
      if (!prop.type || typeof prop.type !== 'string') {
        return { success: false, error: `Property ${i}: missing or invalid "type"` };
      }
    }
  }

  // Ensure arrays exist
  data.inputs = data.inputs || [];
  data.outputs = data.outputs || [];
  data.properties = data.properties || [];

  return {
    success: true,
    definition: data as CustomNodeDefinition,
  };
}

/**
 * Create a default custom node definition template
 */
export function createDefaultDefinition(): Partial<CustomNodeDefinition> {
  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: '',
    label: '',
    category: 'Custom',
    icon: '✨',
    description: '',
    inputs: [],
    outputs: [],
    properties: [],
    evaluateCode: `// Write your node logic here
// Available methods:
// - this.getInputValue('name') - get input value
// - this.setOutputValue('name', value) - set output value
// - this.getProperty('name') - get property value

// Example:
// const input = this.getInputValue('input');
// const result = input * 2;
// this.setOutputValue('output', result);`,
    version: '1.0.0',
  };
}

