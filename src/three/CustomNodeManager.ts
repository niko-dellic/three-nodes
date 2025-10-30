import { NodeRegistry } from './NodeRegistry';
import {
  CustomNodeDefinition,
  CustomNodeStorage,
  CustomNodeOperationResult,
} from '@/types/customNode';
import { Node } from '@/core/Node';
import { BaseThreeNode } from './BaseThreeNode';
import { EvaluationContext } from '@/core/types';

const STORAGE_KEY = 'three-nodes-custom-nodes';
const STORAGE_VERSION = '1.0.0';

/**
 * Manages custom node definitions, storage, and dynamic registration
 */
export class CustomNodeManager {
  private registry: NodeRegistry;
  private customNodes: Map<string, CustomNodeDefinition> = new Map();

  constructor(registry: NodeRegistry) {
    this.registry = registry;
    // Register the base CustomNode type for creating new custom nodes
    this.registerBaseCustomNodeType();
  }

  /**
   * Register a base "CustomNode" type that creates empty custom nodes
   * This allows users to create a new custom node from the context menu
   */
  private registerBaseCustomNodeType(): void {
    const baseDefinition: CustomNodeDefinition = {
      id: 'base-custom-node',
      name: 'CustomNode',
      label: 'Custom Node',
      category: 'Custom',
      icon: '✨',
      description: 'A custom node ready to be configured',
      inputs: [],
      outputs: [],
      properties: [],
      evaluateCode: '// Add your custom logic here\n// Use this.getInputValue(name) to read inputs\n// Use this.setOutputValue(name, value) to write outputs\n// Use this.getProperty(name) to read properties',
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Register without saving to storage (this is a built-in type)
    const NodeClass = this.createNodeClass(baseDefinition);
    this.registry.register(NodeClass, {
      type: 'CustomNode',
      label: 'Custom Node',
      category: 'Custom',
      icon: '✨',
      description: 'Create a new custom node',
    });
  }

  /**
   * Load all custom nodes from localStorage and register them
   */
  loadFromStorage(): CustomNodeOperationResult {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return { success: true, message: 'No custom nodes found in storage' };
      }

      const storage: CustomNodeStorage = JSON.parse(data);
      
      // Validate storage version
      if (!storage.version) {
        return { success: false, error: 'Invalid storage format: missing version' };
      }

      let loadedCount = 0;
      for (const definition of storage.nodes) {
        const result = this.registerCustomNode(definition);
        if (result.success) {
          loadedCount++;
        } else {
          console.warn(`Failed to load custom node ${definition.name}:`, result.error);
        }
      }

      return {
        success: true,
        message: `Loaded ${loadedCount} custom node(s) from storage`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load custom nodes: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Save all custom nodes to localStorage
   */
  saveToStorage(): CustomNodeOperationResult {
    try {
      const storage: CustomNodeStorage = {
        version: STORAGE_VERSION,
        nodes: Array.from(this.customNodes.values()),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(storage, null, 2));

      return {
        success: true,
        message: `Saved ${this.customNodes.size} custom node(s) to storage`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to save custom nodes: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Register a custom node definition and make it available in the registry
   */
  registerCustomNode(definition: CustomNodeDefinition): CustomNodeOperationResult {
    try {
      // Validate definition
      const validationResult = this.validateDefinition(definition);
      if (!validationResult.success) {
        return validationResult;
      }

      // Create a dynamic node class
      const NodeClass = this.createNodeClass(definition);

      // Register with the node registry
      this.registry.register(NodeClass, {
        type: definition.name,
        category: definition.category,
        label: definition.label,
        description: definition.description,
        icon: definition.icon || '✨',
      });

      // Store the definition
      this.customNodes.set(definition.name, definition);

      console.log(`Custom node registered: "${definition.name}" (${definition.label}) in category "${definition.category}"`);

      return {
        success: true,
        message: `Custom node "${definition.label}" registered successfully`,
        nodeId: definition.id,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to register custom node: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Create a custom node and save it to storage
   */
  createCustomNode(definition: CustomNodeDefinition): CustomNodeOperationResult {
    // Set timestamps
    const now = Date.now();
    definition.createdAt = definition.createdAt || now;
    definition.updatedAt = now;
    definition.version = definition.version || '1.0.0';

    // Register the node
    const registerResult = this.registerCustomNode(definition);
    if (!registerResult.success) {
      return registerResult;
    }

    // Save to storage
    const saveResult = this.saveToStorage();
    if (!saveResult.success) {
      return saveResult;
    }

    return {
      success: true,
      message: `Custom node "${definition.label}" created and saved`,
      nodeId: definition.id,
    };
  }

  /**
   * Update an existing custom node
   */
  updateCustomNode(definition: CustomNodeDefinition): CustomNodeOperationResult {
    if (!this.customNodes.has(definition.name)) {
      return {
        success: false,
        error: `Custom node "${definition.name}" not found`,
      };
    }

    // Update timestamp
    definition.updatedAt = Date.now();

    // Re-register the node (this will replace the existing registration)
    const registerResult = this.registerCustomNode(definition);
    if (!registerResult.success) {
      return registerResult;
    }

    // Save to storage
    return this.saveToStorage();
  }

  /**
   * Delete a custom node
   */
  deleteCustomNode(nodeName: string): CustomNodeOperationResult {
    if (!this.customNodes.has(nodeName)) {
      return {
        success: false,
        error: `Custom node "${nodeName}" not found`,
      };
    }

    this.customNodes.delete(nodeName);
    
    // Save to storage
    this.saveToStorage();
    
    // Note: We don't unregister from the NodeRegistry as that could break existing graphs
    // The node will simply not be available in new graphs after app reload
    
    return {
      success: true,
      message: `Custom node "${nodeName}" deleted`,
    };
  }

  /**
   * Get a custom node definition by name
   */
  getCustomNode(nodeName: string): CustomNodeDefinition | undefined {
    return this.customNodes.get(nodeName);
  }

  /**
   * Get all custom node definitions
   */
  getAllCustomNodes(): CustomNodeDefinition[] {
    return Array.from(this.customNodes.values());
  }

  /**
   * Duplicate a node as a custom node
   * Takes any node and creates a custom node definition from it
   */
  duplicateNode(sourceNode: Node, newName?: string): CustomNodeOperationResult {
    try {
      // Extract evaluate function code
      let evaluateCode = '// Add your custom logic here';
      if (typeof (sourceNode as any).evaluate === 'function') {
        const evaluateFunc = (sourceNode as any).evaluate;
        let code = evaluateFunc.toString();
        // Remove the function wrapper to show just the body
        code = code.replace(/^[^{]*{/, '').replace(/}[^}]*$/, '').trim();
        evaluateCode = code || evaluateCode;
      }

      // Generate unique name if not provided
      const baseName = newName || `${sourceNode.type}Copy`;
      let uniqueName = baseName;
      let counter = 1;
      while (this.customNodes.has(uniqueName)) {
        uniqueName = `${baseName}${counter}`;
        counter++;
      }

      // Create custom node definition from source node
      const definition: CustomNodeDefinition = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: uniqueName,
        label: `${sourceNode.label} (Copy)`,
        category: 'Custom',
        icon: '📋',
        description: `Duplicate of ${sourceNode.label}`,
        inputs: Array.from(sourceNode.inputs.values()).map((port) => ({
          name: port.name,
          type: port.type,
          defaultValue: port.defaultValue,
        })),
        outputs: Array.from(sourceNode.outputs.values()).map((port) => ({
          name: port.name,
          type: port.type,
        })),
        properties: Array.from(sourceNode.properties.values()).map((prop) => ({
          name: prop.name,
          type: prop.type,
          value: prop.value,
          min: (prop as any).min,
          max: (prop as any).max,
          step: (prop as any).step,
          options: (prop as any).options,
        })),
        evaluateCode: evaluateCode,
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Create the custom node
      const result = this.createCustomNode(definition);
      
      // Add the node name to the result for easy access
      if (result.success) {
        return {
          ...result,
          nodeName: definition.name,
        };
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to duplicate node: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Export a custom node definition as JSON string
   */
  exportCustomNode(nodeName: string): string | null {
    const definition = this.customNodes.get(nodeName);
    if (!definition) {
      return null;
    }

    return JSON.stringify(definition, null, 2);
  }

  /**
   * Import a custom node from JSON string
   */
  importCustomNode(jsonString: string): CustomNodeOperationResult {
    try {
      const definition: CustomNodeDefinition = JSON.parse(jsonString);
      
      // Validate the definition
      const validationResult = this.validateDefinition(definition);
      if (!validationResult.success) {
        return validationResult;
      }

      // Check if node with same name already exists
      if (this.customNodes.has(definition.name)) {
        return {
          success: false,
          error: `A custom node with name "${definition.name}" already exists. Please rename or delete the existing node first.`,
        };
      }

      // Create the custom node
      return this.createCustomNode(definition);
    } catch (error) {
      return {
        success: false,
        error: `Failed to import custom node: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Validate a custom node definition
   */
  private validateDefinition(definition: CustomNodeDefinition): CustomNodeOperationResult {
    if (!definition.id) {
      return { success: false, error: 'Definition missing required field: id' };
    }
    if (!definition.name) {
      return { success: false, error: 'Definition missing required field: name' };
    }
    if (!definition.label) {
      return { success: false, error: 'Definition missing required field: label' };
    }
    if (!definition.category) {
      return { success: false, error: 'Definition missing required field: category' };
    }
    if (!definition.evaluateCode) {
      return { success: false, error: 'Definition missing required field: evaluateCode' };
    }

    // Validate name format (should be valid TypeScript identifier)
    const nameRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    if (!nameRegex.test(definition.name)) {
      return {
        success: false,
        error: 'Node name must be a valid identifier (letters, numbers, underscore)',
      };
    }

    return { success: true };
  }

  /**
   * Create a dynamic node class from a definition
   */
  private createNodeClass(definition: CustomNodeDefinition): new (id: string) => Node {
    const manager = this;

    // Create the class dynamically
    return class CustomNode extends BaseThreeNode {
      constructor(id: string) {
        super(id, definition.name, definition.label);

        // Add inputs
        for (const input of definition.inputs) {
          this.addInput({
            name: input.name,
            type: input.type,
            defaultValue: input.defaultValue,
          });
        }

        // Add outputs
        for (const output of definition.outputs) {
          this.addOutput({
            name: output.name,
            type: output.type,
            defaultValue: output.defaultValue,
          });
        }

        // Add properties
        for (const property of definition.properties) {
          this.addProperty(property);
        }
      }

      evaluate(context: EvaluationContext): void {
        try {
          // Create a safe execution environment
          const evaluateFunc = manager.compileEvaluateFunction(definition.evaluateCode);
          
          // Call the user's evaluate function with proper context
          evaluateFunc.call(this, context);
        } catch (error) {
          console.error(`Error in custom node "${definition.label}":`, error);
          
          // Set error state on outputs (set them to undefined)
          for (const output of definition.outputs) {
            this.setOutputValue(output.name, undefined);
          }
        }
      }
    };
  }

  /**
   * Compile user's evaluate code into an executable function
   */
  private compileEvaluateFunction(code: string): (context: EvaluationContext) => void {
    try {
      // Wrap the code in a function that has access to the node's methods
      // The function will be called with 'this' bound to the node instance
      const funcBody = `
        "use strict";
        ${code}
      `;

      // Create the function
      // Note: The function will have access to 'this' (the node instance) and 'context'
      return new Function('context', funcBody) as (context: EvaluationContext) => void;
    } catch (error) {
      throw new Error(
        `Failed to compile evaluate function: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

