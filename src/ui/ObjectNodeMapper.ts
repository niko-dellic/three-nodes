import * as THREE from 'three';
import { Graph } from '@/core/Graph';
import { Node } from '@/core/Node';
import { Vector3Node } from '@/three/nodes/data/Vector3Node';

/**
 * Maps Object3D instances to their source nodes and finds related transform nodes
 * Helps synchronize 3D viewport transformations back to the node graph
 */
export class ObjectNodeMapper {
  private graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  /**
   * Get the source node ID from an object's userData
   */
  getSourceNodeId(object: THREE.Object3D): string | null {
    return object.userData.sourceNodeId || null;
  }

  /**
   * Get the source node from an object
   */
  getSourceNode(object: THREE.Object3D): Node | null {
    const nodeId = this.getSourceNodeId(object);
    if (!nodeId) return null;
    return this.graph.getNode(nodeId) ?? null;
  }

  /**
   * Find transform-related nodes in the graph that affect this object
   * Returns TransformNode and its connected Vector3 nodes
   */
  findTransformNodes(object: THREE.Object3D): {
    transformNode?: Node;
    positionNode?: Node;
    rotationNode?: Node;
    scaleNode?: Node;
    positionVector3Node?: Vector3Node;
    rotationVector3Node?: Vector3Node;
    scaleVector3Node?: Vector3Node;
  } {
    const sourceNode = this.getSourceNode(object);
    if (!sourceNode) {
      return {};
    }

    const result: {
      transformNode?: Node;
      positionNode?: Node;
      rotationNode?: Node;
      scaleNode?: Node;
      positionVector3Node?: Vector3Node;
      rotationVector3Node?: Vector3Node;
      scaleVector3Node?: Vector3Node;
    } = {};

    // Search upstream from the source node to find transform nodes
    const visited = new Set<string>();
    const queue: Node[] = [sourceNode];

    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      if (visited.has(currentNode.id)) continue;
      visited.add(currentNode.id);

      // Check if this is a transform node
      if (currentNode.type === 'TransformNode') {
        result.transformNode = currentNode;
        // Find connected Vector3Nodes on the position, rotation, and scale inputs
        const positionInput = currentNode.inputs.get('position');
        if (positionInput && positionInput.connections.length > 0) {
          const edge = positionInput.connections[0];
          const sourceNode = this.graph.getNode(edge.source.node.id);
          if (sourceNode && sourceNode.type === 'Vector3Node') {
            result.positionVector3Node = sourceNode as Vector3Node;
          }
        }
        
        const rotationInput = currentNode.inputs.get('rotation');
        if (rotationInput && rotationInput.connections.length > 0) {
          const edge = rotationInput.connections[0];
          const sourceNode = this.graph.getNode(edge.source.node.id);
          if (sourceNode && sourceNode.type === 'Vector3Node') {
            result.rotationVector3Node = sourceNode as Vector3Node;
          }
        }
        
        const scaleInput = currentNode.inputs.get('scale');
        if (scaleInput && scaleInput.connections.length > 0) {
          const edge = scaleInput.connections[0];
          const sourceNode = this.graph.getNode(edge.source.node.id);
          if (sourceNode && sourceNode.type === 'Vector3Node') {
            result.scaleVector3Node = sourceNode as Vector3Node;
          }
        }
      } else if (currentNode.type === 'PositionNode') {
        result.positionNode = currentNode;
        // Find connected Vector3Node on the position input
        const positionInput = currentNode.inputs.get('position');
        if (positionInput && positionInput.connections.length > 0) {
          const edge = positionInput.connections[0];
          const sourceNode = this.graph.getNode(edge.source.node.id);
          if (sourceNode && sourceNode.type === 'Vector3Node') {
            result.positionVector3Node = sourceNode as Vector3Node;
          }
        }
      } else if (currentNode.type === 'RotationNode') {
        result.rotationNode = currentNode;
        // Find connected Vector3Node on the rotation input
        const rotationInput = currentNode.inputs.get('rotation');
        if (rotationInput && rotationInput.connections.length > 0) {
          const edge = rotationInput.connections[0];
          const sourceNode = this.graph.getNode(edge.source.node.id);
          if (sourceNode && sourceNode.type === 'Vector3Node') {
            result.rotationVector3Node = sourceNode as Vector3Node;
          }
        }
      } else if (currentNode.type === 'ScaleNode') {
        result.scaleNode = currentNode;
        // Find connected Vector3Node on the scale input
        const scaleInput = currentNode.inputs.get('scale');
        if (scaleInput && scaleInput.connections.length > 0) {
          const edge = scaleInput.connections[0];
          const sourceNode = this.graph.getNode(edge.source.node.id);
          if (sourceNode && sourceNode.type === 'Vector3Node') {
            result.scaleVector3Node = sourceNode as Vector3Node;
          }
        }
      } else if (currentNode.type === 'Object3DNode') {
        // Object3DNode has position/rotation/scale inputs, check for Vector3Nodes
        const positionInput = currentNode.inputs.get('position');
        if (positionInput && positionInput.connections.length > 0) {
          const edge = positionInput.connections[0];
          const sourceNode = this.graph.getNode(edge.source.node.id);
          if (sourceNode && sourceNode.type === 'Vector3Node') {
            result.positionVector3Node = sourceNode as Vector3Node;
          }
        }
        const rotationInput = currentNode.inputs.get('rotation');
        if (rotationInput && rotationInput.connections.length > 0) {
          const edge = rotationInput.connections[0];
          const sourceNode = this.graph.getNode(edge.source.node.id);
          if (sourceNode && sourceNode.type === 'Vector3Node') {
            result.rotationVector3Node = sourceNode as Vector3Node;
          }
        }
        const scaleInput = currentNode.inputs.get('scale');
        if (scaleInput && scaleInput.connections.length > 0) {
          const edge = scaleInput.connections[0];
          const sourceNode = this.graph.getNode(edge.source.node.id);
          if (sourceNode && sourceNode.type === 'Vector3Node') {
            result.scaleVector3Node = sourceNode as Vector3Node;
          }
        }
      }

      // Add upstream nodes to the queue (nodes that feed into this node)
      for (const input of currentNode.inputs.values()) {
        for (const edge of input.connections) {
          const upstreamNode = this.graph.getNode(edge.source.node.id);
          if (upstreamNode && !visited.has(upstreamNode.id)) {
            queue.push(upstreamNode);
          }
        }
      }
    }

