import { Graph } from '@/core/Graph';
import { Evaluator } from '@/core/Evaluator';
import { Viewport } from './Viewport';
import { NodeRenderer } from './NodeRenderer';
import { EdgeRenderer } from './EdgeRenderer';
import { InteractionManager } from './InteractionManager';
import { SelectionManager } from './SelectionManager';
import { ContextMenu } from './ContextMenu';
import { ClipboardManager } from './ClipboardManager';
import { HistoryManager } from './HistoryManager';
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
  private registry: NodeRegistry;

  private svg: SVGSVGElement;
  private transformGroup: SVGGElement;
  private container: HTMLElement;
  private animationId: number | null = null;

  constructor(container: HTMLElement, graph: Graph, registry: NodeRegistry) {
    this.container = container;
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

    // Initialize renderers - they add their groups to the transform group
    this.edgeRenderer = new EdgeRenderer(this.transformGroup);
    this.nodeRenderer = new NodeRenderer(this.transformGroup, graph);

    // Initialize context menu
    this.contextMenu = new ContextMenu(container, registry);
    this.contextMenu.onNodeSelectCallback((nodeType, screenX, screenY) => {
      this.addNodeAtScreenPosition(nodeType, screenX, screenY);
    });

    // Initialize clipboard and history managers
    this.clipboardManager = new ClipboardManager(graph, this.selectionManager, registry);
    this.historyManager = new HistoryManager(graph, registry, this.selectionManager);

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

    // Render nodes with selection
    this.nodeRenderer.render(this.graph, this.selectionManager.getSelectedNodes());
  }

  private handleResize(): void {
    const rect = this.container.getBoundingClientRect();

    // Update SVG dimensions
    this.svg.setAttribute('width', rect.width.toString());
    this.svg.setAttribute('height', rect.height.toString());
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
