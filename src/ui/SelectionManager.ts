import { Graph } from '@/core/Graph';
import { Node } from '@/core/Node';

export class SelectionManager {
  private graph: Graph;
  private selectedNodes: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();

  constructor(graph: Graph) {
    this.graph = graph;
  }

  // Select a single node
  selectNode(nodeId: string, mode: 'replace' | 'add' | 'toggle' = 'replace'): void {
    if (mode === 'replace') {
      this.selectedNodes.clear();
      this.selectedNodes.add(nodeId);
    } else if (mode === 'add') {
      this.selectedNodes.add(nodeId);
    } else if (mode === 'toggle') {
      if (this.selectedNodes.has(nodeId)) {
        this.selectedNodes.delete(nodeId);
      } else {
        this.selectedNodes.add(nodeId);
      }
    }
    this.notifyChange();
  }

  // Select multiple nodes
  selectNodes(nodeIds: string[], mode: 'replace' | 'add' = 'replace'): void {
    if (mode === 'replace') {
      this.selectedNodes.clear();
    }
    for (const nodeId of nodeIds) {
      this.selectedNodes.add(nodeId);
    }
    this.notifyChange();
  }

  // Deselect a node
  deselectNode(nodeId: string): void {
    this.selectedNodes.delete(nodeId);
    this.notifyChange();
  }

  // Clear all selections
  clearSelection(): void {
    this.selectedNodes.clear();
    this.notifyChange();
  }

  // Check if a node is selected
  isSelected(nodeId: string): boolean {
    return this.selectedNodes.has(nodeId);
  }

  // Get all selected nodes
  getSelectedNodes(): Set<string> {
    return new Set(this.selectedNodes);
  }

  // Get selected node objects
  getSelectedNodeObjects(): Node[] {
    const nodes: Node[] = [];
    for (const nodeId of this.selectedNodes) {
      const node = this.graph.getNode(nodeId);
      if (node) {
        nodes.push(node);
      }
    }
    return nodes;
  }

  // Get count of selected nodes
  getSelectionCount(): number {
    return this.selectedNodes.size;
  }

  // Move all selected nodes by a delta
  moveSelectedNodes(dx: number, dy: number): void {
    for (const nodeId of this.selectedNodes) {
      const node = this.graph.getNode(nodeId);
      if (node) {
        node.position.x += dx;
        node.position.y += dy;
      }
    }
  }

  // Set positions of all selected nodes (for drag operations)
  setSelectedNodesPosition(
    referenceNodeId: string,
    newX: number,
    newY: number,
    offsetX: number,
    offsetY: number
  ): void {
    const referenceNode = this.graph.getNode(referenceNodeId);
    if (!referenceNode) return;

    // Calculate the actual position for the reference node
    const refNewX = newX - offsetX;
    const refNewY = newY - offsetY;

    // Calculate delta from reference node's current position
    const dx = refNewX - referenceNode.position.x;
    const dy = refNewY - referenceNode.position.y;

    // Move all selected nodes by the same delta
    this.moveSelectedNodes(dx, dy);
  }

  // Delete all selected nodes
  deleteSelectedNodes(): void {
    const nodesToDelete = Array.from(this.selectedNodes);
    for (const nodeId of nodesToDelete) {
      this.graph.removeNode(nodeId);
    }
    this.selectedNodes.clear();
    this.notifyChange();
  }

  // Subscribe to selection changes
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyChange(): void {
    this.listeners.forEach((listener) => listener());
  }
}
