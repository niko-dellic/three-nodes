import { Graph } from '@/core/Graph';
import { Evaluator } from '@/core/Evaluator';
import { Port } from '@/core/Port';
import { Viewport } from './Viewport';
import { NodeRenderer } from './NodeRenderer';
import { EdgeRendererHTML } from './EdgeRendererHTML';
import { InteractionManager } from './InteractionManager';
import { SelectionManager } from './SelectionManager';
import { ContextMenu } from './ContextMenu';
import { ClipboardManager } from './ClipboardManager';
import { HistoryManager } from './HistoryManager';
import { PropertiesPanel } from './PropertiesPanel';
import { SaveLoadManager } from './SaveLoadManager';
import { NodeRegistry } from '@/three/NodeRegistry';
import { CustomNodeCreator } from './CustomNodeCreator';
import { CustomNodeManager } from '@/three/CustomNodeManager';
import { AutoLayoutManager } from './AutoLayoutManager';
import { Pane } from 'tweakpane';

export class GraphEditor {
  private graph: Graph;
  private evaluator: Evaluator;
  private viewport: Viewport;
  private nodeRenderer: NodeRenderer;
  private edgeRenderer: EdgeRendererHTML;
  private interactionManager: InteractionManager;
  private selectionManager: SelectionManager;
  private contextMenu: ContextMenu;
  private clipboardManager: ClipboardManager;
  private historyManager: HistoryManager;
  private propertiesPanel: PropertiesPanel;
  private saveLoadManager: SaveLoadManager;
  private registry: NodeRegistry;
  private customNodeManager: CustomNodeManager;
  private customNodeCreator: CustomNodeCreator;
  private autoLayoutManager: AutoLayoutManager;
  private autoLayoutPane: Pane | null = null;
  private autoLayoutPaneContainer: HTMLElement | null = null;

  private graphContainer: HTMLElement; // Main graph canvas container
  private backgroundLayer: HTMLElement;
  private edgesLayer: HTMLElement;
  private nodesLayer: HTMLElement;
  private overlayLayer: HTMLElement;
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

    // Create HTML container structure for graph
    this.graphContainer = document.createElement('div');
    this.graphContainer.classList.add('graph-canvas');
    this.graphContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    `;
    container.appendChild(this.graphContainer);

    // Create layered structure
    // Background layer
    this.backgroundLayer = document.createElement('div');
    this.backgroundLayer.classList.add('background-layer');
    this.backgroundLayer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;
    this.graphContainer.appendChild(this.backgroundLayer);

    // Edges layer (for D3 SVG - will be transformed along with nodes)
    this.edgesLayer = document.createElement('div');
    this.edgesLayer.classList.add('edges-layer');
    this.edgesLayer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      transform-origin: 0 0;
      will-change: transform;
    `;
    this.graphContainer.appendChild(this.edgesLayer);

