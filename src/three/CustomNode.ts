import { BaseThreeNode } from './BaseThreeNode';
import { EvaluationContext } from '@/core/types';
import { CustomNodeDefinition } from '@/types/customNode';
import { exportCustomNodeToFile, importCustomNodeFromFile } from '@/utils/customNodeIO';

/**
 * Custom node that extends BaseThreeNode with editing capabilities
 */
export class CustomNode extends BaseThreeNode {
  private definition: Partial<CustomNodeDefinition> = {};
  private customNodeManager?: any;
  private isEditing: boolean = false;
  private autosaveTimer?: number;
  private nameUpdateTimer?: number;

  constructor(id: string, definition?: Partial<CustomNodeDefinition>) {
    super(id, definition?.name || 'CustomNode', definition?.label || 'Custom Node');

    if (definition) {
      this.definition = definition;
      this.initializeFromDefinition(definition);
    }
  }

  /**
   * Initialize the node from a custom node definition
   */
  private initializeFromDefinition(definition: Partial<CustomNodeDefinition>): void {
    // Add inputs
    if (definition.inputs) {
      for (const input of definition.inputs) {
        this.addInput({
          name: input.name,
          type: input.type,
          defaultValue: input.defaultValue,
        });
      }
    }

    // Add outputs
    if (definition.outputs) {
      for (const output of definition.outputs) {
        this.addOutput({
          name: output.name,
          type: output.type,
        });
      }
    }

    // Add properties
    if (definition.properties) {
      for (const prop of definition.properties) {
        this.addProperty({
          name: prop.name,
          type: prop.type,
          value: prop.value,
          label: prop.label,
          min: prop.min,
          max: prop.max,
          step: prop.step,
          options: prop.options,
        });
      }
    }

    // Set evaluate function if provided
    if (definition.evaluateCode) {
      try {
        const evaluateFunc = new Function(
          'context',
          `"use strict";\n${definition.evaluateCode}`
        ) as any;
        (this as any).evaluate = evaluateFunc;
      } catch (error) {
        console.error('Failed to compile evaluate function:', error);
      }
    }
  }

  /**
   * Set the custom node manager for this node
   */
  setCustomNodeManager(manager: any): void {
    this.customNodeManager = manager;
  }

  /**
   * Start editing mode
   */
  startEditing(): void {
    this.isEditing = true;
  }

  /**
   * Stop editing mode
   */
  stopEditing(): void {
    this.isEditing = false;
  }

  /**
   * Check if this node is in editing mode
   */
  isInEditingMode(): boolean {
    return this.isEditing;
  }

  /**
   * Get the current custom node definition
   */
  getDefinition(): Partial<CustomNodeDefinition> {
    return { ...this.definition };
  }

  /**
   * Update the custom node definition
   */
  updateDefinition(updates: Partial<CustomNodeDefinition>): void {
    this.definition = { ...this.definition, ...updates };
  }

