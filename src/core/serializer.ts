import { Graph } from './Graph';
import { SerializedGraph, SerializedNode, SerializedEdge } from './types';

const CURRENT_VERSION = '1.0.0';

export function serializeGraph(graph: Graph): SerializedGraph {
  const nodes: SerializedNode[] = [];
  const edges: SerializedEdge[] = [];

  // Serialize nodes
  for (const node of graph.nodes.values()) {
    const inputs: Record<string, never> = {};

    // Store input default values (serialization would need custom logic for complex types)
    for (const [name, port] of node.inputs) {
      if (port.defaultValue !== undefined && typeof port.defaultValue !== 'object') {
        inputs[name] = port.defaultValue as never;
      }
    }

    // Serialize properties
    const properties: Record<string, any> = {};
    for (const [name, property] of node.properties) {
      properties[name] = property.value;
    }

    const serializedNode: SerializedNode = {
      id: node.id,
      type: node.type,
      label: node.label,
      position: { ...node.position },
      inputs,
    };

    // Include properties if any exist
    if (Object.keys(properties).length > 0) {
      serializedNode.properties = properties;
    }

    // Include custom dimensions if set
    if (node.customWidth !== undefined) {
      serializedNode.customWidth = node.customWidth;
    }
    if (node.customHeight !== undefined) {
      serializedNode.customHeight = node.customHeight;
    }

    nodes.push(serializedNode);
  }

  // Serialize edges
  for (const edge of graph.edges.values()) {
    edges.push({
      id: edge.id,
      sourceNodeId: edge.source.node.id,
      sourcePortName: edge.source.name,
      targetNodeId: edge.target.node.id,
      targetPortName: edge.target.name,
    });
  }

  return {
    version: CURRENT_VERSION,
    nodes,
    edges,
  };
}

export function serializeGraphToJSON(graph: Graph): string {
  return JSON.stringify(serializeGraph(graph), null, 2);
}
