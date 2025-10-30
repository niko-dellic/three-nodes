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

    // Header
    const header = document.createElement('div');
    header.classList.add('node-header');

    // Title (editable on click)
    const title = document.createElement('div');
    title.classList.add('node-title');
    title.textContent = node.label;
    title.setAttribute('contenteditable', 'false');
    title.setAttribute('spellcheck', 'false');

    // Make title editable on click
    title.addEventListener('click', (e) => {
      e.stopPropagation();
      if (title.getAttribute('contenteditable') === 'false') {
        this.startEditingTitle(title, node);
      }
    });

    // Handle blur (when clicking away)
    title.addEventListener('blur', () => {
      this.finishEditingTitle(title, node);
    });

    // Handle Enter key to finish editing
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        title.blur(); // This will trigger the blur event which saves the title
      } else if (e.key === 'Escape') {
        e.preventDefault();
        title.textContent = node.label; // Revert to original
        title.blur();
      }
    });

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

    // All nodes now use horizontal flexbox layout
    const hasControls = node instanceof TweakpaneNode;
    const controlHeight = hasControls ? (node as TweakpaneNode).getControlHeight() : 0;

    // Only apply explicit dimensions if custom sizing has been set via resize
    // Otherwise, let flexbox naturally size the content
    if (node.customWidth !== undefined) {
      element.style.width = `${node.customWidth}px`;
    } else {
      element.style.width = ''; // Clear to allow natural sizing
    }

    if (node.customHeight !== undefined) {
      element.style.height = `${node.customHeight}px`;
    } else {
      element.style.height = ''; // Clear to allow natural sizing
    }

    // Check if layout needs to be recreated (only if structure changed)
    // Width is intentionally excluded from signature - resize shouldn't trigger full rebuild
    const portSignature = `flexbox-${node.inputs.size}-${node.outputs.size}-${controlHeight}`;
    const currentSignature = element.dataset.portSignature;

    if (currentSignature !== portSignature) {
      this.rebuildNodeLayout(element, node, controlHeight, hoveringPortId);
      element.dataset.portSignature = portSignature;
    } else {
      // Layout exists, just update hover states and refresh controls if needed
      this.updatePortHoverState(element, hoveringPortId);

      // Refresh Tweakpane to adapt to new dimensions if applicable
      if (hasControls && (node as TweakpaneNode).isTweakpaneInitialized()) {
        const pane = (node as TweakpaneNode).getPaneInstance();
        if (pane) {
          pane.refresh();
        }
      }
    }

    // Add or update resize handle
    this.updateResizeHandle(element, node);

    // Add or update visibility icon (only in 'all' preview mode)
    this.updateVisibilityIcon(element, node);
  }

  private rebuildNodeLayout(
    element: HTMLElement,
    node: Node,
    controlHeight: number,
    hoveringPortId?: string
  ): void {
    const hasControls = node instanceof TweakpaneNode;
    const layoutConfig = node.getLayoutConfig();

    // Dispose existing Tweakpane before clearing DOM (if applicable)
    if (hasControls && (node as TweakpaneNode).isTweakpaneInitialized()) {
      const pane = (node as TweakpaneNode).getPaneInstance();
      if (pane) {
        pane.dispose();
      }
      // Reset the internal state
      (node as any)['pane'] = null;
      (node as any)['container'] = null;
    }

    // Check if this node uses inline-header layout
    if (layoutConfig?.style === 'inline-header') {
      this.buildInlineHeaderLayout(element, node, controlHeight, hoveringPortId, layoutConfig);
      return;
    }

    if (layoutConfig?.style === 'stacked') {
      this.buildStackedLayout(element, node, controlHeight, hoveringPortId, layoutConfig);
      return;
    }

    // Get header and body elements
    const header = element.querySelector('.node-header') as HTMLElement;
    const body = element.querySelector('.node-body') as HTMLElement;
    if (!body) return;

    // Ensure body is visible (remove inline-specific class)
    body.classList.remove('node-body-hidden');

    // Clear existing content
    body.innerHTML = '';

    // Ensure header doesn't have inline-specific class
    if (header) {
      header.classList.remove('node-header-inline');
    }

    // Apply custom body styles if provided
    if (layoutConfig?.bodyStyle) {
      Object.assign(body.style, layoutConfig.bodyStyle);
    }

    // Create flex row container
    const rowContainer = document.createElement('div');
    rowContainer.classList.add('node-layout');

    // Determine if we should show labels
    const showInputLabels = layoutConfig?.showInputLabels !== false; // default true
    const showOutputLabels = layoutConfig?.showOutputLabels !== false; // default true

    // Column 1: Input ports (only create if we have inputs)
    const hasInputs = node.inputs.size > 0;
    let inputColumn: HTMLElement | null = null;

    if (hasInputs && !layoutConfig?.hideInputColumn) {
      inputColumn = document.createElement('div');
      inputColumn.classList.add('input-column');

      // Add input ports to column 1
      for (const port of node.inputs.values()) {
        this.createPortElement(inputColumn, port, 'input', hoveringPortId, showInputLabels);
      }
    }

    // Column 2: Body content (controls or empty space)
    const contentColumn = document.createElement('div');
    contentColumn.classList.add('content-column');
    if (layoutConfig?.contentColumnStyle) {
      Object.assign(contentColumn.style, layoutConfig.contentColumnStyle);
    }

    // Column 3: Output ports (only create if we have outputs)
    const hasOutputs = node.outputs.size > 0;
    let outputColumn: HTMLElement | null = null;

    if (hasOutputs && !layoutConfig?.hideOutputColumn) {
      outputColumn = document.createElement('div');
      outputColumn.classList.add('output-column');

      // Add output ports to column 3
      for (const port of node.outputs.values()) {
        this.createPortElement(outputColumn, port, 'output', hoveringPortId, showOutputLabels);
      }
    }

    // Add content to column 2
    if (hasControls && controlHeight > 0) {
      // Create control element for Tweakpane nodes
      const controlDiv = document.createElement('div');
      controlDiv.classList.add('node-control');
      controlDiv.style.height = `${controlHeight}px`;

      // Apply custom Tweakpane min-width if specified
      if (layoutConfig?.tweakpaneMinWidth !== undefined) {
        controlDiv.style.setProperty(
          '--tweakpane-min-width',
          `${layoutConfig.tweakpaneMinWidth}px`
        );
      }

      // Track interaction for history recording
      controlDiv.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.historyManager.beginInteraction();
      });
      controlDiv.addEventListener('pointermove', (e) => e.stopPropagation());
      controlDiv.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        this.historyManager.endInteraction();
      });
      controlDiv.addEventListener('pointerleave', (e) => {
        if (e.buttons === 0) {
          this.historyManager.endInteraction();
        }
      });
      controlDiv.addEventListener('click', (e) => e.stopPropagation());

      contentColumn.appendChild(controlDiv);

      // Initialize Tweakpane
      if (!(node as TweakpaneNode).isTweakpaneInitialized()) {
        (node as TweakpaneNode).initializeTweakpane(controlDiv);
        this.setupTweakpaneCallback(node as TweakpaneNode);
      }
    }

    // Assemble columns into row (only add columns that exist)
    if (inputColumn) {
      rowContainer.appendChild(inputColumn);
    }
    rowContainer.appendChild(contentColumn);
    if (outputColumn) {
      rowContainer.appendChild(outputColumn);
    }

    body.appendChild(rowContainer);

    // Capture the natural size on first render for minimum resize constraints
    // This ensures we can always shrink back to the original content size
    if (node.minWidth === undefined || node.minHeight === undefined) {
      // Force a layout calculation
      const naturalWidth = element.offsetWidth;
      const naturalHeight = element.offsetHeight;

      // Store these as the minimum sizes
      node.minWidth = naturalWidth;
      node.minHeight = naturalHeight;
    }
  }

  private buildInlineHeaderLayout(
    element: HTMLElement,
    node: Node,
    controlHeight: number,
    hoveringPortId: string | undefined,
    layoutConfig: any
  ): void {
    const hasControls = node instanceof TweakpaneNode;

    // Get header and body elements
    const header = element.querySelector('.node-header') as HTMLElement;
    const body = element.querySelector('.node-body') as HTMLElement;

    if (!header || !body) return;

    // Clear body content and hide it
    body.innerHTML = '';
    body.classList.add('node-body-hidden');

    // Clear header (except title)
    const title = header.querySelector('.node-title');
    header.innerHTML = '';
    if (title) {
      header.appendChild(title);
    }

    // Apply inline header styling via CSS class (after clearing innerHTML)
    if (layoutConfig.headerStyle) {
      // Apply custom header styles only if specified
      Object.assign(header.style, layoutConfig.headerStyle);
    } else {
      // Use CSS class for default inline-header styling
      header.classList.add('node-header-inline');
    }

    // Determine if we should show labels
    const showInputLabels = layoutConfig?.showInputLabels !== false; // default true
    const showOutputLabels = layoutConfig?.showOutputLabels !== false; // default true

    // Add ports to header if not hidden
    if (!layoutConfig.hideInputColumn && node.inputs.size > 0) {
      const inputContainer = document.createElement('div');
      inputContainer.classList.add('inline-port-container');
      for (const port of node.inputs.values()) {
        this.createPortElement(inputContainer, port, 'input', hoveringPortId, showInputLabels);
      }
      header.appendChild(inputContainer);
    }

    // Add controls to header
    if (hasControls && controlHeight > 0) {
      const controlDiv = document.createElement('div');
      controlDiv.classList.add('node-control');
      controlDiv.style.cssText = `flex: 1; height: ${controlHeight}px;`;

      // Apply custom Tweakpane min-width if specified
      if (layoutConfig?.tweakpaneMinWidth !== undefined) {
        controlDiv.style.setProperty(
          '--tweakpane-min-width',
          `${layoutConfig.tweakpaneMinWidth}px`
        );
      }

      // Track interaction for history recording
      controlDiv.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.historyManager.beginInteraction();
      });
      controlDiv.addEventListener('pointermove', (e) => e.stopPropagation());
      controlDiv.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        this.historyManager.endInteraction();
      });
      controlDiv.addEventListener('pointerleave', (e) => {
        if (e.buttons === 0) {
          this.historyManager.endInteraction();
        }
      });
      controlDiv.addEventListener('click', (e) => e.stopPropagation());

      header.appendChild(controlDiv);

      // Initialize Tweakpane
      if (!(node as TweakpaneNode).isTweakpaneInitialized()) {
        (node as TweakpaneNode).initializeTweakpane(controlDiv);
        this.setupTweakpaneCallback(node as TweakpaneNode);
      }
    }

    // Add output ports to header if not hidden
    if (!layoutConfig.hideOutputColumn && node.outputs.size > 0) {
      const outputContainer = document.createElement('div');
      outputContainer.classList.add('inline-port-container');
      for (const port of node.outputs.values()) {
        this.createPortElement(outputContainer, port, 'output', hoveringPortId, showOutputLabels);
      }
      header.appendChild(outputContainer);
    }

    // Capture natural size
    if (node.minWidth === undefined || node.minHeight === undefined) {
      const naturalWidth = element.offsetWidth;
      const naturalHeight = element.offsetHeight;
      node.minWidth = naturalWidth;
      node.minHeight = naturalHeight;
    }
  }

  private buildStackedLayout(
    element: HTMLElement,
    node: Node,
    controlHeight: number,
    hoveringPortId: string | undefined,
    layoutConfig: any
  ): void {
    const hasControls = node instanceof TweakpaneNode;

    // Get header and body elements
    const header = element.querySelector('.node-header') as HTMLElement;
    const body = element.querySelector('.node-body') as HTMLElement;

    if (!header || !body) return;

    // Clear body content
    body.innerHTML = '';
    body.classList.remove('node-body-hidden');

    // Ensure header doesn't have inline-specific class
    if (header) {
      header.classList.remove('node-header-inline');
    }

    // Apply custom body styles if provided
    if (layoutConfig?.bodyStyle) {
      Object.assign(body.style, layoutConfig.bodyStyle);
    }

    // Create vertical stacked container
    const stackedContainer = document.createElement('div');
    stackedContainer.classList.add('node-layout-stacked');

    // Determine if we should show labels
    const showInputLabels = layoutConfig?.showInputLabels !== false; // default true
    const showOutputLabels = layoutConfig?.showOutputLabels !== false; // default true

    // Top section: Controls (if any)
    if (hasControls && controlHeight > 0) {
      const controlDiv = document.createElement('div');
      controlDiv.classList.add('node-control', 'stacked-control');
      controlDiv.style.height = `${controlHeight}px`;

      // Apply custom Tweakpane min-width if specified
      if (layoutConfig?.tweakpaneMinWidth !== undefined) {
        controlDiv.style.setProperty(
          '--tweakpane-min-width',
          `${layoutConfig.tweakpaneMinWidth}px`
        );
      }

      // Track interaction for history recording
      controlDiv.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.historyManager.beginInteraction();
      });
      controlDiv.addEventListener('pointermove', (e) => e.stopPropagation());
      controlDiv.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        this.historyManager.endInteraction();
      });
      controlDiv.addEventListener('pointerleave', (e) => {
        if (e.buttons === 0) {
          this.historyManager.endInteraction();
        }
      });
      controlDiv.addEventListener('click', (e) => e.stopPropagation());

      stackedContainer.appendChild(controlDiv);

      // Initialize Tweakpane
      if (!(node as TweakpaneNode).isTweakpaneInitialized()) {
        (node as TweakpaneNode).initializeTweakpane(controlDiv);
        this.setupTweakpaneCallback(node as TweakpaneNode);
      }
    }

    // Bottom section: Ports row (inputs and outputs)
    const portsRow = document.createElement('div');
    portsRow.classList.add('node-layout', 'stacked-ports-row');

    // Input ports column
    const hasInputs = node.inputs.size > 0;
    let inputColumn: HTMLElement | null = null;

    if (hasInputs && !layoutConfig?.hideInputColumn) {
      inputColumn = document.createElement('div');
      inputColumn.classList.add('input-column');

      for (const port of node.inputs.values()) {
        this.createPortElement(inputColumn, port, 'input', hoveringPortId, showInputLabels);
      }
    }

    // Empty center spacer
    const centerSpacer = document.createElement('div');
    centerSpacer.classList.add('content-column');
    if (layoutConfig?.contentColumnStyle) {
      Object.assign(centerSpacer.style, layoutConfig.contentColumnStyle);
    }

    // Output ports column
    const hasOutputs = node.outputs.size > 0;
    let outputColumn: HTMLElement | null = null;

    if (hasOutputs && !layoutConfig?.hideOutputColumn) {
      outputColumn = document.createElement('div');
      outputColumn.classList.add('output-column');

      for (const port of node.outputs.values()) {
        this.createPortElement(outputColumn, port, 'output', hoveringPortId, showOutputLabels);
      }
    }

    // Assemble ports row
    if (inputColumn) {
      portsRow.appendChild(inputColumn);
    }
    portsRow.appendChild(centerSpacer);
    if (outputColumn) {
      portsRow.appendChild(outputColumn);
    }

    // Add ports row to stacked container
    stackedContainer.appendChild(portsRow);

    // Add stacked container to body
    body.appendChild(stackedContainer);

    // Capture the natural size on first render
    if (node.minWidth === undefined || node.minHeight === undefined) {
      const naturalWidth = element.offsetWidth;
      const naturalHeight = element.offsetHeight;
      node.minWidth = naturalWidth;
      node.minHeight = naturalHeight;
    }
  }

  private createPortElement(
    parent: HTMLElement,
    port: Port,
    side: 'input' | 'output',
    hoveringPortId?: string,
    showLabel: boolean = true
  ): void {
    const isHovering = hoveringPortId === port.id;

    const portContainer = document.createElement('div');
    portContainer.classList.add('port-container', side);

    // Port circle
    const portCircle = document.createElement('div');
    portCircle.classList.add('port');
    portCircle.dataset.portId = port.id;
    portCircle.dataset.portName = port.name;

    // Set dynamic color based on port type
    const baseColor = PORT_COLORS[port.type] || '#6b7280';
    portCircle.style.backgroundColor = baseColor;

    if (isHovering) {
      portCircle.style.transform = 'scale(1.2)';
      portCircle.style.borderColor = '#ffffff';
      portCircle.style.borderWidth = '3px';
      portCircle.style.filter = 'brightness(1.5)';
    }

    portContainer.appendChild(portCircle);

    // Port label (only add if showLabel is true)
    if (showLabel) {
      const label = document.createElement('div');
      label.classList.add('port-label');
      label.textContent = port.name;
      portContainer.appendChild(label);
    }

    // Add file picker button for texture input ports that have no connections
    if (side === 'input' && port.type === PortType.Texture && port.connections.length === 0) {
      this.addFilePickerButton(portContainer, port);
    }

    parent.appendChild(portContainer);
  }

  private startEditingTitle(titleElement: HTMLElement, _node: Node): void {
    titleElement.setAttribute('contenteditable', 'true');
    titleElement.classList.add('editing');
    titleElement.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(titleElement);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  private finishEditingTitle(titleElement: HTMLElement, node: Node): void {
    titleElement.setAttribute('contenteditable', 'false');
    titleElement.classList.remove('editing');

    // Get the new text (trim whitespace)
    const newLabel = titleElement.textContent?.trim() || node.label;

    // Update if changed
    if (newLabel !== node.label && newLabel.length > 0) {
      node.label = newLabel;
      titleElement.textContent = newLabel;

      // Trigger graph change to save state
      this.graph.triggerChange();
    } else {
      // Revert if empty or unchanged
      titleElement.textContent = node.label;
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
    // Update all ports - highlight the drag target port during connection creation
    element.querySelectorAll('.port').forEach((port) => {
      const portEl = port as HTMLElement;
      if (hoveringPortId && portEl.dataset.portId === hoveringPortId) {
        // Highlight as drag target
        portEl.classList.add('port-dragging');
      } else {
        // Remove drag target highlight
        portEl.classList.remove('port-dragging');
      }
    });
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
    loadButton.setAttribute('data-file-picker-button', 'true');
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
      clearButton.setAttribute('data-file-picker-button', 'true');
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

  getPortScreenPosition(portId: string): { x: number; y: number } | null {
    const portElement = this.container.querySelector(`[data-port-id="${portId}"]`) as HTMLElement;
    if (!portElement) return null;

    // Get the port's center position in screen space
    const portRect = portElement.getBoundingClientRect();
    const portCenterX = portRect.left + portRect.width / 2;
    const portCenterY = portRect.top + portRect.height / 2;

    return {
      x: portCenterX,
      y: portCenterY,
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

  private updateResizeHandle(element: HTMLElement, node: Node): void {
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
        // Get current dimensions from element if no custom size is set
        startWidth = node.customWidth ?? element.offsetWidth;
        startHeight = node.customHeight ?? element.offsetHeight;

        // Begin interaction for history
        this.historyManager.beginInteraction();

        handle.setPointerCapture(e.pointerId);
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!isResizing) return;
        e.stopPropagation();

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        // Use the stored natural size as minimum (captured when node was first created)
        // This prevents the resize loop issue while still respecting content boundaries
        const minWidth = node.minWidth ?? 120;
        const minHeight = node.minHeight ?? 60;

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

  private updateVisibilityIcon(element: HTMLElement, node: Node): void {
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
