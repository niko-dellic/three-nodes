import { Graph } from './Graph';
import { SerializedGraph } from './types';
import { NodeRegistry } from '@/three/NodeRegistry';

export function deserializeGraph(data: SerializedGraph, registry: NodeRegistry): Graph {
  const graph = new Graph();

  // Version check and migration would go here
  if (data.version !== '1.0.0') {
    console.warn(`Graph version ${data.version} may need migration`);
  }

  // Create nodes
  for (const nodeData of data.nodes) {
    const node = registry.createNode(nodeData.type, nodeData.id);
    if (node) {
      node.label = nodeData.label;
      node.position = nodeData.position;

      // Restore custom dimensions if set
      if (nodeData.customWidth !== undefined) {
        node.customWidth = nodeData.customWidth;
      }
      if (nodeData.customHeight !== undefined) {
        node.customHeight = nodeData.customHeight;
      }

      // Restore properties if they exist
      if (nodeData.properties) {
        for (const [name, value] of Object.entries(nodeData.properties)) {
          node.setProperty(name, value);
        }
      }

      // Set input default values
      for (const [name, value] of Object.entries(nodeData.inputs)) {
        const port = node.inputs.get(name);
        if (port && value !== undefined) {
          port.value = value;
        }
      }

      graph.addNode(node);
    } else {
      console.warn(`Unknown node type: ${nodeData.type}`);
    }
  }

  // Create edges
  for (const edgeData of data.edges) {
    const sourceNode = graph.getNode(edgeData.sourceNodeId);
    const targetNode = graph.getNode(edgeData.targetNodeId);

    if (sourceNode && targetNode) {
      const sourcePort = sourceNode.outputs.get(edgeData.sourcePortName);
      const targetPort = targetNode.inputs.get(edgeData.targetPortName);

      if (sourcePort && targetPort) {
        graph.connect(sourcePort, targetPort);
      }
    }
  }

  return graph;
}

export function deserializeGraphFromJSON(json: string, registry: NodeRegistry): Graph {
  const data = JSON.parse(json) as SerializedGraph;
  return deserializeGraph(data, registry);
}
