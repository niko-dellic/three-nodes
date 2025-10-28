import { Node } from '@/core/Node';
import { NodeMetadata } from '@/types';

type NodeConstructor = new (id: string) => Node;

export class NodeRegistry {
  private nodeTypes: Map<string, { constructor: NodeConstructor; metadata: NodeMetadata }> =
    new Map();

  // Register a node type
  register(constructor: NodeConstructor, metadata: NodeMetadata): void {
    this.nodeTypes.set(metadata.type, { constructor, metadata });
  }

  // Create a node instance by type
  createNode(type: string, id?: string): Node | null {
    const entry = this.nodeTypes.get(type);
    if (!entry) {
      return null;
    }

    const nodeId = id || this.generateId();
    return new entry.constructor(nodeId);
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

  private generateId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
