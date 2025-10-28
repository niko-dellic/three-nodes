import { Graph } from '@/core/Graph';
import { Node } from '@/core/Node';
import { Port } from '@/core/Port';
import { PortType } from '@/types';
import { NumberSliderNode } from '@/three/nodes/data/NumberSliderNode';
import { ColorPickerNode } from '@/three/nodes/data/ColorPickerNode';

const PORT_COLORS: Record<PortType, string> = {
  [PortType.Number]: '#3b82f6',
  [PortType.Boolean]: '#ef4444',
  [PortType.String]: '#10b981',
  [PortType.Vector3]: '#8b5cf6',
  [PortType.Color]: '#f59e0b',
  [PortType.Matrix4]: '#ec4899',
  [PortType.Texture]: '#06b6d4',
  [PortType.Geometry]: '#84cc16',
  [PortType.Material]: '#f97316',
  [PortType.Object3D]: '#14b8a6',
  [PortType.Scene]: '#6366f1',
  [PortType.Camera]: '#a855f7',
  [PortType.Light]: '#fbbf24',
  [PortType.Any]: '#6b7280',
};

const CATEGORY_COLORS: Record<string, string> = {
  Data: '#3b82f6',
  Geometry: '#84cc16',
  Material: '#f97316',
  Scene: '#14b8a6',
  Camera: '#a855f7',
  Lights: '#fbbf24',
  Output: '#ef4444',
};

export class NodeRenderer {
  private svg: SVGSVGElement;
  private container: SVGGElement;
  private nodeElements: Map<string, SVGGElement> = new Map();
  private graph: Graph;

  constructor(parentGroup: SVGGElement, graph: Graph) {
    // Store reference to parent for querySelector operations
    this.svg = parentGroup.ownerSVGElement!;
    this.graph = graph;
    this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.container.classList.add('nodes');
    parentGroup.appendChild(this.container);
  }

  render(graph: Graph, selectedNodes: Set<string> = new Set()): void {
    // Remove nodes that no longer exist
    const currentNodeIds = new Set(graph.nodes.keys());
    for (const [id, element] of this.nodeElements) {
      if (!currentNodeIds.has(id)) {
        element.remove();
        this.nodeElements.delete(id);
      }
    }

    // Create or update nodes
    for (const node of graph.nodes.values()) {
      let nodeElement = this.nodeElements.get(node.id);
      if (!nodeElement) {
        nodeElement = this.createNodeElement(node);
        this.container.appendChild(nodeElement);
        this.nodeElements.set(node.id, nodeElement);
      }
      const isSelected = selectedNodes.has(node.id);
      this.updateNodeElement(nodeElement, node, isSelected);
    }
  }

  private createNodeElement(node: Node): SVGGElement {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-node-id', node.id);
    g.classList.add('node');

    // Background
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '200');
    rect.setAttribute('rx', '4');
    rect.classList.add('node-bg');
    g.appendChild(rect);

    // Header
    const header = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    header.setAttribute('width', '200');
    header.setAttribute('height', '30');
    header.setAttribute('rx', '4');
    header.classList.add('node-header');
    g.appendChild(header);

    // Title
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.setAttribute('x', '10');
    title.setAttribute('y', '20');
    title.classList.add('node-title');
    title.textContent = node.label;
    g.appendChild(title);

