import { Graph } from '@/core/Graph';
import { Node } from '@/core/Node';

export interface AutoLayoutConfig {
  horizontalSpacing: number;
  verticalSpacing: number;
  layerWidth: number;
}

/**
 * AutoLayoutManager - Automatically arranges nodes based on their relationships
 *
 * Features:
 * - Topological sorting to determine hierarchy
 * - DOM-based bounding box calculation
 * - Layer-based horizontal positioning
 * - Smart vertical stacking within layers
 * - Configurable spacing
 */
export class AutoLayoutManager {
  private graph: Graph;
  private config: AutoLayoutConfig;

  constructor(graph: Graph, config?: Partial<AutoLayoutConfig>) {
    this.graph = graph;
    this.config = {
      horizontalSpacing: config?.horizontalSpacing ?? 200,
      verticalSpacing: config?.verticalSpacing ?? 100,
      layerWidth: config?.layerWidth ?? 400,
    };
  }

  /**
   * Update layout configuration
   */
  updateConfig(config: Partial<AutoLayoutConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AutoLayoutConfig {
    return { ...this.config };
  }

  /**
   * Apply auto-layout to all nodes in the graph
   */
  applyLayout(): void {
    this.applyLayoutWithConstraints(true, true);
  }

  /**
   * Apply auto-layout with axis constraints
   * @param applyHorizontal - Whether to apply horizontal positioning
   * @param applyVertical - Whether to apply vertical positioning
   */
  applyLayoutWithConstraints(applyHorizontal: boolean, applyVertical: boolean): void {
    const nodes = Array.from(this.graph.nodes.values());

    if (nodes.length === 0) {
      return;
    }

    // Store original positions if we're constraining an axis
    const originalPositions = new Map<string, { x: number; y: number }>();
    if (!applyHorizontal || !applyVertical) {
      for (const node of nodes) {
        originalPositions.set(node.id, { ...node.position });
      }
    }

    // Step 1: Calculate node layers based on topological ordering
    const layers = this.calculateNodeLayers(nodes);

    // Step 2: Position nodes layer by layer
    this.positionNodesByLayers(layers);

    // Step 3: Restore constrained axes
    if (!applyHorizontal || !applyVertical) {
      for (const node of nodes) {
        const original = originalPositions.get(node.id);
        if (original) {
          if (!applyHorizontal) {
            node.position.x = original.x;
          }
          if (!applyVertical) {
            node.position.y = original.y;
          }
        }
      }
    }

    // Trigger graph update to redraw
    this.graph.triggerChange();
  }

  /**
   * Calculate which layer each node belongs to based on dependencies
   * Nodes with no inputs go in layer 0, nodes depending on layer 0 go in layer 1, etc.
   */
  private calculateNodeLayers(nodes: Node[]): Map<number, Node[]> {
    const layers = new Map<number, Node[]>();
    const nodeToLayer = new Map<string, number>();

    // Helper to get all input nodes
    const getInputNodes = (node: Node): Node[] => {
      const inputNodes: Node[] = [];
      for (const inputPort of node.inputs.values()) {
        for (const connection of inputPort.connections) {
          inputNodes.push(connection.source.node);
        }
      }
      return inputNodes;
    };

    // Helper to recursively calculate layer
    const calculateLayer = (node: Node, visited: Set<string>): number => {
      // Check if already calculated
      if (nodeToLayer.has(node.id)) {
        return nodeToLayer.get(node.id)!;
      }

      // Detect cycles
      if (visited.has(node.id)) {
        return 0; // Default to layer 0 for cycles
      }

      visited.add(node.id);

      const inputNodes = getInputNodes(node);

      if (inputNodes.length === 0) {
        // No inputs = source node = layer 0
        nodeToLayer.set(node.id, 0);
        return 0;
      }

      // Layer is 1 + max layer of all input nodes
      let maxInputLayer = -1;
      for (const inputNode of inputNodes) {
        const inputLayer = calculateLayer(inputNode, new Set(visited));
        maxInputLayer = Math.max(maxInputLayer, inputLayer);
      }

      const layer = maxInputLayer + 1;
      nodeToLayer.set(node.id, layer);
      return layer;
    };

    // Calculate layer for each node
    for (const node of nodes) {
      const layer = calculateLayer(node, new Set());

      if (!layers.has(layer)) {
        layers.set(layer, []);
      }
      layers.get(layer)!.push(node);
    }

    return layers;
  }

  /**
   * Position nodes based on their layers
   */
  private positionNodesByLayers(layers: Map<number, Node[]>): void {
    const sortedLayerIndices = Array.from(layers.keys()).sort((a, b) => a - b);

    let currentX = 0;

    for (const layerIndex of sortedLayerIndices) {
      const nodesInLayer = layers.get(layerIndex)!;

      // Calculate positions for nodes in this layer
      this.positionNodesInLayer(nodesInLayer, currentX, layerIndex);

      // Move to next layer
      currentX += this.getMaxNodeWidthInLayer(nodesInLayer) + this.config.horizontalSpacing;
    }
  }

  /**
   * Position nodes within a single layer
   * For nodes with multiple inputs, position based on the furthest input node
   */
  private positionNodesInLayer(nodes: Node[], layerX: number, layerIndex: number): void {
    // Sort nodes by their "ideal" Y position based on input nodes
    const nodePositions: Array<{ node: Node; idealY: number }> = [];

    for (const node of nodes) {
      const idealY = this.calculateIdealY(node, layerIndex);
      nodePositions.push({ node, idealY });
    }

    // Sort by ideal Y position
    nodePositions.sort((a, b) => a.idealY - b.idealY);

    // Actually position the nodes with spacing
    let currentY = 0;

    for (const { node, idealY } of nodePositions) {
      // Try to honor ideal Y, but ensure minimum spacing
      const y = Math.max(currentY, idealY);

      node.position = { x: layerX, y };

      // Calculate next Y position
      const nodeHeight = this.getNodeHeight(node);
      currentY = y + nodeHeight + this.config.verticalSpacing;
    }
  }

  /**
   * Calculate the ideal Y position for a node based on its input nodes
   * For multiple inputs, use the average of the furthest nodes along each axis
   */
  private calculateIdealY(node: Node, _layerIndex: number): number {
    // Get all input nodes
    const inputNodes: Node[] = [];
    for (const inputPort of node.inputs.values()) {
      for (const connection of inputPort.connections) {
        inputNodes.push(connection.source.node);
      }
    }

    if (inputNodes.length === 0) {
      // No inputs, position at top
      return 0;
    }

    if (inputNodes.length === 1) {
      // Single input, align with it
      return (
        inputNodes[0].position.y +
        this.getNodeHeight(inputNodes[0]) / 2 -
        this.getNodeHeight(node) / 2
      );
    }

    // Multiple inputs: find the furthest along Y axis and use its center
    // This creates a natural flow where nodes align with their most "downstream" input
    let maxY = -Infinity;
    let maxYNode: Node | null = null;

    for (const inputNode of inputNodes) {
      const nodeY = inputNode.position.y;
      if (nodeY > maxY) {
        maxY = nodeY;
        maxYNode = inputNode;
      }
    }

    if (maxYNode) {
      // Align with the center of the furthest Y node
      return maxYNode.position.y + this.getNodeHeight(maxYNode) / 2 - this.getNodeHeight(node) / 2;
    }

    // Fallback: use average Y position of all inputs
    const avgY = inputNodes.reduce((sum, n) => sum + n.position.y, 0) / inputNodes.length;
    return avgY;
  }

  /**
   * Get the maximum width of nodes in a layer (from DOM bounding boxes)
   */
  private getMaxNodeWidthInLayer(nodes: Node[]): number {
    let maxWidth = 200; // Default minimum width

    for (const node of nodes) {
      const width = this.getNodeWidth(node);
      maxWidth = Math.max(maxWidth, width);
    }

    return maxWidth;
  }

  /**
   * Get node width from DOM element or use default
   */
  private getNodeWidth(node: Node): number {
    const element = this.getNodeElement(node);
    if (element) {
      return element.offsetWidth || node.customWidth || 200;
    }
    return node.customWidth || 200;
  }

  /**
   * Get node height from DOM element or use default
   */
  private getNodeHeight(node: Node): number {
    const element = this.getNodeElement(node);
    if (element) {
      return element.offsetHeight || node.customHeight || 100;
    }
    return node.customHeight || 100;
  }

  /**
   * Get the DOM element for a node
   */
  private getNodeElement(node: Node): HTMLElement | null {
    return document.querySelector(`[data-node-id="${node.id}"]`) as HTMLElement | null;
  }

  /**
   * Apply layout with animation
   * This gradually moves nodes to their target positions
   */
  applyLayoutAnimated(duration: number = 500): void {
    this.applyLayoutAnimatedWithConstraints(true, true, duration);
  }

  /**
   * Apply layout with animation and axis constraints
   */
  applyLayoutAnimatedWithConstraints(
    applyHorizontal: boolean,
    applyVertical: boolean,
    duration: number = 500
  ): void {
    const nodes = Array.from(this.graph.nodes.values());

    if (nodes.length === 0) {
      return;
    }

    // Store original positions
    const originalPositions = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
      originalPositions.set(node.id, { ...node.position });
    }

    // Calculate target positions
    const layers = this.calculateNodeLayers(nodes);
    this.positionNodesByLayers(layers);

    // Store target positions
    const targetPositions = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
      targetPositions.set(node.id, { ...node.position });
    }

    // Restore original positions
    for (const node of nodes) {
      const original = originalPositions.get(node.id);
      if (original) {
        node.position = { ...original };
      }
    }

    // Animate to target positions
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-in-out)
      const eased =
        progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Interpolate positions
      for (const node of nodes) {
        const original = originalPositions.get(node.id);
        const target = targetPositions.get(node.id);

        if (original && target) {
          node.position = {
            x: applyHorizontal ? original.x + (target.x - original.x) * eased : original.x,
            y: applyVertical ? original.y + (target.y - original.y) * eased : original.y,
          };
        }
      }

      // Trigger redraw
      this.graph.triggerChange();

      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }
}