  /**
   * Get the full class code for this custom node
   */
  getFullClassCode(): string {
    const inputs = Array.from(this.inputs.values());
    const outputs = Array.from(this.outputs.values());
    const properties = Array.from(this.properties.values());

    // Get the evaluate function body
    let evaluateBody = '// Add your custom logic here';
    if (typeof (this as any).evaluate === 'function') {
      const evaluateFunc = (this as any).evaluate;
      let code = evaluateFunc.toString();
      code = code
        .replace(/^[^{]*{/, '')
        .replace(/}[^}]*$/, '')
        .trim();
      evaluateBody = code || evaluateBody;
    }

    // Generate the full class code
    let classCode = `import { BaseThreeNode } from '@/three/BaseThreeNode';
import { EvaluationContext } from '@/core/types';
import * as THREE from 'three';

`;

    // Add docstring if description exists
    if (this.definition.description?.trim()) {
      classCode += `/**\n * ${this.definition.description.trim().replace(/\n/g, '\n * ')}\n */\n`;
    }

    classCode += `export class ${this.type} extends BaseThreeNode {
  constructor(id: string) {
    super(id, '${this.type}', '${this.label}');

`;

    // Add inputs
    if (inputs.length > 0) {
      classCode += `    // Add inputs\n`;
      for (const input of inputs) {
        const defaultValue =
          input.defaultValue !== undefined ? JSON.stringify(input.defaultValue) : 'undefined';
        classCode += `    this.addInput({\n`;
        classCode += `      name: '${input.name}',\n`;
        classCode += `      type: '${input.type}',\n`;
        classCode += `      defaultValue: ${defaultValue},\n`;
        classCode += `    });\n`;
      }
      classCode += '\n';
    }

    // Add outputs
    if (outputs.length > 0) {
      classCode += `    // Add outputs\n`;
      for (const output of outputs) {
        classCode += `    this.addOutput({\n`;
        classCode += `      name: '${output.name}',\n`;
        classCode += `      type: '${output.type}',\n`;
        classCode += `    });\n`;
      }
      classCode += '\n';
    }

    // Add properties
    if (properties.length > 0) {
      classCode += `    // Add properties\n`;
      for (const prop of properties) {
        classCode += `    this.addProperty({\n`;
        classCode += `      name: '${prop.name}',\n`;
        classCode += `      type: '${prop.type}',\n`;
        classCode += `      value: ${JSON.stringify(prop.value)},\n`;
        if ((prop as any).min !== undefined) classCode += `      min: ${(prop as any).min},\n`;
        if ((prop as any).max !== undefined) classCode += `      max: ${(prop as any).max},\n`;
        if ((prop as any).step !== undefined) classCode += `      step: ${(prop as any).step},\n`;
        if ((prop as any).options !== undefined)
          classCode += `      options: ${JSON.stringify((prop as any).options)},\n`;
        classCode += `    });\n`;
      }
      classCode += '\n';
    }

    classCode += `  }

  evaluate(context: EvaluationContext): void {
${evaluateBody
  .split('\n')
  .map((line) => '    ' + line)
  .join('\n')}
  }
}
`;

    return classCode;
  }

