import { Graph } from '@/core/Graph';
import { Node } from '@/core/Node';
import { Port } from '@/core/Port';
import { Edge } from '@/core/Edge';
import { Viewport } from './Viewport';
import { NodeRenderer } from './NodeRenderer';
import { SelectionManager } from './SelectionManager';
import { ContextMenu } from './ContextMenu';
import { ClipboardManager } from './ClipboardManager';
import { HistoryManager } from './HistoryManager';

export type DragState =
  | { type: 'none' }
  | { type: 'pan'; startX: number; startY: number }
  | { type: 'nodes'; referenceNode: Node; offsetX: number; offsetY: number }
  | {
      type: 'connection';
      port: Port;
      startX: number;
      startY: number;
      removedEdge?: Edge;
      shiftPressed: boolean;
    }
  | {
      type: 'marquee';
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
      shiftPressed: boolean;
      initialSelection: Set<string>;
    };

export class InteractionManager {
  private graph: Graph;
  private viewport: Viewport;
  private nodeRenderer: NodeRenderer;
  private svg: SVGSVGElement;
  private selectionManager: SelectionManager;
  private contextMenu: ContextMenu;
  private clipboardManager: ClipboardManager;
  private historyManager: HistoryManager;
  private transformGroup: SVGGElement | null = null;

  private dragState: DragState = { type: 'none' };
  private currentMousePos: { x: number; y: number } | null = null;
  private marqueeElement: SVGRectElement | null = null;
  private rightClickStartPos: { x: number; y: number } | null = null;
  private readonly CLICK_THRESHOLD = 5; // pixels
  private shiftPressed: boolean = false;
  private capturedPointerId: number | null = null;

  // Bound event handlers for document-level events during drag
  private boundOnPointerMove: ((e: PointerEvent) => void) | null = null;
  private boundOnPointerUp: ((e: PointerEvent) => void) | null = null;

  constructor(
    graph: Graph,
    viewport: Viewport,
    nodeRenderer: NodeRenderer,
    svg: SVGSVGElement,
    selectionManager: SelectionManager,
    contextMenu: ContextMenu,
    clipboardManager: ClipboardManager,
    historyManager: HistoryManager
  ) {
    this.graph = graph;
    this.viewport = viewport;
    this.nodeRenderer = nodeRenderer;
    this.svg = svg;
    this.selectionManager = selectionManager;
    this.contextMenu = contextMenu;
    this.clipboardManager = clipboardManager;
    this.historyManager = historyManager;

    // Find the transform group that contains the nodes
    this.transformGroup = svg.querySelector('.transform-group');

    // Bind handlers that will be attached/detached during drag operations
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);

