import { Node } from './Node';
import { Edge } from './Edge';
import { Port } from './Port';

export class Graph {
  public nodes: Map<string, Node> = new Map();
  public edges: Map<string, Edge> = new Map();

  private _listeners: Set<(graph: Graph) => void> = new Set();

  // Add a node to the graph
  addNode(node: Node): void {
    this.nodes.set(node.id, node);
    node.init();
    this.notifyChange();
  }

  // Remove a node and all connected edges
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Remove all edges connected to this node
    const edgesToRemove: string[] = [];
    for (const [edgeId, edge] of this.edges) {
      if (edge.source.node.id === nodeId || edge.target.node.id === nodeId) {
        edgesToRemove.push(edgeId);
      }
    }
    edgesToRemove.forEach((id) => this.removeEdge(id));

    // Dispose and remove node
    node.dispose();
    this.nodes.delete(nodeId);
    this.notifyChange();
  }

  // Connect two ports
  connect(sourcePort: Port, targetPort: Port): Edge | null {
    // Check if connection already exists
    for (const edge of this.edges.values()) {
      if (edge.source === sourcePort && edge.target === targetPort) {
        return null; // Connection already exists
      }
    }

    // Remove any existing connection to the target port (inputs can only have one connection)
    if (targetPort.isInput) {
      const existingEdge = this.getEdgeToPort(targetPort);
      if (existingEdge) {
        this.removeEdge(existingEdge.id);
      }
    }

    try {
      const edge = new Edge(sourcePort, targetPort);
      this.edges.set(edge.id, edge);

      // Mark target node as dirty
      targetPort.node.markDirty();
      this.notifyChange();

      return edge;
    } catch (error) {
      console.error('Failed to create edge:', error);
      return null;
    }
  }

  // Remove an edge
  removeEdge(edgeId: string): void {
    const edge = this.edges.get(edgeId);
    if (edge) {
      edge.target.node.markDirty();
      this.edges.delete(edgeId);
      this.notifyChange();
    }
  }

  // Get edge connected to a port
  getEdgeToPort(port: Port): Edge | undefined {
    for (const edge of this.edges.values()) {
      if (edge.target === port) {
        return edge;
      }
    }
    return undefined;
  }

  // Get all edges from a port
  getEdgesFromPort(port: Port): Edge[] {
    const result: Edge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.source === port) {
        result.push(edge);
      }
    }
    return result;
  }

  // Get node by ID
  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  // Subscribe to graph changes
  onChange(listener: (graph: Graph) => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private notifyChange(): void {
    this._listeners.forEach((listener) => listener(this));
  }

  // Public method to manually trigger change notification
  // (useful when node internal state changes without graph structure changes)
  triggerChange(): void {
    this.notifyChange();
  }

  // Clear the entire graph
  clear(): void {
    this.edges.clear();
    this.nodes.forEach((node) => node.dispose());
    this.nodes.clear();
    this.notifyChange();
  }
}