  /**
   * Export this custom node to a file
   */
  exportToFile(): void {
    const definition: CustomNodeDefinition = {
      id: this.definition.id || `custom-${Date.now()}`,
      name: this.type,
      label: this.label,
      category: this.definition.category || 'User',
      icon: this.definition.icon || '✨',
      description: this.definition.description || '',
      inputs: Array.from(this.inputs.values()).map((port) => ({
        name: port.name,
        type: port.type,
        defaultValue: port.defaultValue,
      })),
      outputs: Array.from(this.outputs.values()).map((port) => ({
        name: port.name,
        type: port.type,
        defaultValue: port.defaultValue,
      })),
      properties: Array.from(this.properties.values()).map((prop) => ({
        name: prop.name,
        type: prop.type,
        value: prop.value,
        label: prop.label,
        min: (prop as any).min,
        max: (prop as any).max,
        step: (prop as any).step,
        options: (prop as any).options,
      })),
      evaluateCode: this.getRawCode(),
      version: '1.0.0',
      createdAt: this.definition.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    exportCustomNodeToFile(definition);
  }

  /**
   * Import a custom node definition from a file
   */
  async importFromFile(): Promise<boolean> {
    try {
      const definition = await importCustomNodeFromFile();
      if (definition) {
        this.definition = definition;
        this.initializeFromDefinition(definition);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }

  /**
   * Delete this custom node
   */
  delete(): boolean {
    if (!this.customNodeManager || !this.definition.name) {
      return false;
    }

    const result = this.customNodeManager.deleteCustomNode(this.definition.name);
    return result.success;
  }

  /**
   * Update the evaluate function from code
   */
  updateEvaluateFunction(code: string): void {
    try {
      const evaluateFunc = new Function('context', `"use strict";\n${code}`) as any;
      (this as any).evaluate = evaluateFunc;
    } catch (error) {
      console.error('Failed to update evaluate function:', error);
    }
  }

  /**
   * Update the node name and type
   */
  updateName(newName: string): void {
    this.type = newName;
    this.label = newName;
    this.definition.name = newName;
    this.definition.label = newName;
  }

  /**
   * Update the node description
   */
  updateDescription(description: string): void {
    this.definition.description = description;
  }

  /**
   * Update the node category
   */
  updateCategory(category: string): void {
    this.definition.category = category;
  }

  /**
   * Get the raw source code for this node (overrides BaseThreeNode)
   */
  getRawCode(): string {
    // For custom nodes, we want to return the full class code
    return this.getFullClassCode();
  }

  /**
   * Trigger autosave with 500ms debounce
   */
  triggerAutosave(): void {
    // Clear existing timer
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }

    // Set new timer
    this.autosaveTimer = window.setTimeout(() => {
      this.performAutosave();
    }, 500);
  }

  /**
   * Trigger name update with 250ms debounce
   */
  triggerNameUpdate(): void {
    if (this.nameUpdateTimer) {
      clearTimeout(this.nameUpdateTimer);
    }

    this.nameUpdateTimer = window.setTimeout(() => {
      this.updateNodeName();
    }, 250);
  }

  /**
   * Update the node's name and label in real-time
   */
  private updateNodeName(): void {
    // Force visual update by marking node as dirty and triggering graph change
    this.markDirty();
    if (this.graph) {
      this.graph.triggerChange();
    }
  }

  /**
   * Perform the actual autosave operation
   */
  private performAutosave(): void {
    if (!this.customNodeManager) return;

    try {
      const previousName = this.definition.name;
      const newName = this.type;

      // Create full definition from current state
      const definition: CustomNodeDefinition = {
        id: this.definition.id || `custom-${Date.now()}`,
        name: this.type,
        label: this.label,
        category: this.definition.category || 'User',
        icon: this.definition.icon || '✨',
        description: this.definition.description || '',
        inputs: Array.from(this.inputs.values()).map((port) => ({
          name: port.name,
          type: port.type,
          defaultValue: port.defaultValue,
        })),
        outputs: Array.from(this.outputs.values()).map((port) => ({
          name: port.name,
          type: port.type,
          defaultValue: port.defaultValue,
        })),
        properties: Array.from(this.properties.values()).map((prop) => ({
          name: prop.name,
          type: prop.type,
          value: prop.value,
          label: prop.label,
          min: (prop as any).min,
          max: (prop as any).max,
          step: (prop as any).step,
          options: (prop as any).options,
        })),
        evaluateCode: this.getRawCode(),
        version: '1.0.0',
        createdAt: this.definition.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      // Check if name changed from default
      const isNewNode = previousName === 'CustomNode' && newName !== 'CustomNode';

      if (isNewNode) {
        // Register as new custom node
        const result = this.customNodeManager.createCustomNode(definition);
        if (result.success) {
          console.log('Custom node registered:', newName);
          this.definition = definition;
        }
      } else if (previousName && previousName !== 'CustomNode') {
        // Update existing custom node
        const result = this.customNodeManager.updateCustomNode(definition);
        if (result.success) {
          console.log('Custom node updated:', newName);
          this.definition = definition;

          // Update all instances of this custom node type
          const registry = (this.customNodeManager as any).registry;
          if (registry && this.graph) {
            registry.updateAllCustomNodeInstances(newName, definition, this.graph);
          }
        }
      } else {
        // Just store locally, don't register yet
        console.log('Custom node definition updated (not yet registered)');
        this.definition = definition;
      }
    } catch (error) {
      console.error('Autosave failed:', error);
    }
  }

  /**
   * Update the node from form data
   */
  updateFromForm(formData: {
    name?: string;
    category?: string;
    description?: string;
    evaluateCode?: string;
  }): void {
    // Update name if provided
    if (formData.name && formData.name !== this.type) {
      this.updateName(formData.name);
    }

    // Update category if provided
    if (formData.category) {
      this.updateCategory(formData.category);
    }

    // Update description if provided
    if (formData.description !== undefined) {
      this.updateDescription(formData.description);
    }

    // Update evaluate function if provided
    if (formData.evaluateCode) {
      this.updateEvaluateFunction(formData.evaluateCode);
    }

    // Trigger autosave
    this.triggerAutosave();
  }

  /**
   * Clean up timers when disposing
   */
  dispose(): void {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = undefined;
    }
    if (this.nameUpdateTimer) {
      clearTimeout(this.nameUpdateTimer);
      this.nameUpdateTimer = undefined;
    }
    super.dispose();
  }

  /**
   * Default evaluate function for custom nodes
   */
  evaluate(_context: EvaluationContext): void {
    // This will be overridden by the actual evaluate function
    // when the node is properly initialized
  }
}