    return result;
  }

  /**
   * Update the graph nodes to match the object's current transform
   * Returns true if any nodes were updated
   */
  syncTransformToNodes(object: THREE.Object3D): boolean {
    const transformNodes = this.findTransformNodes(object);
    let updated = false;

    // Update position
    if (transformNodes.positionVector3Node) {
      transformNodes.positionVector3Node.setVector(
        object.position.x,
        object.position.y,
        object.position.z
      );
      updated = true;
    }

    // Update rotation (convert to radians if needed)
    if (transformNodes.rotationVector3Node) {
      transformNodes.rotationVector3Node.setVector(
        object.rotation.x,
        object.rotation.y,
        object.rotation.z
      );
      updated = true;
    }

    // Update scale
    if (transformNodes.scaleVector3Node) {
      transformNodes.scaleVector3Node.setVector(object.scale.x, object.scale.y, object.scale.z);
      updated = true;
    }

    // If we updated any nodes, trigger graph evaluation
    if (updated) {
      this.graph.triggerChange();
    }

    return updated;
  }

  /**
   * Check if an object has associated transform nodes that can be updated
   */
  hasTransformNodes(object: THREE.Object3D): boolean {
    const transformNodes = this.findTransformNodes(object);
    return !!(
      transformNodes.positionVector3Node ||
      transformNodes.rotationVector3Node ||
      transformNodes.scaleVector3Node
    );
  }
}
