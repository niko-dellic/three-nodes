import { Graph } from '@/core/Graph';
import { Evaluator } from '@/core/Evaluator';
import { Port } from '@/core/Port';
import { Viewport } from './Viewport';
import { NodeRenderer } from './NodeRenderer';
import { EdgeRenderer } from './EdgeRenderer';
import { InteractionManager } from './InteractionManager';
import { SelectionManager } from './SelectionManager';
import { ContextMenu } from './ContextMenu';
import { ClipboardManager } from './ClipboardManager';
import { HistoryManager } from './HistoryManager';
import { PropertiesPanel } from './PropertiesPanel';
import { NodeRegistry } from '@/three/NodeRegistry';

export class GraphEditor {
  private graph: Graph;
  private evaluator: Evaluator;
  private viewport: Viewport;
  private nodeRenderer: NodeRenderer;
  private edgeRenderer: EdgeRenderer;
  private interactionManager: InteractionManager;
  private selectionManager: SelectionManager;
  private contextMenu: ContextMenu;
  private clipboardManager: ClipboardManager;
  private historyManager: HistoryManager;
  private propertiesPanel: PropertiesPanel;
  private registry: NodeRegistry;

  private svg: SVGSVGElement;
  private transformGroup: SVGGElement;
  private container: HTMLElement;
  private appContainer: HTMLElement;
  private toolbar: HTMLElement;
  private infoOverlay: HTMLElement;
  private animationId: number | null = null;

