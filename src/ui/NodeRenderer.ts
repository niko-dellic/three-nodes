import { Graph } from '@/core/Graph';
import { Node } from '@/core/Node';
import { Port } from '@/core/Port';
import { PortType } from '@/types';
import { TweakpaneNode } from '@/three/TweakpaneNode';
import { HistoryManager } from './HistoryManager';

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
  [PortType.Point2D]: '#d946ef',
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
  private historyManager: HistoryManager;
  private previewManager: any = null; // Will be set later to avoid circular dependency
  private previewMode: string = 'none';

  constructor(parentGroup: SVGGElement, graph: Graph, historyManager: HistoryManager) {
    // Store reference to parent for querySelector operations
    this.svg = parentGroup.ownerSVGElement!;
    this.graph = graph;
    this.historyManager = historyManager;
    this.container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.container.classList.add('nodes');
    parentGroup.appendChild(this.container);
  }

  setPreviewManager(previewManager: any): void {
    this.previewManager = previewManager;
    // Listen to preview mode changes
    if (previewManager) {
      previewManager.onChange(() => {
        this.previewMode = previewManager.getPreviewMode();
        // Re-render nodes to update visibility icons
        this.render(this.graph);
      });
    }
  }

  render(graph: Graph, selectedNodes: Set<string> = new Set(), hoveringPortId?: string): void {
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
      this.updateNodeElement(nodeElement, node, isSelected, hoveringPortId);
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

  private updateNodeElement(
    element: SVGGElement,
    node: Node,
    isSelected: boolean = false,
    hoveringPortId?: string
  ): void {
    element.setAttribute('transform', `translate(${node.position.x}, ${node.position.y})`);

    // Update selection visual
    if (isSelected) {
      element.classList.add('selected');
    } else {
      element.classList.remove('selected');
    }

    // Check if this node has interactive controls (is a TweakpaneNode)
    const hasControls = node instanceof TweakpaneNode;
    const controlHeight = hasControls ? (node as TweakpaneNode).getControlHeight() + 10 : 0; // +10 for padding

    // Calculate dimensions based on ports and controls (or use custom dimensions if set)
    const maxPorts = Math.max(node.inputs.size, node.outputs.size);
    const calculatedHeight = 40 + controlHeight + maxPorts * 25;
    const calculatedWidth = 200; // Default node width

    const width = node.customWidth ?? calculatedWidth;
    const height = node.customHeight ?? calculatedHeight;

    const bg = element.querySelector('.node-bg') as SVGRectElement;
    bg.setAttribute('width', width.toString());
    bg.setAttribute('height', height.toString());

    // Set header color and width based on category
    const header = element.querySelector('.node-header') as SVGRectElement;
    header.setAttribute('width', width.toString());
    const category = node.type
      .replace('Node', '')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')[0];
    header.setAttribute('fill', CATEGORY_COLORS[category] || '#6b7280');

    // Add interactive controls if needed
    this.updateInteractiveControls(element, node, width);

    // Update ports (with offset for controls)
    this.updatePorts(element, node, 40 + controlHeight, width, hoveringPortId);

    // Add or update resize handle
    this.updateResizeHandle(element, node, width, height);

    // Add or update visibility icon (only in 'all' preview mode)
    this.updateVisibilityIcon(element, node, width);
  }

  private updateInteractiveControls(element: SVGGElement, node: Node, width: number): void {
    if (node instanceof TweakpaneNode) {
      // Check if control already exists
      let controlElement = element.querySelector('.node-control');

      if (!controlElement) {
        // Create new control only if it doesn't exist
        this.createTweakpaneControl(element, node, width);
      } else {
        // Update width of existing control
        controlElement.setAttribute('width', (width - 20).toString());

        // Just refresh the existing Tweakpane if it's initialized
        if (node.isTweakpaneInitialized()) {
          const pane = node.getPaneInstance();
          if (pane) {
            pane.refresh();
          }
        }
      }
    } else {
      // Remove controls for non-Tweakpane nodes
      element.querySelectorAll('.node-control').forEach((c) => c.remove());
    }
  }

  private createTweakpaneControl(element: SVGGElement, node: TweakpaneNode, width: number): void {
    const controlHeight = node.getControlHeight();

    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('x', '10');
    foreignObject.setAttribute('y', '35');
    foreignObject.setAttribute('width', (width - 20).toString()); // width - padding
    foreignObject.setAttribute('height', controlHeight.toString());
    foreignObject.classList.add('node-control');

    // Track interaction for history recording
    foreignObject.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      // Begin interaction - suppress history recording until pointerup
      this.historyManager.beginInteraction();
    });

    foreignObject.addEventListener('pointermove', (e) => e.stopPropagation());

    foreignObject.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      // End interaction - record history if changes occurred
      this.historyManager.endInteraction();
    });

    // Also handle case where pointer leaves while dragging
    foreignObject.addEventListener('pointerleave', (e) => {
      // Only end interaction if button is not pressed (not mid-drag)
      if (e.buttons === 0) {
        this.historyManager.endInteraction();
      }
    });

    foreignObject.addEventListener('click', (e) => e.stopPropagation());

    const div = document.createElement('div');
    div.style.cssText = 'width: 100%; height: 100%;';

    foreignObject.appendChild(div);
    element.appendChild(foreignObject);

    // Initialize Tweakpane with the container (only if not already initialized)
    if (!node.isTweakpaneInitialized()) {
      node.initializeTweakpane(div);

      // Set up the callback for graph updates (only once)
      this.setupTweakpaneCallback(node);
    }
  }

  private setupTweakpaneCallback(node: TweakpaneNode): void {
    // Store the original onTweakpaneChange to call downstream updates
    const originalOnChange = node['onTweakpaneChange'].bind(node);

    // Override with our version that includes graph updates
    node['onTweakpaneChange'] = (callback?: () => void) => {
      // Call original (which marks node dirty)
      originalOnChange(callback);

      // Mark downstream nodes as dirty
      this.markDownstreamDirty(node);

      // Trigger graph evaluation
      this.graph.triggerChange();
    };
  }

  private updatePorts(
    element: SVGGElement,
    node: Node,
    yOffset: number = 40,
    width: number = 200,
    hoveringPortId?: string
  ): void {
    // Remove old ports and file picker buttons
    element.querySelectorAll('.port').forEach((p) => p.remove());
    element.querySelectorAll('.port-label').forEach((p) => p.remove());
    element.querySelectorAll('.file-picker-button-container').forEach((p) => p.remove());

    let inputYOffset = yOffset;

    // Input ports (left side)
    for (const port of node.inputs.values()) {
      this.createPortElement(element, port, 0, inputYOffset, 'input', width, hoveringPortId);
      inputYOffset += 25;
    }

    let outputYOffset = yOffset;

    // Output ports (right side)
    for (const port of node.outputs.values()) {
      this.createPortElement(element, port, width, outputYOffset, 'output', width, hoveringPortId);
      outputYOffset += 25;
    }
  }

  private createPortElement(
    parent: SVGGElement,
    port: Port,
    x: number,
    y: number,
    side: 'input' | 'output',
    width: number = 200,
    hoveringPortId?: string
  ): void {
    // Determine if this specific port is being hovered over
    const isHovering = hoveringPortId === port.id;

    // Port circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x.toString());
    circle.setAttribute('cy', y.toString());
    circle.setAttribute('r', '6');

    // Get base color
    const baseColor = PORT_COLORS[port.type] || '#6b7280';

    // Apply visual feedback for hovered port
    if (isHovering) {
      // Brighten the color and add outline for hovered port
      circle.setAttribute('fill', this.brightenColor(baseColor, 1.5));
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('filter', 'brightness(1.5)');
    } else {
      circle.setAttribute('fill', baseColor);
    }

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
      label.setAttribute('x', (width - 15).toString());
      label.setAttribute('text-anchor', 'end');
    }

    parent.appendChild(label);

    // Add file picker button for texture input ports that have no connections
    if (side === 'input' && port.type === PortType.Texture && port.connections.length === 0) {
      this.addFilePickerButton(parent, port, y, width);
    }
  }

  private addFilePickerButton(parent: SVGGElement, port: Port, y: number, width: number): void {
    const node = port.node;
    const hasTexture =
      typeof (node as any).hasLoadedTexture === 'function'
        ? (node as any).hasLoadedTexture(port.name)
        : false;

    // Create a foreignObject to embed HTML buttons
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('x', (width - (hasTexture ? 58 : 40)).toString());
    foreignObject.setAttribute('y', (y - 8).toString());
    foreignObject.setAttribute('width', hasTexture ? '44' : '20');
    foreignObject.setAttribute('height', '16');
    foreignObject.setAttribute('data-file-picker-button', 'true');
    foreignObject.classList.add('file-picker-button-container'); // Add class for cleanup
    foreignObject.style.pointerEvents = 'auto';

    // Create container for buttons
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      gap: 2px;
      align-items: center;
    `;

    // Create load/folder button
    const loadButton = document.createElement('div');
    const folderIcon = document.createElement('i');
    folderIcon.className = 'ph ph-folder';
    folderIcon.setAttribute('data-file-picker-button', 'true');
    folderIcon.style.pointerEvents = 'none';
    loadButton.appendChild(folderIcon);
    loadButton.className = 'port-file-picker-button';
    loadButton.title = `Load ${port.name} texture`;
    loadButton.setAttribute('data-file-picker-button', 'true');
    loadButton.style.cssText = `
      width: 18px;
      height: 16px;
      padding: 0;
      font-size: 12px;
      border: 1px solid ${hasTexture ? '#4ade80' : '#555'};
      background: ${hasTexture ? '#166534' : '#2a2a2a'};
      color: ${hasTexture ? '#4ade80' : '#999'};
      border-radius: 3px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      position: relative;
      z-index: 1000;
    `;

    loadButton.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.handleFilePickerClick(port);
    });

    loadButton.addEventListener('mouseenter', () => {
      if (hasTexture) {
        loadButton.style.background = '#15803d';
        loadButton.style.color = '#86efac';
      } else {
        loadButton.style.background = '#3a3a3a';
        loadButton.style.color = '#fff';
      }
    });

    loadButton.addEventListener('mouseleave', () => {
      if (hasTexture) {
        loadButton.style.background = '#166534';
        loadButton.style.color = '#4ade80';
      } else {
        loadButton.style.background = '#2a2a2a';
        loadButton.style.color = '#999';
      }
    });

    container.appendChild(loadButton);

    // Add clear button if texture is loaded
    if (hasTexture) {
      const clearButton = document.createElement('div');
      const clearIcon = document.createElement('i');
      clearIcon.className = 'ph ph-x';
      clearIcon.setAttribute('data-file-picker-button', 'true');
      clearIcon.style.pointerEvents = 'none';
      clearButton.appendChild(clearIcon);
      clearButton.className = 'port-file-picker-button';
      clearButton.title = `Clear ${port.name} texture`;
      clearButton.setAttribute('data-file-picker-button', 'true');
      clearButton.style.cssText = `
        width: 18px;
        height: 16px;
        padding: 0;
        font-size: 10px;
        border: 1px solid #555;
        background: #2a2a2a;
        color: #999;
        border-radius: 3px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        position: relative;
        z-index: 1000;
      `;

      clearButton.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.handleClearTexture(port);
      });

      clearButton.addEventListener('mouseenter', () => {
        clearButton.style.background = '#7f1d1d';
        clearButton.style.color = '#fca5a5';
      });

      clearButton.addEventListener('mouseleave', () => {
        clearButton.style.background = '#2a2a2a';
        clearButton.style.color = '#999';
      });

      container.appendChild(clearButton);
    }

    foreignObject.appendChild(container);
    parent.appendChild(foreignObject);
  }

  private handleFilePickerClick(port: Port): void {
    const node = port.node;

    // Check if node has a getFilePicker method
    if (typeof (node as any).getFilePicker === 'function') {
      const picker = (node as any).getFilePicker(port.name);
      if (picker && typeof picker.openFilePicker === 'function') {
        picker.openFilePicker();
      }
    }
  }

  private handleClearTexture(port: Port): void {
    const node = port.node;

    // Check if node has a getFilePicker method
    if (typeof (node as any).getFilePicker === 'function') {
      const picker = (node as any).getFilePicker(port.name);
      if (picker && typeof (picker as any).clearFile === 'function') {
        (picker as any).clearFile();
        // The node's clearTexture method will call graph.triggerChange()
        // which will trigger a re-render and update the buttons
      }
    }
  }

  private brightenColor(hex: string, factor: number): string {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Brighten
    const newR = Math.min(255, Math.floor(r * factor));
    const newG = Math.min(255, Math.floor(g * factor));
    const newB = Math.min(255, Math.floor(b * factor));

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
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

  private updateResizeHandle(
    element: SVGGElement,
    node: Node,
    width: number,
    height: number
  ): void {
    const handleClass = 'resize-handle';
    let handle = element.querySelector(`.${handleClass}`) as SVGPathElement;

    if (!handle) {
      // Create corner resize handle (triangle shape)
      handle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      handle.classList.add(handleClass);
      handle.setAttribute('fill', 'rgba(255, 255, 255, 0.2)');
      handle.setAttribute('cursor', 'nwse-resize');

      // Add hover effect
      handle.addEventListener('mouseenter', () => {
        handle.setAttribute('fill', 'rgba(255, 255, 255, 0.4)');
      });
      handle.addEventListener('mouseleave', () => {
        handle.setAttribute('fill', 'rgba(255, 255, 255, 0.2)');
      });

      // Set up resize drag handlers
      let startX = 0;
      let startY = 0;
      let startWidth = 0;
      let startHeight = 0;
      let isResizing = false;

      const onPointerDown = (e: PointerEvent) => {
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = node.customWidth ?? width;
        startHeight = node.customHeight ?? height;

        // Begin interaction for history
        this.historyManager.beginInteraction();

        handle.setPointerCapture(e.pointerId);
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!isResizing) return;
        e.stopPropagation();

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        // Calculate minimum dimensions based on node content
        const hasControls = node instanceof TweakpaneNode;
        const controlHeight = hasControls ? (node as TweakpaneNode).getControlHeight() + 10 : 0;
        const maxPorts = Math.max(node.inputs.size, node.outputs.size);

        // Minimum height: header + controls + all ports
        const minHeight = 40 + controlHeight + maxPorts * 25;
        // Minimum width: enough for controls and port labels
        const minWidth = 150;

        const newWidth = Math.max(minWidth, startWidth + deltaX);
        const newHeight = Math.max(minHeight, startHeight + deltaY);

        node.customWidth = newWidth;
        node.customHeight = newHeight;

        // Update visually - trigger full re-render for proper port positioning
        this.graph.triggerChange();
      };

      const onPointerUp = (e: PointerEvent) => {
        if (!isResizing) return;
        e.stopPropagation();
        isResizing = false;

        // End interaction for history
        this.historyManager.endInteraction();

        handle.releasePointerCapture(e.pointerId);
      };

      handle.addEventListener('pointerdown', onPointerDown);
      handle.addEventListener('pointermove', onPointerMove);
      handle.addEventListener('pointerup', onPointerUp);
      handle.addEventListener('pointercancel', onPointerUp);

      element.appendChild(handle);
    }

    // Update handle position and shape (bottom-right corner triangle)
    const handleSize = 12;
    const path = `M ${width} ${height - handleSize} L ${width} ${height} L ${width - handleSize} ${height} Z`;
    handle.setAttribute('d', path);
  }

  private updateVisibilityIcon(element: SVGGElement, node: Node, width: number): void {
    const iconClass = 'visibility-icon';
    let icon = element.querySelector(`.${iconClass}`) as SVGGElement;

    // Only show visibility icon when preview mode is 'all'
    if (this.previewMode !== 'all') {
      // Remove icon if it exists
      if (icon) {
        icon.remove();
      }
      return;
    }

    if (!icon) {
      // Create visibility icon group
      icon = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      icon.classList.add(iconClass);
      icon.setAttribute('cursor', 'pointer');

      // Create circle background
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', '8');
      circle.setAttribute('fill', 'rgba(255, 255, 255, 0.1)');
      circle.classList.add('visibility-bg');
      icon.appendChild(circle);

      // Create eye icon (using path for better control)
      const eyePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      eyePath.classList.add('eye-path');
      eyePath.setAttribute('stroke', '#ffffff');
      eyePath.setAttribute('stroke-width', '1.5');
      eyePath.setAttribute('fill', 'none');
      icon.appendChild(eyePath);

      // Add pupil (small circle)
      const pupil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pupil.classList.add('eye-pupil');
      pupil.setAttribute('r', '1.5');
      pupil.setAttribute('fill', '#ffffff');
      icon.appendChild(pupil);

      // Add slash for "hidden" state
      const slash = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      slash.classList.add('eye-slash');
      slash.setAttribute('x1', '-6');
      slash.setAttribute('y1', '-6');
      slash.setAttribute('x2', '6');
      slash.setAttribute('y2', '6');
      slash.setAttribute('stroke', '#ef4444');
      slash.setAttribute('stroke-width', '2');
      slash.setAttribute('stroke-linecap', 'round');
      slash.setAttribute('opacity', '0');
      icon.appendChild(slash);

      // Hover effects
      icon.addEventListener('mouseenter', () => {
        circle.setAttribute('fill', 'rgba(255, 255, 255, 0.2)');
      });
      icon.addEventListener('mouseleave', () => {
        circle.setAttribute('fill', 'rgba(255, 255, 255, 0.1)');
      });

      // Click to toggle visibility
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.previewManager) {
          this.previewManager.toggleNodeVisibility(node.id);
        }
      });

      element.appendChild(icon);
    }

    // Position icon in top-right corner of node
    icon.setAttribute('transform', `translate(${width - 20}, 15)`);

    // Update visibility state
    const isVisible = !this.previewManager || this.previewManager.isNodeVisible(node.id);
    const slash = icon.querySelector('.eye-slash') as SVGLineElement;
    const eyePath = icon.querySelector('.eye-path') as SVGPathElement;
    const pupil = icon.querySelector('.eye-pupil') as SVGCircleElement;

    if (isVisible) {
      // Show eye (no slash)
      slash.setAttribute('opacity', '0');
      eyePath.setAttribute('d', 'M -5 0 Q -5 -3 0 -3 Q 5 -3 5 0 Q 5 3 0 3 Q -5 3 -5 0');
      pupil.setAttribute('cx', '0');
      pupil.setAttribute('cy', '0');
    } else {
      // Show eye with slash
      slash.setAttribute('opacity', '1');
      eyePath.setAttribute('d', 'M -5 0 Q -5 -3 0 -3 Q 5 -3 5 0 Q 5 3 0 3 Q -5 3 -5 0');
      pupil.setAttribute('cx', '0');
      pupil.setAttribute('cy', '0');
    }
  }
}
