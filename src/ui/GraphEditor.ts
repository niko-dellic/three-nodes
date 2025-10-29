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
import { SaveLoadManager } from './SaveLoadManager';
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
  private saveLoadManager: SaveLoadManager;
  private registry: NodeRegistry;

  private svg: SVGSVGElement;
  private transformGroup: SVGGElement;
  private container: HTMLElement;
  private appContainer: HTMLElement;
  private toolbar: HTMLElement;
  private infoOverlay: HTMLElement;
  private fullscreenButton: HTMLButtonElement | null = null;
  private collapseButton: HTMLButtonElement | null = null;
  private animationId: number | null = null;

  constructor(
    container: HTMLElement,
    graph: Graph,
    registry: NodeRegistry,
    appContainer?: HTMLElement
  ) {
    this.preventDefaultZoom();

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

    // Initialize save/load manager
    this.saveLoadManager = new SaveLoadManager(graph, registry);

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

    // Set up keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Properties panel (T key)
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        this.propertiesPanel.toggle();
      }

      // Collapse toolbar (H key)
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        this.collapseButton?.click();
      }

      // Fullscreen (F key)
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        this.fullscreenButton?.click();
      }

      // Save (Ctrl/Cmd+S)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveLoadManager.showSaveDialog();
      }
    });

    // Initial render
    this.evaluator.evaluate();
    this.startRenderLoop();

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  private preventDefaultZoom(): void {
    // Prevent default pinch zoom on the entire page (Safari gesture events)
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    document.addEventListener('gestureend', (e) => e.preventDefault());

    // Prevent pinch zoom via touch events (for touch devices)
    // The canvas handles its own zoom via wheel events in InteractionManager
    document.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 2) {
          e.preventDefault(); // Prevent pinch zoom
        }
      },
      { passive: false }
    );

    // Prevent browser zoom via Ctrl+wheel (Chrome/Firefox on trackpad pinch)
    // But allow it on the canvas (handled by InteractionManager)
    document.addEventListener(
      'wheel',
      (e) => {
        if (e.ctrlKey || e.metaKey) {
          // Check if the event target is within the graph SVG canvas
          const target = e.target as Element;
          const isCanvas = target.closest('.graph-svg') || target.closest('svg.graph-svg');

          if (!isCanvas) {
            // Prevent browser zoom on non-canvas elements
            e.preventDefault();
          }
        }
      },
      { passive: false }
    );
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  private render(): void {
    // Update viewport damping
    this.viewport.update();

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

    // Group 1: Utility controls (Collapse, Info, Fullscreen)
    const utilityGroup = document.createElement('div');
    utilityGroup.className = 'toolbar-button-group';

    // Collapse/expand button
    this.collapseButton = document.createElement('button');
    this.collapseButton.className = 'toolbar-button collapse-button';
    this.collapseButton.innerHTML = '<i class="ph ph-caret-left"></i>';
    this.collapseButton.title = 'Collapse toolbar (H)';

    // Load collapsed state from localStorage
    const savedCollapsedState = localStorage.getItem('toolbar-collapsed');
    let isCollapsed = savedCollapsedState === 'true';

    // Function to update toolbar collapsed state
    const setCollapsedState = (collapsed: boolean) => {
      isCollapsed = collapsed;
      if (isCollapsed) {
        toolbar.classList.add('collapsed');
        this.collapseButton!.innerHTML = '<i class="ph ph-caret-right"></i>';
        this.collapseButton!.title = 'Expand toolbar (H)';
      } else {
        toolbar.classList.remove('collapsed');
        this.collapseButton!.innerHTML = '<i class="ph ph-caret-left"></i>';
        this.collapseButton!.title = 'Collapse toolbar (H)';
      }
      // Save state to localStorage
      localStorage.setItem('toolbar-collapsed', String(isCollapsed));
    };

    this.collapseButton.addEventListener('click', () => {
      setCollapsedState(!isCollapsed);
    });
    utilityGroup.appendChild(this.collapseButton);

    // Apply saved state after toolbar is fully constructed
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      if (savedCollapsedState === 'true') {
        setCollapsedState(true);
      }
    }, 0);

    // Info button
    const infoButton = document.createElement('button');
    infoButton.className = 'toolbar-button info-button';
    infoButton.textContent = '?';
    infoButton.title = 'Keyboard shortcuts';
    infoButton.addEventListener('click', () => {
      this.infoOverlay.classList.toggle('visible');
    });
    utilityGroup.appendChild(infoButton);

    // Fullscreen button (only show if fullscreen is supported)
    // iOS Safari doesn't support fullscreen API, so we detect and hide on unsupported devices
    const supportsFullscreen =
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled;

    if (supportsFullscreen) {
      this.fullscreenButton = document.createElement('button');
      this.fullscreenButton.className = 'toolbar-button fullscreen-button';
      this.fullscreenButton.innerHTML = '<i class="ph ph-arrows-out"></i>';
      this.fullscreenButton.title = 'Toggle fullscreen (F)';

      const updateFullscreenIcon = () => {
        if (document.fullscreenElement) {
          this.fullscreenButton!.innerHTML = '<i class="ph ph-arrows-in"></i>';
        } else {
          this.fullscreenButton!.innerHTML = '<i class="ph ph-arrows-out"></i>';
        }
      };

      this.fullscreenButton.addEventListener('click', async () => {
        try {
          if (!document.fullscreenElement) {
            // Try standard and prefixed versions
            const docEl = document.documentElement as any;
            if (docEl.requestFullscreen) {
              await docEl.requestFullscreen();
            } else if (docEl.webkitRequestFullscreen) {
              await docEl.webkitRequestFullscreen();
            } else if (docEl.mozRequestFullScreen) {
              await docEl.mozRequestFullScreen();
            } else if (docEl.msRequestFullscreen) {
              await docEl.msRequestFullscreen();
            }
          } else {
            // Try standard and prefixed exit methods
            const doc = document as any;
            if (doc.exitFullscreen) {
              await doc.exitFullscreen();
            } else if (doc.webkitExitFullscreen) {
              await doc.webkitExitFullscreen();
            } else if (doc.mozCancelFullScreen) {
              await doc.mozCancelFullScreen();
            } else if (doc.msExitFullscreen) {
              await doc.msExitFullscreen();
            }
          }
        } catch (err) {
          console.warn('Fullscreen not supported or denied:', err);
        }
      });

      // Listen for fullscreen changes (e.g., pressing ESC to exit)
      // Support multiple event names for different browsers
      document.addEventListener('fullscreenchange', updateFullscreenIcon);
      document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
      document.addEventListener('mozfullscreenchange', updateFullscreenIcon);
      document.addEventListener('MSFullscreenChange', updateFullscreenIcon);

      utilityGroup.appendChild(this.fullscreenButton);
    }

    toolbar.appendChild(utilityGroup);

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

    // Group 2: File operations (Save, Load)
    const fileOpsGroup = document.createElement('div');
    fileOpsGroup.className = 'toolbar-button-group';

    // Save button
    const saveButton = document.createElement('button');
    saveButton.className = 'toolbar-button';
    saveButton.title = 'Save graph (Ctrl/Cmd+S)';
    saveButton.innerHTML = '<i class="ph ph-floppy-disk"></i>';
    saveButton.addEventListener('click', () => {
      this.saveLoadManager.showSaveDialog();
    });
    fileOpsGroup.appendChild(saveButton);

    // Load button
    const loadButton = document.createElement('button');
    loadButton.className = 'toolbar-button';
    loadButton.title = 'Load graph';
    loadButton.innerHTML = '<i class="ph ph-folder-open"></i>';
    loadButton.addEventListener('click', () => {
      this.saveLoadManager.showLoadModal();
    });
    fileOpsGroup.appendChild(loadButton);

    toolbar.appendChild(fileOpsGroup);

    // Separator
    const separator4 = document.createElement('div');
    separator4.className = 'toolbar-separator';
    toolbar.appendChild(separator4);

    // Group 3: Editor controls (Add node)
    const editorGroup = document.createElement('div');
    editorGroup.className = 'toolbar-button-group';

    // Add node button with plus icon
    const addNodeButton = document.createElement('button');
    addNodeButton.className = 'toolbar-button add-node-button';
    addNodeButton.title = 'Add node (Space or Right-click)';
    addNodeButton.innerHTML = '<i class="ph ph-plus"></i>';
    addNodeButton.addEventListener('click', (e) => {
      // Stop propagation to prevent the context menu's click-outside handler from closing it
      e.stopPropagation();
      // Get the button's position on screen
      const rect = addNodeButton.getBoundingClientRect();
      // Show context menu below the button
      this.contextMenu.show(rect.left, rect.bottom + 5);
    });
    editorGroup.appendChild(addNodeButton);

    toolbar.appendChild(editorGroup);

    // Properties button (outside group so it stays visible when collapsed)
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

    // Build controls list, conditionally including fullscreen if supported
    const controls = [
      '<p><strong>Controls:</strong></p>',
      '<p>Tab - Toggle between editor and 3D view</p>',
      '<p>T - Toggle properties panel</p>',
      '<p>H - Collapse/expand toolbar</p>',
    ];

    // Only show fullscreen shortcut if fullscreen button exists
    if (this.fullscreenButton) {
      controls.push('<p>F - Toggle fullscreen</p>');
    }

    controls.push(
      '<p>Space/Right-click - Context menu</p>',
      '<p>Ctrl/Cmd+S - Save graph</p>',
      '<p>Ctrl/Cmd+C - Copy selected nodes</p>',
      '<p>Ctrl/Cmd+X - Cut selected nodes</p>',
      '<p>Ctrl/Cmd+V - Paste nodes</p>',
      '<p>Ctrl/Cmd+Z - Undo</p>',
      '<p>Ctrl/Cmd+Shift+Z / Ctrl/Cmd+Y - Redo</p>',
      '<p>Ctrl/Cmd+A - Select all</p>',
      '<p>V - Toggle node visibility (Preview All mode)</p>',
      '<p>Delete - Remove selected nodes</p>'
    );

    overlay.innerHTML = controls.join('');
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