    this.setupEventListeners();
    this.createMarqueeElement();
  }

  private setupEventListeners(): void {
    // Mouse events on SVG (for nodes/ports)
    this.svg.addEventListener('pointerdown', this.onPointerDown.bind(this));

    // Note: pointermove and pointerup are attached to document during drag
    // to ensure they aren't interrupted by hovering over UI elements

    // Double-click to open context menu
    this.svg.addEventListener('dblclick', this.onDoubleClick.bind(this));

    // Wheel event for zoom
    this.svg.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    // Keyboard events
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));

    // Prevent default context menu - we'll show it on pointer up if not dragging
    this.svg.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private createMarqueeElement(): void {
    this.marqueeElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.marqueeElement.classList.add('marquee-selection');
    this.marqueeElement.style.display = 'none';

    // Add marquee to transform group so it transforms with the viewport
    if (this.transformGroup) {
      this.transformGroup.appendChild(this.marqueeElement);
    } else {
      this.svg.appendChild(this.marqueeElement);
    }
  }

  private attachDocumentDragListeners(pointerId: number): void {
    // Capture the pointer to ensure all events come to the SVG even over other UI elements
    this.svg.setPointerCapture(pointerId);
    this.capturedPointerId = pointerId;

    // Add dragging class to body to prevent text selection
    document.body.classList.add('dragging');

    // Also attach to document as backup
    if (this.boundOnPointerMove && this.boundOnPointerUp) {
      document.addEventListener('pointermove', this.boundOnPointerMove);
      document.addEventListener('pointerup', this.boundOnPointerUp);
    }
  }

  private detachDocumentDragListeners(): void {
    // Release pointer capture
    if (this.capturedPointerId !== null) {
      try {
        this.svg.releasePointerCapture(this.capturedPointerId);
      } catch (e) {
        // Ignore errors if pointer capture was already released
      }
      this.capturedPointerId = null;
    }

    // Remove dragging class to re-enable text selection
    document.body.classList.remove('dragging');

    // Remove document listeners
    if (this.boundOnPointerMove && this.boundOnPointerUp) {
      document.removeEventListener('pointermove', this.boundOnPointerMove);
      document.removeEventListener('pointerup', this.boundOnPointerUp);
    }
  }

  private onPointerDown(e: PointerEvent): void {
    this.currentMousePos = { x: e.clientX, y: e.clientY };
    const target = e.target as Element;

    // Check if clicking on a port
    if (target.classList.contains('port')) {
      const portId = target.getAttribute('data-port-id');
      if (portId) {
        const port = this.findPort(portId);
        if (port) {
          const pos = this.nodeRenderer.getPortWorldPosition(portId);
          if (pos) {
            // Check if this port has an existing connection
            let removedEdge: Edge | undefined = undefined;
            let dragFromPort = port;
            let dragFromPos = pos;

            if (port.isInput) {
              // Input port - check if it has a connection
              const existingEdge = this.graph.getEdgeToPort(port);
              if (existingEdge) {
                // Remove the connection to this input
                this.graph.removeEdge(existingEdge.id);
                removedEdge = existingEdge;

                // Switch to dragging from the OUTPUT port that was connected
                dragFromPort = existingEdge.source; // The output port
                const outputPos = this.nodeRenderer.getPortWorldPosition(dragFromPort.id);
                if (outputPos) {
                  dragFromPos = outputPos;
                }
              }
            } else {
              // Output port - we can drag from it to create new connections
              // (output ports can have multiple connections, so we don't remove them)
            }

            this.dragState = {
              type: 'connection',
              port: dragFromPort,
              startX: dragFromPos.x,
              startY: dragFromPos.y,
              removedEdge,
              shiftPressed: this.shiftPressed,
            };
            this.attachDocumentDragListeners(e.pointerId);
            e.stopPropagation();
            return;
          }
        }
      }
    }

    // Check if clicking on a node
    const nodeElement = target.closest('.node') as SVGGElement | null;
    if (nodeElement) {
      const nodeId = nodeElement.getAttribute('data-node-id');
      if (nodeId) {
        const node = this.graph.getNode(nodeId);
        if (node) {
          const worldPos = this.viewport.screenToWorld(e.clientX, e.clientY);

          // Handle selection based on modifier keys
          if (e.shiftKey) {
            // Shift+click: Add to selection
            this.selectionManager.selectNode(nodeId, 'add');
          } else if (e.ctrlKey || e.metaKey) {
            // Ctrl/Cmd+click: Toggle selection
            this.selectionManager.selectNode(nodeId, 'toggle');
          } else {
            // Regular click: Select this node (replace selection if not already selected)
            if (!this.selectionManager.isSelected(nodeId)) {
              this.selectionManager.selectNode(nodeId, 'replace');
            }
          }

          // Start dragging if node is selected
          if (this.selectionManager.isSelected(nodeId)) {
            this.dragState = {
              type: 'nodes',
              referenceNode: node,
              offsetX: worldPos.x - node.position.x,
              offsetY: worldPos.y - node.position.y,
            };
            this.attachDocumentDragListeners(e.pointerId);
          }

          e.stopPropagation();
          return;
        }
      }
    }

    // Otherwise, pan (right button) or marquee select (left button)
    if (e.button === 2) {
      // Right mouse button = pan
      // Track right-click start position for context menu vs pan detection
      this.rightClickStartPos = { x: e.clientX, y: e.clientY };
      this.dragState = {
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
      };
      this.attachDocumentDragListeners(e.pointerId);
    } else if (e.button === 0) {
      // Left mouse button = marquee select
      const worldPos = this.viewport.screenToWorld(e.clientX, e.clientY);

      // Capture initial selection if Shift is pressed
      const initialSelection = e.shiftKey
        ? new Set(this.selectionManager.getSelectedNodes())
        : new Set<string>();

      this.dragState = {
        type: 'marquee',
        startX: worldPos.x,
        startY: worldPos.y,
        currentX: worldPos.x,
        currentY: worldPos.y,
        shiftPressed: e.shiftKey,
        initialSelection,
      };

      if (!e.shiftKey) {
        this.selectionManager.clearSelection();
      }
      this.updateMarqueeVisual();
      this.attachDocumentDragListeners(e.pointerId);
    }
  }

  private onPointerMove(e: PointerEvent): void {
    this.currentMousePos = { x: e.clientX, y: e.clientY };

    if (this.dragState.type === 'pan') {
      const dx = e.clientX - this.dragState.startX;
      const dy = e.clientY - this.dragState.startY;
      this.viewport.pan(dx, dy);
      this.dragState.startX = e.clientX;
      this.dragState.startY = e.clientY;
    } else if (this.dragState.type === 'nodes') {
      // Move all selected nodes together
      const worldPos = this.viewport.screenToWorld(e.clientX, e.clientY);
      this.selectionManager.setSelectedNodesPosition(
        this.dragState.referenceNode.id,
        worldPos.x,
        worldPos.y,
        this.dragState.offsetX,
        this.dragState.offsetY
      );
    } else if (this.dragState.type === 'marquee') {
      const worldPos = this.viewport.screenToWorld(e.clientX, e.clientY);
      this.dragState.currentX = worldPos.x;
      this.dragState.currentY = worldPos.y;
      this.updateMarqueeVisual();
      this.updateMarqueeSelection();
    } else if (this.dragState.type === 'connection') {
      // Connection drag is visualized by GraphEditor via getDragState()
      // Just update currentMousePos which is used for drag visualization
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.dragState.type === 'connection') {
      const target = e.target as Element;
      // Check if we're hovering over a port (could be the circle or the container)
      const portElement = target.classList.contains('port') ? target : target.closest('.port');

      if (portElement) {
        const portId = portElement.getAttribute('data-port-id');
        if (portId) {
          const targetPort = this.findPort(portId);
          if (targetPort && this.dragState.port.canConnectTo(targetPort)) {
            try {
              // Determine source and target - output connects to input
              const sourcePort = this.dragState.port.isInput ? targetPort : this.dragState.port;
              const inputPort = this.dragState.port.isInput ? this.dragState.port : targetPort;

              // Make sure we're connecting output to input
              if (!sourcePort.isInput && inputPort.isInput) {
                this.graph.connect(sourcePort, inputPort, this.dragState.shiftPressed);
              }
            } catch (err) {
              console.error('Failed to create connection:', err);
            }
          }
        }
      }
    } else if (this.dragState.type === 'marquee') {
      this.hideMarquee();
    } else if (this.dragState.type === 'pan' && e.button === 2 && this.rightClickStartPos) {
      // Check if this was a click (no significant movement) or a drag
      const dx = Math.abs(e.clientX - this.rightClickStartPos.x);
      const dy = Math.abs(e.clientY - this.rightClickStartPos.y);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.CLICK_THRESHOLD) {
        // It was a click, not a drag - show context menu
        const target = e.target as Element;
        const isNode = target.closest('.node');
        const isPort = target.classList.contains('port');

        if (!isNode && !isPort) {
          this.contextMenu.show(e.clientX, e.clientY);
        }
      }
    }

    // Detach document listeners when drag ends
    this.detachDocumentDragListeners();

    this.rightClickStartPos = null;
    this.dragState = { type: 'none' };
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    // Detect if this is likely a mouse wheel or trackpad
    // Mouse wheels typically have deltaMode > 0 or larger discrete delta values
    const isLikelyMouseWheel = e.deltaMode > 0 || Math.abs(e.deltaY) > 50;

    if (e.ctrlKey || e.metaKey) {
      // Zoom behavior
      if (isLikelyMouseWheel) {
        // Mouse wheel + Ctrl/Meta - quarter sensitivity, no damping
        this.viewport.zoomImmediate(-e.deltaY * 0.25, e.clientX, e.clientY);
      } else {
        // Trackpad pinch zoom - 1.5x sensitivity, no damping
        this.viewport.zoomImmediate(-e.deltaY * 1.5, e.clientX, e.clientY);
      }
    } else {
      // Pan behavior (no modifier keys)
      if (isLikelyMouseWheel) {
        // Mouse wheel scroll - pan vertically
        this.viewport.pan(0, -e.deltaY);
      } else {
        // Trackpad two-finger scroll - pan horizontally and vertically
        this.viewport.pan(-e.deltaX, -e.deltaY);
      }
    }
  }

  private onDoubleClick(e: MouseEvent): void {
    const target = e.target as Element;

    // Only open context menu if double-clicking on empty canvas (not on nodes or ports)
    const isNode = target.closest('.node');
    const isPort = target.classList.contains('port');

    if (!isNode && !isPort) {
      // Open context menu at double-click position
      this.contextMenu.show(e.clientX, e.clientY);
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Track shift key state for array connections
    if (e.key === 'Shift') {
      this.shiftPressed = true;
    }

    // Don't handle keyboard shortcuts if context menu is open
    if (this.contextMenu.isOpen()) {
      return;
    }

    // Check for modifier + key combinations first
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c' || e.key === 'C') {
        // Copy
        e.preventDefault();
        this.clipboardManager.copy();
      } else if (e.key === 'x' || e.key === 'X') {
        // Cut
        e.preventDefault();
        this.clipboardManager.cut();
      } else if (e.key === 'v' || e.key === 'V') {
        // Paste
        e.preventDefault();
        const worldPos = this.currentMousePos
          ? this.viewport.screenToWorld(this.currentMousePos.x, this.currentMousePos.y)
          : undefined;
        this.clipboardManager.paste(worldPos);
      } else if (e.key === 'z' || e.key === 'Z') {
        // Undo/Redo
        e.preventDefault();
        if (e.shiftKey) {
          // Redo (Ctrl/Cmd + Shift + Z)
          this.historyManager.redo();
        } else {
          // Undo (Ctrl/Cmd + Z)
          this.historyManager.undo();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        // Redo (alternative: Ctrl/Cmd + Y)
        e.preventDefault();
        this.historyManager.redo();
      } else if (e.key === 'a' || e.key === 'A') {
        // Select all nodes
        e.preventDefault();
        const allNodeIds = Array.from(this.graph.nodes.keys());
        this.selectionManager.selectNodes(allNodeIds, 'replace');
      }
      return;
    }

    // Non-modifier keys
    if (e.key === ' ') {
      // Spacebar: Open context menu at cursor position
      e.preventDefault();
      if (this.currentMousePos) {
        this.contextMenu.show(this.currentMousePos.x, this.currentMousePos.y);
      } else {
        // Fallback to center of screen
        this.contextMenu.show(window.innerWidth / 2, window.innerHeight / 2);
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      // Prevent default behavior (like going back in browser)
      if (this.selectionManager.getSelectionCount() > 0) {
        e.preventDefault();
        this.selectionManager.deleteSelectedNodes();
      }
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    // Track shift key state for array connections
    if (e.key === 'Shift') {
      this.shiftPressed = false;
    }
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

  // Public methods for GraphEditor to access drag state
  getDragState(): DragState {
    return this.dragState;
  }

  getCurrentMousePos(): { x: number; y: number } | null {
    return this.currentMousePos;
  }

  private updateMarqueeVisual(): void {
    if (this.dragState.type !== 'marquee' || !this.marqueeElement) return;

    const { startX, startY, currentX, currentY } = this.dragState;
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    this.marqueeElement.setAttribute('x', x.toString());
    this.marqueeElement.setAttribute('y', y.toString());
    this.marqueeElement.setAttribute('width', width.toString());
    this.marqueeElement.setAttribute('height', height.toString());
    this.marqueeElement.style.display = 'block';
  }

  private updateMarqueeSelection(): void {
    if (this.dragState.type !== 'marquee') return;

    const { startX, startY, currentX, currentY, shiftPressed, initialSelection } = this.dragState;
    const minX = Math.min(startX, currentX);
    const maxX = Math.max(startX, currentX);
    const minY = Math.min(startY, currentY);
    const maxY = Math.max(startY, currentY);

    // Check which nodes intersect with the marquee
    const intersectingNodes: string[] = [];
    for (const node of this.graph.nodes.values()) {
      const nodeLeft = node.position.x;
      const nodeRight = node.position.x + 200; // Node width
      const nodeTop = node.position.y;
      const nodeBottom = node.position.y + 100; // Approximate node height

      const intersects = nodeLeft < maxX && nodeRight > minX && nodeTop < maxY && nodeBottom > minY;

      if (intersects) {
        intersectingNodes.push(node.id);
      }
    }

    // If Shift was pressed, combine initial selection with intersecting nodes
    // Otherwise, replace selection with only intersecting nodes
    if (shiftPressed) {
      const combinedSelection = new Set([...initialSelection, ...intersectingNodes]);
      this.selectionManager.selectNodes(Array.from(combinedSelection), 'replace');
    } else {
      this.selectionManager.selectNodes(intersectingNodes, 'replace');
    }
  }

  private hideMarquee(): void {
    if (this.marqueeElement) {
      this.marqueeElement.style.display = 'none';
    }
  }
}
