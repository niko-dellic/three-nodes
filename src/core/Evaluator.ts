import { Graph } from './Graph';
import { Node } from './Node';
import { EvaluationContext } from './types';

export class Evaluator {
  private graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  // Evaluate the entire graph
  evaluate(context: EvaluationContext = {}): void {
    const sorted = this.topologicalSort();
    if (!sorted) {
      console.error('Graph contains cycles, cannot evaluate');
      return;
    }

    // Evaluate nodes in topological order
    for (const node of sorted) {
      if (node.isDirty) {
        // Propagate input values from connected edges
        this.propagateInputs(node);

        // Evaluate the node
        try {
          node.evaluate(context);
          node.markClean();
        } catch (error) {
          console.error(`Error evaluating node ${node.id}:`, error);
        }
      }
    }
  }

  // Propagate values from source nodes through edges to target node
  private propagateInputs(node: Node): void {
    for (const inputPort of node.inputs.values()) {
      const edge = this.graph.getEdgeToPort(inputPort);
      if (edge) {
        edge.propagate();
      }
    }
  }

  // Topological sort using Kahn's algorithm
  private topologicalSort(): Node[] | null {
    const nodes = Array.from(this.graph.nodes.values());
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Initialize
    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    }

    // Build adjacency list and in-degree count
    for (const edge of this.graph.edges.values()) {
      const sourceId = edge.source.node.id;
      const targetId = edge.target.node.id;

      adjList.get(sourceId)?.push(targetId);
      inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
    }

    // Find all nodes with no incoming edges
    const queue: Node[] = [];
    for (const node of nodes) {
      if (inDegree.get(node.id) === 0) {
        queue.push(node);
      }
    }

    const sorted: Node[] = [];

    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);

      // Reduce in-degree for neighbors
      const neighbors = adjList.get(node.id) || [];
      for (const neighborId of neighbors) {
        const degree = inDegree.get(neighborId)! - 1;
        inDegree.set(neighborId, degree);

        if (degree === 0) {
          const neighborNode = this.graph.getNode(neighborId);
          if (neighborNode) {
            queue.push(neighborNode);
          }
        }
      }
    }

    // Check if all nodes were sorted (no cycles)
    if (sorted.length !== nodes.length) {
      return null; // Cycle detected
    }

    return sorted;
  }

  // Mark a node and all downstream nodes as dirty
  markDownstreamDirty(nodeId: string): void {
    const visited = new Set<string>();
    const queue: string[] = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const node = this.graph.getNode(currentId);
      if (node) {
        node.markDirty();

        // Find all nodes connected to this node's outputs
        for (const outputPort of node.outputs.values()) {
          const edges = this.graph.getEdgesFromPort(outputPort);
          for (const edge of edges) {
            queue.push(edge.target.node.id);
          }
        }
      }
    }
  }
}