  constructor(
    container: HTMLElement,
    graph: Graph,
    registry: NodeRegistry,
    appContainer?: HTMLElement
  ) {
    this.container = container;
    this.appContainer = appContainer || container.parentElement || document.body;
    this.graph = graph;
    this.registry = registry;
    this.evaluator = new Evaluator(graph);
    this.viewport = new Viewport();
    this.selectionManager = new SelectionManager(graph);

    // Create SVG for entire graph (edges + nodes)
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('graph-svg');
    container.appendChild(this.svg);

    // Create a transform group that will hold both edges and nodes
    this.transformGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.transformGroup.classList.add('transform-group');
    this.svg.appendChild(this.transformGroup);

    // Initialize history manager first (needed by NodeRenderer)
    this.historyManager = new HistoryManager(graph, registry, this.selectionManager);

    // Initialize renderers - they add their groups to the transform group
    this.edgeRenderer = new EdgeRenderer(this.transformGroup);
    this.nodeRenderer = new NodeRenderer(this.transformGroup, graph, this.historyManager);

    // Initialize context menu
    this.contextMenu = new ContextMenu(container, registry);
    this.contextMenu.onNodeSelectCallback((nodeType, screenX, screenY) => {
      this.addNodeAtScreenPosition(nodeType, screenX, screenY);
    });

    // Initialize clipboard manager
    this.clipboardManager = new ClipboardManager(graph, this.selectionManager, registry);

    // Create toolbar with all controls
    this.toolbar = this.createToolbar();
    this.infoOverlay = this.createInfoOverlay();

    // Initialize properties panel
    this.propertiesPanel = new PropertiesPanel(container);

    // Wire up selection changes to properties panel
    this.selectionManager.onChange(() => {
      const selectedNodes = this.selectionManager.getSelectedNodeObjects();
      this.propertiesPanel.setSelectedNodes(selectedNodes);
    });

    // Initialize interaction
    this.interactionManager = new InteractionManager(
      this.graph,
      this.viewport,
      this.nodeRenderer,
      this.svg,
      this.selectionManager,
      this.contextMenu,
      this.clipboardManager,
      this.historyManager
    );

    // Listen to graph changes
    this.graph.onChange(() => {
      this.evaluator.evaluate();
      this.render();
      // Update data flow in properties panel
      this.propertiesPanel.updateDataFlow();
    });

    // Set up keyboard shortcut for properties panel (T key)
    window.addEventListener('keydown', (e) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        this.propertiesPanel.toggle();
      }
    });

    // Initial render
    this.evaluator.evaluate();
    this.startRenderLoop();

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  private render(): void {
    // Apply viewport transform to SVG
    this.viewport.applyToSVG(this.svg);

    // Get drag connection if any
    const dragState = this.interactionManager.getDragState();
    let dragConnection = undefined;

    if (dragState.type === 'connection') {
      const pos = this.nodeRenderer.getPortWorldPosition(dragState.port.id);
      if (pos) {
        // Get current mouse position from interaction manager
        const currentMouse = this.interactionManager.getCurrentMousePos();
        if (currentMouse) {
          const worldMouse = this.viewport.screenToWorld(currentMouse.x, currentMouse.y);
          dragConnection = {
            startX: pos.x,
            startY: pos.y,
            endX: worldMouse.x,
            endY: worldMouse.y,
          };
        }
      }
    }

    // Render edges (must be before nodes so they appear behind)
    this.edgeRenderer.render(
      this.graph,
      (portId) => this.nodeRenderer.getPortWorldPosition(portId),
      dragConnection
    );

    // Determine which port is being hovered during connection drag
    let hoveringPortId: string | undefined = undefined;
    if (dragState.type === 'connection') {
      const currentMouse = this.interactionManager.getCurrentMousePos();
      if (currentMouse) {
        // Find the element at the current mouse position
        const element = document.elementFromPoint(currentMouse.x, currentMouse.y);
        if (element) {
          // Check if we're hovering over a port
          const portElement = element.classList.contains('port')
            ? element
            : element.closest('.port');
          if (portElement) {
            const portId = portElement.getAttribute('data-port-id');
            if (portId) {
              // Get the port to check compatibility
              const hoverPort = this.findPort(portId);
              if (hoverPort && dragState.port.canConnectTo(hoverPort)) {
                hoveringPortId = portId;
              }
            }
          }
        }
      }
    }

    // Render nodes with selection and hovering port for visual feedback
    this.nodeRenderer.render(this.graph, this.selectionManager.getSelectedNodes(), hoveringPortId);
  }

  private handleResize(): void {
    const rect = this.container.getBoundingClientRect();

    // Update SVG dimensions
    this.svg.setAttribute('width', rect.width.toString());
    this.svg.setAttribute('height', rect.height.toString());
  }

  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';

    // Info button
    const infoButton = document.createElement('button');
    infoButton.className = 'toolbar-button info-button';
    infoButton.textContent = '?';
    infoButton.title = 'Keyboard shortcuts';
    infoButton.addEventListener('click', () => {
      this.infoOverlay.classList.toggle('visible');
    });
    toolbar.appendChild(infoButton);

    // Separator
    const separator1 = document.createElement('div');
    separator1.className = 'toolbar-separator';
    toolbar.appendChild(separator1);

    // This will be populated by ViewModeManager
    const toggleButtonPlaceholder = document.createElement('div');
    toggleButtonPlaceholder.id = 'toggle-button-container';
    toolbar.appendChild(toggleButtonPlaceholder);

    // Separator
    const separator2 = document.createElement('div');
    separator2.className = 'toolbar-separator';
    toolbar.appendChild(separator2);

    // Preview controls section (will be populated by main.ts)
    const previewSection = document.createElement('div');
    previewSection.className = 'toolbar-section preview-controls';
    toolbar.appendChild(previewSection);

    // Separator
    const separator3 = document.createElement('div');
    separator3.className = 'toolbar-separator';
    toolbar.appendChild(separator3);

    // Properties button
    const propertiesButton = document.createElement('button');
    propertiesButton.className = 'toolbar-button';
    propertiesButton.id = 'properties-button';
    propertiesButton.textContent = 'Properties';
    propertiesButton.addEventListener('click', () => {
      this.propertiesPanel.toggle();
    });
    toolbar.appendChild(propertiesButton);

    this.appContainer.appendChild(toolbar);
    return toolbar;
  }

  private createInfoOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'info';
    overlay.innerHTML = `
      <p><strong>Controls:</strong></p>
      <p>Tab - Toggle between editor and 3D view</p>
      <p>T - Toggle properties panel</p>
      <p>Space/Right-click - Context menu</p>
      <p>Ctrl/Cmd+C - Copy selected nodes</p>
      <p>Ctrl/Cmd+X - Cut selected nodes</p>
      <p>Ctrl/Cmd+V - Paste nodes</p>
      <p>Ctrl/Cmd+Z - Undo</p>
      <p>Ctrl/Cmd+Shift+Z / Ctrl/Cmd+Y - Redo</p>
      <p>Ctrl/Cmd+A - Select all</p>
      <p>V - Toggle node visibility (Preview All mode)</p>
      <p>Delete - Remove selected nodes</p>
    `;
    this.appContainer.appendChild(overlay);
    return overlay;
  }

  getToolbar(): HTMLElement {
    return this.toolbar;
  }

  getSelectionManager(): SelectionManager {
    return this.selectionManager;
  }

  setPreviewManager(previewManager: any): void {
    this.nodeRenderer.setPreviewManager(previewManager);
  }

  private findPort(portId: string): Port | null {
    for (const node of this.graph.nodes.values()) {
      for (const port of node.inputs.values()) {
        if (port.id === portId) return port;
      }
      for (const port of node.outputs.values()) {
        if (port.id === portId) return port;
      }
    }
    return null;
  }

  private addNodeAtScreenPosition(nodeType: string, screenX: number, screenY: number): void {
    // Convert screen coordinates to world coordinates
    const worldPos = this.viewport.screenToWorld(screenX, screenY);

    // Create node from registry
    const node = this.registry.createNode(nodeType);
    if (node) {
      node.position = { x: worldPos.x, y: worldPos.y };
      this.graph.addNode(node);
    }
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
  }

  show(): void {
    this.container.style.display = 'block';
  }

  hide(): void {
    this.container.style.display = 'none';
  }
}
