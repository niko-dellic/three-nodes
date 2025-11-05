import { Graph } from '@/core/Graph';
import { Node } from '@/core/Node';
import { SelectionManager } from './SelectionManager';
import { NodeRegistry } from '@/three/NodeRegistry';

interface ClipboardData {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number };
    inputValues: Record<string, unknown>;
  }>;
  edges: Array<{
    sourceNodeId: string;
    sourcePortName: string;
    targetNodeId: string;
    targetPortName: string;
  }>;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export class ClipboardManager {
  private clipboard: ClipboardData | null = null;
  private pasteOffset = 50; // Offset for each paste to avoid overlap

  constructor(
    private graph: Graph,
    private selectionManager: SelectionManager,
    private registry: NodeRegistry
  ) {}

  /**
   * Copy selected nodes and their internal connections to clipboard
   */
  copy(): void {
    const selectedIds = this.selectionManager.getSelectedNodes();
    if (selectedIds.size === 0) {
      console.log('Nothing to copy');
      return;
    }

    const nodes: ClipboardData['nodes'] = [];
    const edges: ClipboardData['edges'] = [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Collect node data
    for (const nodeId of selectedIds) {
      const node = this.graph.getNode(nodeId);
      if (!node) continue;

      // Track bounds
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + 200); // Approximate node width
      maxY = Math.max(maxY, node.position.y + 100); // Approximate node height

      // Collect input values
      const inputValues: Record<string, unknown> = {};
      for (const [name, port] of node.inputs) {
        if (port.value !== undefined) {
          inputValues[name] = port.value;
        }
      }

      nodes.push({
        id: nodeId,
        type: node.constructor.name,
        label: node.label,
        position: { ...node.position },
        inputValues,
      });
    }

    // Collect edges: include both internal edges and incoming edges from non-selected nodes
    for (const edge of this.graph.edges.values()) {
      const sourceNodeId = edge.source.node.id;
      const targetNodeId = edge.target.node.id;

      // Include edges where target is selected (both internal and incoming connections)
      if (selectedIds.has(targetNodeId)) {
        edges.push({
          sourceNodeId,
          sourcePortName: edge.source.name,
          targetNodeId,
          targetPortName: edge.target.name,
        });
      }
    }

    this.clipboard = {
      nodes,
      edges,
      bounds: { minX, minY, maxX, maxY },
    };

    console.log(`Copied ${nodes.length} node(s) and ${edges.length} edge(s)`);
  }

  /**
   * Copy and delete selected nodes
   */
  cut(): void {
    this.copy();
    const selectedIds = Array.from(this.selectionManager.getSelectedNodes());
    for (const nodeId of selectedIds) {
      this.graph.removeNode(nodeId);
    }
    this.selectionManager.clearSelection();
    console.log(`Cut ${selectedIds.length} node(s)`);
  }

  /**
   * Paste clipboard contents at mouse position or with offset
   */
  paste(mousePos?: { x: number; y: number }): void {
    if (!this.clipboard || this.clipboard.nodes.length === 0) {
      console.log('Nothing to paste');
      return;
    }

    // Map old IDs to new IDs
    const idMap = new Map<string, string>();
    const newNodes: Node[] = [];

    // Calculate paste position
    let offsetX: number;
    let offsetY: number;

    if (mousePos) {
      // Paste at mouse position (center the pasted nodes around mouse)
      const centerX = (this.clipboard.bounds.minX + this.clipboard.bounds.maxX) / 2;
      const centerY = (this.clipboard.bounds.minY + this.clipboard.bounds.maxY) / 2;
      offsetX = mousePos.x - centerX;
      offsetY = mousePos.y - centerY;
    } else {
      // Paste with offset from original position
      offsetX = this.pasteOffset;
      offsetY = this.pasteOffset;
    }

    // Create new nodes
    for (const nodeData of this.clipboard.nodes) {
      const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newNode = this.registry.createNode(nodeData.type, newId);

      if (!newNode) {
        console.warn(`Node type ${nodeData.type} not found in registry`);
        continue;
      }

      idMap.set(nodeData.id, newId);

      newNode.label = nodeData.label;
      newNode.position = {
        x: nodeData.position.x + offsetX,
        y: nodeData.position.y + offsetY,
      };

      // Restore input values
      for (const [name, value] of Object.entries(nodeData.inputValues)) {
        const port = newNode.inputs.get(name);
        if (port) {
          port.value = value as never; // Cast to satisfy TypeScript - value was previously valid
        }
      }

      this.graph.addNode(newNode);
      newNodes.push(newNode);
    }

    // Recreate edges with new IDs
    for (const edgeData of this.clipboard.edges) {
      const newTargetId = idMap.get(edgeData.targetNodeId);
      if (!newTargetId) continue;

      // Check if source was pasted (internal edge) or exists in graph (external edge)
      const newSourceId = idMap.get(edgeData.sourceNodeId);
      const sourceNodeId = newSourceId || edgeData.sourceNodeId; // Use original ID if not pasted

      const sourceNode = this.graph.getNode(sourceNodeId);
      const targetNode = this.graph.getNode(newTargetId);

      if (!sourceNode || !targetNode) continue;

      const sourcePort = sourceNode.outputs.get(edgeData.sourcePortName);
      const targetPort = targetNode.inputs.get(edgeData.targetPortName);

      if (sourcePort && targetPort) {
        try {
          this.graph.connect(sourcePort, targetPort);
        } catch (err) {
          console.warn(`Failed to reconnect edge: ${err}`);
        }
      }
    }

    // Select all the newly pasted nodes
    const newNodeIds = newNodes.map((node) => node.id);
    this.selectionManager.selectNodes(newNodeIds, 'replace');

    console.log(`Pasted ${newNodes.length} node(s)`);
  }

  /**
   * Check if clipboard has data
   */
  hasData(): boolean {
    return this.clipboard !== null && this.clipboard.nodes.length > 0;
  }

  /**
   * Clear clipboard
   */
  clear(): void {
    this.clipboard = null;
  }
}
