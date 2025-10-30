import { Node } from '@/core/Node';
import { NodeMetadata } from '@/types';
import { CustomNodeDefinition } from '@/types/customNode';

type NodeConstructor = new (id: string) => Node;

export class NodeRegistry {
  private nodeTypes: Map<string, { constructor: NodeConstructor; metadata: NodeMetadata }> =
    new Map();

  // Register a node type
  register(constructor: NodeConstructor, metadata: NodeMetadata): void {
    this.nodeTypes.set(metadata.type, { constructor, metadata });
  }

  // Create a node instance by type string
  createNode(type: string, id?: string): Node | null {
    const entry = this.nodeTypes.get(type);
    if (!entry) {
      return null;
    }

    const nodeId = id || this.generateId();
    return new entry.constructor(nodeId);
  }

  // Create a node instance with full type safety using the class constructor
  insertNode<T extends Node>(constructor: new (id: string) => T, id?: string): T {
    const nodeId = id || this.generateId();
    return new constructor(nodeId);
  }

  // Get metadata for a node type
  getMetadata(type: string): NodeMetadata | undefined {
    return this.nodeTypes.get(type)?.metadata;
  }

  // Get all registered node types
  getAllTypes(): NodeMetadata[] {
    return Array.from(this.nodeTypes.values()).map((entry) => entry.metadata);
  }

  // Get types by category
  getTypesByCategory(category: string): NodeMetadata[] {
    return this.getAllTypes().filter((meta) => meta.category === category);
  }

  /**
   * Update all instances of a custom node type with new definition
   * This method should be called when a custom node definition is updated
   */
  updateAllCustomNodeInstances(nodeType: string, definition: CustomNodeDefinition, graph: any): void {
    if (!graph) return;

    const allNodes = Array.from(graph.nodes.values()) as Node[];

    // Find all nodes of this type
    const nodesToUpdate = allNodes.filter((n) => n.type === nodeType);

    if (nodesToUpdate.length === 0) return;

    console.log(`Updating ${nodesToUpdate.length} instance(s) of ${nodeType}`);

    // Recompile the evaluate function
    try {
      const evaluateFunc = new Function(
        'context',
        `"use strict";\n${definition.evaluateCode}`
      ) as any;

      // Update each instance
      for (const node of nodesToUpdate) {
        // Update the evaluate function
        (node as any).evaluate = evaluateFunc;

        // Mark as dirty to trigger re-evaluation
        node.markDirty();
      }

      // Trigger graph re-evaluation
      graph.triggerChange();

      console.log(`Successfully updated all instances of ${nodeType}`);
    } catch (error) {
      console.error(`Failed to update instances of ${nodeType}:`, error);
    }
  }

  private generateId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