    return g;
  }

  private updateNodeElement(element: SVGGElement, node: Node, isSelected: boolean = false): void {
    element.setAttribute('transform', `translate(${node.position.x}, ${node.position.y})`);

    // Update selection visual
    if (isSelected) {
      element.classList.add('selected');
    } else {
      element.classList.remove('selected');
    }

    // Check if this node has interactive controls
    const hasControls = node instanceof NumberSliderNode || node instanceof ColorPickerNode;
    const controlHeight = hasControls ? 35 : 0;

    // Calculate height based on ports and controls
    const maxPorts = Math.max(node.inputs.size, node.outputs.size);
    const height = 40 + controlHeight + maxPorts * 25;

    const bg = element.querySelector('.node-bg') as SVGRectElement;
    bg.setAttribute('height', height.toString());

    // Set header color based on category
    const header = element.querySelector('.node-header') as SVGRectElement;
    const category = node.type
      .replace('Node', '')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')[0];
    header.setAttribute('fill', CATEGORY_COLORS[category] || '#6b7280');

    // Add interactive controls if needed
    this.updateInteractiveControls(element, node);

    // Update ports (with offset for controls)
    this.updatePorts(element, node, 40 + controlHeight);
  }

  private updateInteractiveControls(element: SVGGElement, node: Node): void {
    // Remove old controls
    element.querySelectorAll('.node-control').forEach((c) => c.remove());

    if (node instanceof NumberSliderNode) {
      this.createSliderControl(element, node);
    } else if (node instanceof ColorPickerNode) {
      this.createColorPickerControl(element, node);
    }
  }

  private createSliderControl(element: SVGGElement, node: NumberSliderNode): void {
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('x', '10');
    foreignObject.setAttribute('y', '35');
    foreignObject.setAttribute('width', '180');
    foreignObject.setAttribute('height', '30');
    foreignObject.classList.add('node-control');

    // Stop pointer events from propagating to node drag handler
    foreignObject.addEventListener('pointerdown', (e) => e.stopPropagation());
    foreignObject.addEventListener('pointermove', (e) => e.stopPropagation());
    foreignObject.addEventListener('pointerup', (e) => e.stopPropagation());

    const div = document.createElement('div');
    div.style.cssText = 'display: flex; align-items: center; gap: 5px; height: 100%;';

    const input = document.createElement('input');
    input.type = 'range';
    input.min = node.getMin().toString();
    input.max = node.getMax().toString();
    input.step = node.getStep().toString();
    input.value = node.getValue().toString();
    input.style.cssText = 'flex: 1; cursor: pointer;';

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = node.getValue().toFixed(2);
    valueDisplay.style.cssText =
      'color: #ccc; font-size: 11px; min-width: 40px; text-align: right;';

    input.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      node.setValue(value);
      valueDisplay.textContent = value.toFixed(2);
      // Mark downstream nodes as dirty
      this.markDownstreamDirty(node);
      // Trigger graph evaluation to update downstream nodes and Three.js scene
      this.graph.triggerChange();
    });

    div.appendChild(input);
    div.appendChild(valueDisplay);
    foreignObject.appendChild(div);
    element.appendChild(foreignObject);
  }

  private createColorPickerControl(element: SVGGElement, node: ColorPickerNode): void {
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('x', '10');
    foreignObject.setAttribute('y', '35');
    foreignObject.setAttribute('width', '180');
    foreignObject.setAttribute('height', '30');
    foreignObject.classList.add('node-control');

    // Stop pointer events from propagating to node drag handler
    foreignObject.addEventListener('pointerdown', (e) => e.stopPropagation());
    foreignObject.addEventListener('pointermove', (e) => e.stopPropagation());
    foreignObject.addEventListener('pointerup', (e) => e.stopPropagation());
    // Also prevent click from triggering node selection
    foreignObject.addEventListener('click', (e) => e.stopPropagation());

    const div = document.createElement('div');
    div.style.cssText = 'display: flex; align-items: center; gap: 8px; height: 100%;';

    const input = document.createElement('input');
    input.type = 'color';
    input.value = node.getColorHex();
    input.style.cssText =
      'width: 40px; height: 20px; cursor: pointer; border: 1px solid #444; border-radius: 2px;';

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = node.getColorHex().toUpperCase();
    valueDisplay.style.cssText = 'color: #ccc; font-size: 11px; flex: 1;';

    input.addEventListener('input', (e) => {
      const hex = (e.target as HTMLInputElement).value;
      node.setColorFromHex(hex);
      valueDisplay.textContent = hex.toUpperCase();
      // Mark downstream nodes as dirty
      this.markDownstreamDirty(node);
      // Trigger graph evaluation to update downstream nodes and Three.js scene
      this.graph.triggerChange();
    });

    div.appendChild(input);
    div.appendChild(valueDisplay);
    foreignObject.appendChild(div);
    element.appendChild(foreignObject);
  }

  private updatePorts(element: SVGGElement, node: Node, yOffset: number = 40): void {
    // Remove old ports
    element.querySelectorAll('.port').forEach((p) => p.remove());
    element.querySelectorAll('.port-label').forEach((p) => p.remove());

    let inputYOffset = yOffset;

    // Input ports (left side)
    for (const port of node.inputs.values()) {
      this.createPortElement(element, port, 0, inputYOffset, 'input');
      inputYOffset += 25;
    }

    let outputYOffset = yOffset;

    // Output ports (right side)
    for (const port of node.outputs.values()) {
      this.createPortElement(element, port, 200, outputYOffset, 'output');
      outputYOffset += 25;
    }
  }

  private createPortElement(
    parent: SVGGElement,
    port: Port,
    x: number,
    y: number,
    side: 'input' | 'output'
  ): void {
    // Port circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x.toString());
    circle.setAttribute('cy', y.toString());
    circle.setAttribute('r', '6');
    circle.setAttribute('fill', PORT_COLORS[port.type] || '#6b7280');
    circle.setAttribute('data-port-id', port.id);
    circle.setAttribute('data-port-name', port.name);
    circle.classList.add('port');
    parent.appendChild(circle);

    // Port label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('y', (y + 4).toString());
    label.classList.add('port-label');
    label.textContent = port.name;

    if (side === 'input') {
      label.setAttribute('x', '15');
      label.setAttribute('text-anchor', 'start');
    } else {
      label.setAttribute('x', '185');
      label.setAttribute('text-anchor', 'end');
    }

    parent.appendChild(label);
  }

  private markDownstreamDirty(node: Node): void {
    // Get all output ports
    for (const outputPort of node.outputs.values()) {
      // Find all edges connected to this output
      const edges = this.graph.getEdgesFromPort(outputPort);
      for (const edge of edges) {
        // Mark the target node dirty
        edge.target.node.markDirty();
        // Recursively mark downstream nodes
        this.markDownstreamDirty(edge.target.node);
      }
    }
  }

  getPortWorldPosition(portId: string): { x: number; y: number } | null {
    const portElement = this.svg.querySelector(`[data-port-id="${portId}"]`);
    if (!portElement) return null;

    const circle = portElement as SVGCircleElement;
    const cx = parseFloat(circle.getAttribute('cx') || '0');
    const cy = parseFloat(circle.getAttribute('cy') || '0');

    const nodeElement = portElement.closest('.node') as SVGGElement;
    const transform = nodeElement.getAttribute('transform') || '';
    const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);

    if (match) {
      const nodeX = parseFloat(match[1]);
      const nodeY = parseFloat(match[2]);
      return { x: nodeX + cx, y: nodeY + cy };
    }

    return { x: cx, y: cy };
  }

  // Get port element for a given port ID
  getPortElement(portId: string): SVGCircleElement | null {
    return this.svg.querySelector(`[data-port-id="${portId}"]`) as SVGCircleElement | null;
  }

  getNodeAt(_x: number, _y: number): Node | null {
    // This is simplified - in production you'd do proper hit testing
    return null;
  }
}