    // Nodes layer (this will be transformed for zoom/pan)
    this.nodesLayer = document.createElement('div');
    this.nodesLayer.classList.add('nodes-layer');
    this.nodesLayer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      will-change: transform;
    `;
    this.graphContainer.appendChild(this.nodesLayer);

    // Overlay layer (for marquee selection, etc.)
    this.overlayLayer = document.createElement('div');
    this.overlayLayer.classList.add('overlay-layer');
    this.overlayLayer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;
    this.graphContainer.appendChild(this.overlayLayer);

    // Initialize history manager first (needed by NodeRenderer)
    this.historyManager = new HistoryManager(graph, registry, this.selectionManager);

    // Initialize renderers with HTML layers
    this.edgeRenderer = new EdgeRendererHTML(this.edgesLayer);
    this.nodeRenderer = new NodeRenderer(this.nodesLayer, graph, this.historyManager);

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

    // Initialize custom node system
    this.customNodeManager = new CustomNodeManager(registry);
    this.customNodeCreator = new CustomNodeCreator(container, this.customNodeManager);

    // Connect custom node creator to context menu
    this.contextMenu.setCustomNodeCreator(this.customNodeCreator);

    // Callback to rebuild context menu when new custom nodes are created
    this.customNodeCreator.onNodeCreatedCallback(() => {
      // Rebuild context menu to show new custom node
      // The context menu will automatically pick up the new node from the registry
    });

    // Initialize auto-layout system
    const savedLayoutConfig = localStorage.getItem('autoLayoutConfig');
    const layoutConfig = savedLayoutConfig ? JSON.parse(savedLayoutConfig) : undefined;
    this.autoLayoutManager = new AutoLayoutManager(graph, layoutConfig);

    // Initialize interaction (pass graphContainer and overlayLayer)
    this.interactionManager = new InteractionManager(
      this.graph,
      this.viewport,
      this.nodeRenderer,
      this.graphContainer,
      this.overlayLayer,
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
    // But allow them on the canvas so they can be converted to wheel events
    document.addEventListener('gesturestart', (e) => {
      const target = e.target as Element;
      const isCanvas = target.closest('.graph-canvas');
      if (!isCanvas) {
        e.preventDefault();
      }
    });
    document.addEventListener('gesturechange', (e) => {
      const target = e.target as Element;
      const isCanvas = target.closest('.graph-canvas');
      if (!isCanvas) {
        e.preventDefault();
      }
    });
    document.addEventListener('gestureend', (e) => {
      const target = e.target as Element;
      const isCanvas = target.closest('.graph-canvas');
      if (!isCanvas) {
        e.preventDefault();
      }
    });

    // Prevent pinch zoom via touch events (for touch devices)
    // The canvas handles its own zoom via wheel events in InteractionManager
    document.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 2) {
          const target = e.target as Element;
          const isCanvas = target.closest('.graph-canvas');
          if (!isCanvas) {
            e.preventDefault(); // Prevent pinch zoom on non-canvas elements
          }
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
          // Check if the event target is within the graph canvas
          const target = e.target as Element;
          const isCanvas = target.closest('.graph-canvas');

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

    // Apply viewport transform only to nodes layer
    // Edges are positioned in screen space, so they don't need the transform
    this.viewport.applyToHTML(this.nodesLayer);

    // Get drag connection if any
    const dragState = this.interactionManager.getDragState();
    let dragConnection = undefined;

    if (dragState.type === 'connection') {
      const pos = this.nodeRenderer.getPortScreenPosition(dragState.port.id);
      if (pos) {
        // Get current mouse position from interaction manager
        const currentMouse = this.interactionManager.getCurrentMousePos();
        if (currentMouse) {
          // Both start and end positions are in screen space now
          dragConnection = {
            startX: pos.x,
            startY: pos.y,
            endX: currentMouse.x,
            endY: currentMouse.y,
            shiftPressed: dragState.shiftPressed,
          };
        }
      }
    }

    // Render edges (must be before nodes so they appear behind)
    this.edgeRenderer.render(
      this.graph,
      (portId) => this.nodeRenderer.getPortScreenPosition(portId),
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

    // Update graph container dimensions
    this.graphContainer.style.width = `${rect.width}px`;
    this.graphContainer.style.height = `${rect.height}px`;
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
    infoButton.innerHTML = '<i class="ph ph-keyboard"></i>';
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

    // Group 3: Editor controls (Add node, Auto-layout)
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

    // Auto-layout button
    const autoLayoutButton = document.createElement('button');
    autoLayoutButton.className = 'toolbar-button auto-layout-button';
    autoLayoutButton.title = 'Auto-arrange nodes';
    autoLayoutButton.innerHTML = '<i class="ph ph-flow-arrow"></i>';
    autoLayoutButton.addEventListener('click', () => {
      this.toggleAutoLayoutPane(autoLayoutButton);
    });
    editorGroup.appendChild(autoLayoutButton);

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

  private toggleAutoLayoutPane(button: HTMLElement): void {
    // If pane exists, toggle visibility
    if (this.autoLayoutPane && this.autoLayoutPaneContainer) {
      const isHidden = this.autoLayoutPaneContainer.style.display === 'none';
      this.autoLayoutPaneContainer.style.display = isHidden ? 'block' : 'none';

      // Update position in case button moved
      if (!isHidden) {
        const rect = button.getBoundingClientRect();
        this.autoLayoutPaneContainer.style.left = `${rect.left}px`;
        this.autoLayoutPaneContainer.style.bottom = `${window.innerHeight - rect.top + 10}px`;
      }
      return;
    }

    // Get button position
    const rect = button.getBoundingClientRect();

    // Create pane container
    this.autoLayoutPaneContainer = document.createElement('div');
    this.autoLayoutPaneContainer.className = 'auto-layout-pane-container';
    this.autoLayoutPaneContainer.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      bottom: ${window.innerHeight - rect.top + 10}px;
      z-index: 9999;
    `;
    document.body.appendChild(this.autoLayoutPaneContainer);

