import { Graph } from '@/core/Graph';
import { Edge } from '@/core/Edge';

export class EdgeRenderer {
  private edgesGroup: SVGGElement;
  private edgeElements: Map<string, SVGPathElement> = new Map();
  private dragConnectionElement: SVGPathElement | null = null;

  constructor(parentLayer: HTMLElement) {
    // Create a group for edges (rendered behind nodes)
    // For now, create SVG inside the HTML container (will be replaced with LeaderLine)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;
    this.edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.edgesGroup.classList.add('edges');
    svg.appendChild(this.edgesGroup);
    parentLayer.appendChild(svg);
  }

  render(
    graph: Graph,
    getPortPosition: (portId: string) => { x: number; y: number } | null,
    dragConnection?: { startX: number; startY: number; endX: number; endY: number }
  ): void {
    // Remove edges that no longer exist
    const currentEdgeIds = new Set(graph.edges.keys());
    for (const [id, element] of this.edgeElements) {
      if (!currentEdgeIds.has(id)) {
        element.remove();
        this.edgeElements.delete(id);
      }
    }

    // Create or update edges
    for (const edge of graph.edges.values()) {
      this.renderEdge(edge, getPortPosition);
    }

    // Render drag connection
    if (dragConnection) {
      this.renderDragConnection(
        dragConnection.startX,
        dragConnection.startY,
        dragConnection.endX,
        dragConnection.endY
      );
    } else if (this.dragConnectionElement) {
      this.dragConnectionElement.remove();
      this.dragConnectionElement = null;
    }
  }

  private renderEdge(
    edge: Edge,
    getPortPosition: (portId: string) => { x: number; y: number } | null
  ): void {
    const sourcePos = getPortPosition(edge.source.id);
    const targetPos = getPortPosition(edge.target.id);

    if (!sourcePos || !targetPos) return;

    let pathElement = this.edgeElements.get(edge.id);

    // Check if target port has multiple connections (array connection)
    const isArrayConnection = edge.target.hasMultipleConnections();

    if (!pathElement) {
      pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElement.classList.add('edge');
      pathElement.setAttribute('fill', 'none');
      this.edgesGroup.appendChild(pathElement);
      this.edgeElements.set(edge.id, pathElement);
    }

    // Update styling based on whether it's an array connection
    if (isArrayConnection) {
      pathElement.classList.add('edge-array');
      pathElement.setAttribute('stroke', '#f97316');
      pathElement.setAttribute('stroke-width', '4');
    } else {
      pathElement.classList.remove('edge-array');
      pathElement.setAttribute('stroke', '#888');
      pathElement.setAttribute('stroke-width', '2');
    }

    const pathData = this.createBezierPath(sourcePos.x, sourcePos.y, targetPos.x, targetPos.y);
    pathElement.setAttribute('d', pathData);
  }

  private renderDragConnection(startX: number, startY: number, endX: number, endY: number): void {
    if (!this.dragConnectionElement) {
      this.dragConnectionElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this.dragConnectionElement.classList.add('drag-connection');
      this.dragConnectionElement.setAttribute('fill', 'none');
      this.dragConnectionElement.setAttribute('stroke', '#4a9eff');
      this.dragConnectionElement.setAttribute('stroke-width', '2');
      this.edgesGroup.appendChild(this.dragConnectionElement);
    }

    const pathData = this.createBezierPath(startX, startY, endX, endY);
    this.dragConnectionElement.setAttribute('d', pathData);
  }

  private createBezierPath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = Math.abs(x2 - x1);
    const offset = Math.min(dx * 0.5, 100);

    // Create cubic bezier path
    const cp1x = x1 + offset;
    const cp1y = y1;
    const cp2x = x2 - offset;
    const cp2y = y2;

    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  }
}
