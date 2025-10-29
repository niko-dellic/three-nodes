import { Graph } from '@/core/Graph';
import { Edge } from '@/core/Edge';
import * as d3 from 'd3';

interface EdgeSVG {
  svg: SVGSVGElement;
  path: SVGPathElement;
}

export class EdgeRendererHTML {
  private container: HTMLElement;
  private edgeSVGs: Map<string, EdgeSVG> = new Map();
  private dragSVG: EdgeSVG | null = null;

  constructor(parentLayer: HTMLElement) {
    this.container = parentLayer;
  }

  render(
    graph: Graph,
    getPortPosition: (portId: string) => { x: number; y: number } | null,
    dragConnection?: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      shiftPressed?: boolean;
    }
  ): void {
    // Remove edges that no longer exist
    const currentEdgeIds = new Set(graph.edges.keys());
    for (const [id, edgeSVG] of this.edgeSVGs) {
      if (!currentEdgeIds.has(id)) {
        edgeSVG.svg.remove();
        this.edgeSVGs.delete(id);
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
        dragConnection.endY,
        dragConnection.shiftPressed || false
      );
    } else if (this.dragSVG) {
      this.dragSVG.svg.remove();
      this.dragSVG = null;
    }
  }

  // Calculate bounding box for two points with padding
  private calculateBoundingBox(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    padding: number = 20
  ): { x: number; y: number; width: number; height: number } {
    const minX = Math.min(x1, x2) - padding;
    const minY = Math.min(y1, y2) - padding;
    const maxX = Math.max(x1, x2) + padding;
    const maxY = Math.max(y1, y2) + padding;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  // Generate smooth bezier curve path (coordinates relative to bounding box origin)
  private createBezierPath(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    bbox: { x: number; y: number; width: number; height: number }
  ): string {
    // Convert world coordinates to SVG-local coordinates
    const localX1 = x1 - bbox.x;
    const localY1 = y1 - bbox.y;
    const localX2 = x2 - bbox.x;
    const localY2 = y2 - bbox.y;

    const dx = localX2 - localX1;

    // Calculate control points for horizontal flow (left to right)
    const distance = Math.abs(dx);
    const controlPointOffset = Math.min(distance / 2, 150);

    const cp1x = localX1 + controlPointOffset;
    const cp1y = localY1;
    const cp2x = localX2 - controlPointOffset;
    const cp2y = localY2;

    // Create cubic bezier curve
    return `M ${localX1},${localY1} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${localX2},${localY2}`;
  }

  private renderEdge(
    edge: Edge,
    getPortPosition: (portId: string) => { x: number; y: number } | null
  ): void {
    const sourcePos = getPortPosition(edge.source.id);
    const targetPos = getPortPosition(edge.target.id);

    if (!sourcePos || !targetPos) return;

    // Check if target port has multiple connections (array connection)
    const isArrayConnection = edge.target.hasMultipleConnections();
    const color = isArrayConnection ? '#f97316' : '#888';
    const strokeWidth = isArrayConnection ? 4 : 2;

    // Debug logging
    if (isArrayConnection) {
      console.log(
        `Edge ${edge.id}: Array connection detected! Color: ${color}, Width: ${strokeWidth}, Connections: ${edge.target.connections.length}`
      );
    }

    // Calculate bounding box for this edge
    const bbox = this.calculateBoundingBox(sourcePos.x, sourcePos.y, targetPos.x, targetPos.y);

    let edgeSVG = this.edgeSVGs.get(edge.id);

    if (!edgeSVG) {
      // Create new SVG element for this edge
      const svg = d3
        .create('svg')
        .attr('class', 'edge-svg')
        .attr('data-edge-id', edge.id)
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('overflow', 'visible')
        .node() as SVGSVGElement;

      // Create path within the SVG
      const path = d3
        .select(svg)
        .append('path')
        .attr('class', 'edge')
        .attr('fill', 'none')
        .attr('stroke-linecap', 'round')
        .node() as SVGPathElement;

      // Set stroke using inline style to override CSS
      path.style.stroke = color;
      path.style.strokeWidth = `${strokeWidth}px`;

      edgeSVG = { svg, path };
      this.edgeSVGs.set(edge.id, edgeSVG);
      this.container.appendChild(svg);
    } else {
      // Update existing path styling using inline styles (overrides CSS)
      edgeSVG.path.style.stroke = color;
      edgeSVG.path.style.strokeWidth = `${strokeWidth}px`;
      console.log(`Updated edge ${edge.id}: stroke=${color}, width=${strokeWidth}`);
    }

    // Update SVG position and size using direct style manipulation
    edgeSVG.svg.style.left = `${bbox.x}px`;
    edgeSVG.svg.style.top = `${bbox.y}px`;
    edgeSVG.svg.setAttribute('width', String(bbox.width));
    edgeSVG.svg.setAttribute('height', String(bbox.height));

    // Update path data (relative to SVG's bounding box) using setAttribute
    const pathData = this.createBezierPath(
      sourcePos.x,
      sourcePos.y,
      targetPos.x,
      targetPos.y,
      bbox
    );
    edgeSVG.path.setAttribute('d', pathData);
  }

  private renderDragConnection(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    shiftPressed: boolean
  ): void {
    // Calculate bounding box for drag connection
    const bbox = this.calculateBoundingBox(startX, startY, endX, endY);

    // Determine color based on shift key state
    const dragColor = shiftPressed ? '#fb923c' : '#4a9eff'; // Light orange if shift, blue otherwise

    // Debug logging
    console.log(`Drag connection: shiftPressed=${shiftPressed}, color=${dragColor}`);

    if (!this.dragSVG) {
      // Create new SVG element for drag connection
      const svg = d3
        .create('svg')
        .attr('class', 'edge-svg edge-drag-svg')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('overflow', 'visible')
        .node() as SVGSVGElement;

      // Create path within the SVG
      const path = d3
        .select(svg)
        .append('path')
        .attr('class', 'edge edge-drag')
        .attr('fill', 'none')
        .attr('stroke-linecap', 'round')
        .attr('stroke-dasharray', '5,5')
        .node() as SVGPathElement;

      // Set stroke using inline style to override CSS
      path.style.stroke = dragColor;
      path.style.strokeWidth = '2px';

      this.dragSVG = { svg, path };
      this.container.appendChild(svg);
    } else {
      // Update stroke color based on shift state using inline style
      this.dragSVG.path.style.stroke = dragColor;
      console.log(`Updated drag path: stroke=${dragColor}`);
    }

    // Update SVG position and size using direct style manipulation
    this.dragSVG.svg.style.left = `${bbox.x}px`;
    this.dragSVG.svg.style.top = `${bbox.y}px`;
    this.dragSVG.svg.setAttribute('width', String(bbox.width));
    this.dragSVG.svg.setAttribute('height', String(bbox.height));

    // Update drag path (relative to SVG's bounding box) using setAttribute
    const pathData = this.createBezierPath(startX, startY, endX, endY, bbox);
    this.dragSVG.path.setAttribute('d', pathData);
  }

  // Update all line positions (called when nodes move or zoom changes)
  // Note: With D3, positions are updated directly in render()
  updatePositions(): void {
    // No-op for D3 implementation - positions are updated in render()
  }

  // Clean up all lines
  dispose(): void {
    for (const edgeSVG of this.edgeSVGs.values()) {
      edgeSVG.svg.remove();
    }
    this.edgeSVGs.clear();

    if (this.dragSVG) {
      this.dragSVG.svg.remove();
      this.dragSVG = null;
    }
  }
}
