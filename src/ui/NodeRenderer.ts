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

export class NodeRenderer {
  private container: HTMLElement;
  private nodeElements: Map<string, HTMLElement> = new Map();
  private graph: Graph;
  private historyManager: HistoryManager;
  private previewManager: any = null; // Will be set later to avoid circular dependency
  private previewMode: string = 'none';

  constructor(parentLayer: HTMLElement, graph: Graph, historyManager: HistoryManager) {
    this.container = parentLayer;
    this.graph = graph;
    this.historyManager = historyManager;
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

  private createNodeElement(node: Node): HTMLElement {
    // Create main node container
    const nodeDiv = document.createElement('div');
    nodeDiv.dataset.nodeId = node.id;
    nodeDiv.classList.add('node');
    nodeDiv.style.position = 'absolute';
    nodeDiv.style.width = '200px';

    // Header
    const header = document.createElement('div');
    header.classList.add('node-header');

    // Title
    const title = document.createElement('div');
    title.classList.add('node-title');
    title.textContent = node.label;
    header.appendChild(title);

    nodeDiv.appendChild(header);

    // Body container for controls and ports
    const body = document.createElement('div');
    body.classList.add('node-body');
    nodeDiv.appendChild(body);

    return nodeDiv;
  }

  private updateNodeElement(
    element: HTMLElement,
    node: Node,
    isSelected: boolean = false,
    hoveringPortId?: string
  ): void {
    // Position using CSS transform
    element.style.transform = `translate(${node.position.x}px, ${node.position.y}px)`;

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

    // Update width and height
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;

    // Add interactive controls if needed
    this.updateInteractiveControls(element, node, width);

    // Check if ports need to be recreated (only if structure changed)
    const portSignature = `${node.inputs.size}-${node.outputs.size}-${width}-${controlHeight}`;
    const currentSignature = element.dataset.portSignature;

    if (currentSignature !== portSignature) {
      // Ports structure changed, recreate them
      this.updatePorts(element, node, 40 + controlHeight, width, hoveringPortId);
      element.dataset.portSignature = portSignature;
    } else {
      // Just update hover state without recreating DOM
      this.updatePortHoverState(element, hoveringPortId);
    }

    // Add or update resize handle
    this.updateResizeHandle(element, node, width, height);

    // Add or update visibility icon (only in 'all' preview mode)
    this.updateVisibilityIcon(element, node, width);
  }

  private updateInteractiveControls(element: HTMLElement, node: Node, width: number): void {
    if (node instanceof TweakpaneNode) {
      // Check if control already exists
      let controlElement = element.querySelector('.node-control') as HTMLElement;

      if (!controlElement) {
        // Create new control only if it doesn't exist
        this.createTweakpaneControl(element, node, width);
      } else {
        // Update width of existing control
        controlElement.style.width = `${width - 20}px`;

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

  private createTweakpaneControl(element: HTMLElement, node: TweakpaneNode, width: number): void {
    const controlHeight = node.getControlHeight();

    // Create a simple div for the control (no more foreignObject!)
    const controlDiv = document.createElement('div');
    controlDiv.classList.add('node-control');
    controlDiv.style.cssText = `
      width: ${width - 20}px;
      height: ${controlHeight}px;
      padding: 5px 10px;
    `;

    // Track interaction for history recording
    controlDiv.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      // Begin interaction - suppress history recording until pointerup
      this.historyManager.beginInteraction();
    });

    controlDiv.addEventListener('pointermove', (e) => e.stopPropagation());

    controlDiv.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      // End interaction - record history if changes occurred
      this.historyManager.endInteraction();
    });

    // Also handle case where pointer leaves while dragging
    controlDiv.addEventListener('pointerleave', (e) => {
      // Only end interaction if button is not pressed (not mid-drag)
      if (e.buttons === 0) {
        this.historyManager.endInteraction();
      }
    });

    controlDiv.addEventListener('click', (e) => e.stopPropagation());

    // Add to node body
    const body = element.querySelector('.node-body');
    if (body) {
      body.appendChild(controlDiv);
    }

    // Initialize Tweakpane with the container (only if not already initialized)
    if (!node.isTweakpaneInitialized()) {
      node.initializeTweakpane(controlDiv);

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

  private updatePortHoverState(element: HTMLElement, hoveringPortId?: string): void {
    // Update all ports - apply hover state to the hovered port, reset others
    element.querySelectorAll('.port').forEach((port) => {
      const portEl = port as HTMLElement;
      if (hoveringPortId && portEl.dataset.portId === hoveringPortId) {
        // Apply hover state
        portEl.style.transform = 'scale(1.2)';
        portEl.style.borderColor = '#ffffff';
        portEl.style.borderWidth = '3px';
        portEl.style.filter = 'brightness(1.5)';
      } else {
        // Reset to default state
        portEl.style.transform = '';
        portEl.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        portEl.style.borderWidth = '2px';
        portEl.style.filter = '';
      }
    });
  }

  private updatePorts(
    element: HTMLElement,
    node: Node,
    yOffset: number = 40,
    width: number = 200,
    hoveringPortId?: string
  ): void {
    // Remove old ports and file picker buttons
    element.querySelectorAll('.port-container').forEach((p) => p.remove());

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
    parent: HTMLElement,
    port: Port,
    _x: number,
    y: number,
    side: 'input' | 'output',
    _width: number = 200,
    hoveringPortId?: string
  ): void {
    // Determine if this specific port is being hovered over
    const isHovering = hoveringPortId === port.id;

    // Create port container
    const portContainer = document.createElement('div');
    portContainer.classList.add('port-container');
    portContainer.style.cssText = `
      position: absolute;
      top: ${y - 6}px;
      ${side === 'input' ? 'left: -6px;' : `right: -6px;`}
      display: flex;
      align-items: center;
      ${side === 'input' ? 'flex-direction: row;' : 'flex-direction: row-reverse;'}
      gap: 5px;
    `;

    // Port circle (div with border-radius)
    const portCircle = document.createElement('div');
    portCircle.classList.add('port');
    portCircle.dataset.portId = port.id;
    portCircle.dataset.portName = port.name;

    // Get base color
    const baseColor = PORT_COLORS[port.type] || '#6b7280';

    portCircle.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: ${baseColor};
      border: 2px solid rgba(255, 255, 255, 0.3);
      cursor: crosshair;
      transition: all 0.15s ease;
      position: relative;
      z-index: 10;
    `;

    // Apply visual feedback for hovered port
    if (isHovering) {
      portCircle.style.transform = 'scale(1.2)';
      portCircle.style.borderColor = '#ffffff';
      portCircle.style.borderWidth = '3px';
      portCircle.style.filter = 'brightness(1.5)';
    }

    portContainer.appendChild(portCircle);

    // Port label
    const label = document.createElement('div');
    label.classList.add('port-label');
    label.textContent = port.name;
    label.style.cssText = `
      color: #ccc;
      font-size: 11px;
      user-select: none;
      pointer-events: none;
      white-space: nowrap;
    `;

    portContainer.appendChild(label);

    // Add file picker button for texture input ports that have no connections
    if (side === 'input' && port.type === PortType.Texture && port.connections.length === 0) {
      this.addFilePickerButton(portContainer, port);
    }

    parent.appendChild(portContainer);
  }

  private addFilePickerButton(parent: HTMLElement, port: Port): void {
    const node = port.node;
    const hasTexture =
      typeof (node as any).hasLoadedTexture === 'function'
        ? (node as any).hasLoadedTexture(port.name)
        : false;

    // Create container for buttons (simple HTML, no foreignObject!)
    const container = document.createElement('div');
    container.classList.add('file-picker-button-container');
    container.style.cssText = `
      display: flex;
      gap: 2px;
      align-items: center;
    `;

    // Create load/folder button
    const loadButton = document.createElement('div');
    const folderIcon = document.createElement('i');
    folderIcon.className = 'ph ph-folder';
    folderIcon.style.pointerEvents = 'none';
    loadButton.appendChild(folderIcon);
    loadButton.className = 'port-file-picker-button';
    loadButton.title = `Load ${port.name} texture`;
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
      clearIcon.style.pointerEvents = 'none';
      clearButton.appendChild(clearIcon);
      clearButton.className = 'port-file-picker-button';
      clearButton.title = `Clear ${port.name} texture`;
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

    parent.appendChild(container);
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
    const portElement = this.container.querySelector(`[data-port-id="${portId}"]`) as HTMLElement;
    if (!portElement) return null;

    // Get node element and extract its world position
    const nodeElement = portElement.closest('.node') as HTMLElement | null;
    if (!nodeElement) return null;

    const transform = nodeElement.style.transform;
    const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);

    if (!match) return null;

    const nodeX = parseFloat(match[1]);
    const nodeY = parseFloat(match[2]);

    // Get port container to read its position from CSS
    const portContainer = portElement.parentElement as HTMLElement | null;
    if (!portContainer) return null;

    // Parse the port container's CSS position (set in createPortElement)
    // Port container has style: top: Ypx and left/right: -6px
    const topMatch = portContainer.style.top.match(/([-\d.]+)px/);
    if (!topMatch) return null;

    const portY = parseFloat(topMatch[1]);

    // Determine if it's an input (left side) or output (right side) port
    // Inputs are at left: -6px, outputs are at right: -6px
    const isInput = portContainer.style.left !== '';

    let portX: number;
    if (isInput) {
      // Input port is on the left edge (x = 0, but port circle center is at x = 6)
      portX = 6; // Half of port circle width (12px)
    } else {
      // Output port is on the right edge
      const nodeWidth = parseFloat(nodeElement.style.width || '200');
      portX = nodeWidth - 6; // Right edge minus half port width
    }

    return {
      x: nodeX + portX,
      y: nodeY + portY + 6, // +6 to get center of 12px port circle
    };
  }

  // Get port element for a given port ID
  getPortElement(portId: string): HTMLElement | null {
    return this.container.querySelector(`[data-port-id="${portId}"]`) as HTMLElement | null;
  }

  getNodeAt(_x: number, _y: number): Node | null {
    // This is simplified - in production you'd do proper hit testing
    return null;
  }

  private updateResizeHandle(
    element: HTMLElement,
    node: Node,
    width: number,
    height: number
  ): void {
    const handleClass = 'resize-handle';
    let handle = element.querySelector(`.${handleClass}`) as HTMLElement;

    if (!handle) {
      // Create corner resize handle (triangle div in bottom-right corner)
      handle = document.createElement('div');
      handle.classList.add(handleClass);
      handle.style.cssText = `
        position: absolute;
        bottom: 0;
        right: 0;
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 0 0 12px 12px;
        border-color: transparent transparent rgba(255, 255, 255, 0.2) transparent;
        cursor: nwse-resize;
      `;

      // Add hover effect
      handle.addEventListener('mouseenter', () => {
        handle.style.borderColor = 'transparent transparent rgba(255, 255, 255, 0.4) transparent';
      });
      handle.addEventListener('mouseleave', () => {
        handle.style.borderColor = 'transparent transparent rgba(255, 255, 255, 0.2) transparent';
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

    // Handle is positioned via CSS (bottom: 0, right: 0) so no need to update position
    // The triangle shape is created via CSS borders
  }

  private updateVisibilityIcon(element: HTMLElement, node: Node, _width: number): void {
    const iconClass = 'visibility-icon';
    let icon = element.querySelector(`.${iconClass}`) as HTMLElement;

    // Only show visibility icon when preview mode is 'all'
    if (this.previewMode !== 'all') {
      // Remove icon if it exists
      if (icon) {
        icon.remove();
      }
      return;
    }

    if (!icon) {
      // Create visibility icon using Phosphor icon font
      icon = document.createElement('div');
      icon.classList.add(iconClass);
      icon.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        cursor: pointer;
        transition: background 0.2s;
        pointer-events: auto;
        z-index: 10;
      `;

      const iconElement = document.createElement('i');
      iconElement.classList.add('ph');
      iconElement.style.cssText = `
        font-size: 16px;
        color: #ffffff;
        pointer-events: none;
      `;
      icon.appendChild(iconElement);

      // Hover effects
      icon.addEventListener('mouseenter', () => {
        icon.style.background = 'rgba(255, 255, 255, 0.2)';
      });
      icon.addEventListener('mouseleave', () => {
        icon.style.background = 'rgba(255, 255, 255, 0.1)';
      });

      // Click to toggle visibility
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.previewManager) {
          this.previewManager.toggleNodeVisibility(node.id);
        }
      });

      // Prevent dragging when clicking icon
      icon.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });

      element.appendChild(icon);
    }

    // Update visibility state
    const isVisible = !this.previewManager || this.previewManager.isNodeVisible(node.id);
    const iconElement = icon.querySelector('i');
    if (iconElement) {
      // Use Phosphor icon classes for eye / eye-slash
      if (isVisible) {
        iconElement.className = 'ph ph-eye';
        iconElement.style.color = '#ffffff';
      } else {
        iconElement.className = 'ph ph-eye-slash';
        iconElement.style.color = '#ef4444';
      }
    }
  }
}