    // Create Tweakpane instance
    this.autoLayoutPane = new Pane({
      container: this.autoLayoutPaneContainer,
      title: 'Auto Layout',
    });

    // Get current config
    const currentConfig = this.autoLayoutManager.getConfig();

    // Load saved settings including checkbox states
    const savedConfig = localStorage.getItem('autoLayoutConfig');
    let savedSettings = savedConfig ? JSON.parse(savedConfig) : {};

    // Create params object for Tweakpane
    const params = {
      horizontalEnabled:
        savedSettings.horizontalEnabled !== undefined ? savedSettings.horizontalEnabled : true,
      horizontalSpacing: currentConfig.horizontalSpacing,
      verticalEnabled:
        savedSettings.verticalEnabled !== undefined ? savedSettings.verticalEnabled : true,
      verticalSpacing: currentConfig.verticalSpacing,
    };

    // Add horizontal spacing controls
    const horizontalFolder = this.autoLayoutPane.addFolder({ title: 'Horizontal' });
    horizontalFolder.addBinding(params, 'horizontalEnabled', { label: 'Enabled' });
    horizontalFolder.addBinding(params, 'horizontalSpacing', {
      label: 'Spacing',
      min: 100,
      max: 500,
      step: 10,
    });

    // Add vertical spacing controls
    const verticalFolder = this.autoLayoutPane.addFolder({ title: 'Vertical' });
    verticalFolder.addBinding(params, 'verticalEnabled', { label: 'Enabled' });
    verticalFolder.addBinding(params, 'verticalSpacing', {
      label: 'Spacing',
      min: 50,
      max: 300,
      step: 10,
    });

    // Apply layout on any change
    const applyLayout = () => {
      // Update config
      this.autoLayoutManager.updateConfig({
        horizontalSpacing: params.horizontalSpacing,
        verticalSpacing: params.verticalSpacing,
      });

      // Save config to localStorage
      localStorage.setItem(
        'autoLayoutConfig',
        JSON.stringify({
          horizontalSpacing: params.horizontalSpacing,
          verticalSpacing: params.verticalSpacing,
          horizontalEnabled: params.horizontalEnabled,
          verticalEnabled: params.verticalEnabled,
        })
      );

      // Begin interaction
      this.historyManager.beginInteraction();

      // Apply layout with axis constraints
      if (params.horizontalEnabled || params.verticalEnabled) {
        this.autoLayoutManager.applyLayoutWithConstraints(
          params.horizontalEnabled,
          params.verticalEnabled
        );
      }

      // End interaction after a short delay
      setTimeout(() => {
        this.historyManager.endInteraction();
      }, 50);
    };

    // Listen to all parameter changes
    this.autoLayoutPane.on('change', applyLayout);
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    // Cleanup auto-layout pane
    if (this.autoLayoutPane) {
      this.autoLayoutPane.dispose();
      this.autoLayoutPane = null;
    }
    if (this.autoLayoutPaneContainer && this.autoLayoutPaneContainer.parentElement) {
      this.autoLayoutPaneContainer.parentElement.removeChild(this.autoLayoutPaneContainer);
      this.autoLayoutPaneContainer = null;
    }
  }

  show(): void {
    this.container.style.display = 'block';
  }

  hide(): void {
    this.container.style.display = 'none';
  }
}
