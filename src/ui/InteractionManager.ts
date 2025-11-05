import { Graph } from '@/core/Graph';
import { Node } from '@/core/Node';
import { Port } from '@/core/Port';
import { Edge } from '@/core/Edge';
import { Viewport } from './Viewport';
import { NodeRenderer } from './NodeRenderer';
import { SelectionManager } from './SelectionManager';
import { ContextMenu } from './ContextMenu';
import { ClipboardManager } from './ClipboardManager';
import { isTouchDevice } from '@/utils/deviceDetection';

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
  private graphContainer: HTMLElement;
  private overlayLayer: HTMLElement;
  private selectionManager: SelectionManager;
  private contextMenu: ContextMenu;
  private clipboardManager: ClipboardManager;

  private dragState: DragState = { type: 'none' };
  private currentMousePos: { x: number; y: number } | null = null;
  private marqueeElement: HTMLElement | null = null;
  private rightClickStartPos: { x: number; y: number } | null = null;
  private readonly CLICK_THRESHOLD = 5; // pixels
  private shiftPressed: boolean = false;
  private capturedPointerId: number | null = null;

  // Device detection - available for future use to distinguish desktop vs mobile behavior
  private readonly isTouchDevice: boolean;

  // Touch handling state
  private activeTouches: Map<number, Touch> = new Map();
  private initialTouchDistance: number | null = null;
  private initialZoomLevel: number | null = null;
  private touchStartPos: { x: number; y: number } | null = null;
  private touchMoved: boolean = false;
  private hadMultipleFingers: boolean = false; // Track if gesture ever had 2+ fingers
  private readonly TAP_THRESHOLD = 10; // pixels - max movement to count as a tap

  // Bound event handlers for document-level events during drag
  private boundOnPointerMove: ((e: PointerEvent) => void) | null = null;
  private boundOnPointerUp: ((e: PointerEvent) => void) | null = null;

  constructor(
    graph: Graph,
    viewport: Viewport,
    nodeRenderer: NodeRenderer,
    graphContainer: HTMLElement,
    overlayLayer: HTMLElement,
    selectionManager: SelectionManager,
    contextMenu: ContextMenu,
    clipboardManager: ClipboardManager
  ) {
    this.graph = graph;
    this.viewport = viewport;
    this.nodeRenderer = nodeRenderer;
    this.graphContainer = graphContainer;
    this.overlayLayer = overlayLayer;
    this.selectionManager = selectionManager;
    this.contextMenu = contextMenu;
    this.clipboardManager = clipboardManager;

    // Detect device type
    this.isTouchDevice = isTouchDevice();

    // Bind handlers that will be attached/detached during drag operations
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);

    this.setupEventListeners();
    this.createMarqueeElement();
  }

  private setupEventListeners(): void {
    // Mouse events on graph container (for nodes/ports)
    this.graphContainer.addEventListener('pointerdown', this.onPointerDown.bind(this));

    // Note: pointermove and pointerup are attached to document during drag
    // to ensure they aren't interrupted by hovering over UI elements

    // Double-click to open context menu
    this.graphContainer.addEventListener('dblclick', this.onDoubleClick.bind(this));

    // Wheel event for zoom
    this.graphContainer.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    // Touch events for mobile support
    this.graphContainer.addEventListener('touchstart', this.onTouchStart.bind(this), {
      passive: false,
    });
    this.graphContainer.addEventListener('touchmove', this.onTouchMove.bind(this), {
      passive: false,
    });
    this.graphContainer.addEventListener('touchend', this.onTouchEnd.bind(this), {
      passive: false,
    });
    this.graphContainer.addEventListener('touchcancel', this.onTouchEnd.bind(this), {
      passive: false,
    });

    // Keyboard events
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));

    // Prevent default context menu - we'll show it on pointer up if not dragging
    this.graphContainer.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private createMarqueeElement(): void {
    // Create marquee as HTML div in overlay layer
    this.marqueeElement = document.createElement('div');
    this.marqueeElement.classList.add('marquee-selection');
    this.marqueeElement.style.cssText = `
      position: absolute;
      border: 1px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      pointer-events: none;
      display: none;
    `;

    // Add marquee to overlay layer (not transformed, stays in screen space)
    this.overlayLayer.appendChild(this.marqueeElement);
  }

  private attachDocumentDragListeners(pointerId: number): void {
    // Capture the pointer to ensure all events come to the graph container even over other UI elements
    this.graphContainer.setPointerCapture(pointerId);
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
        this.graphContainer.releasePointerCapture(this.capturedPointerId);
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
    // On touch devices, completely ignore touch pointer events
    // Touch events will handle everything on the canvas
    // UI elements outside the canvas will use their native click handlers
    if (e.pointerType === 'touch' && this.isTouchDevice) {
      return;
    }

    this.currentMousePos = { x: e.clientX, y: e.clientY };
    const target = e.target as Element;

    // Ignore clicks on file picker buttons
    if (
      target.hasAttribute('data-file-picker-button') ||
      target.closest('[data-file-picker-button]')
    ) {
      return;
    }

    // Ignore clicks on node title (to allow renaming)
    if (target.classList.contains('node-title')) {
      return;
    }

    // Check if clicking on a port
    if (target.classList.contains('port')) {
      const portId = target.getAttribute('data-port-id');
      if (portId) {
        const port = this.findPort(portId);
        if (port) {
          const pos = this.nodeRenderer.getPortScreenPosition(portId);
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
                const outputPos = this.nodeRenderer.getPortScreenPosition(dragFromPort.id);
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
      // Update shift state in real-time for visual feedback
      this.dragState.shiftPressed = e.shiftKey;
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.dragState.type === 'connection') {
      // With pointer capture, e.target is the captured element (SVG), not the element under cursor
      // Use elementFromPoint to find the actual element under the cursor
      const element = document.elementFromPoint(e.clientX, e.clientY);
      if (element) {
        const portElement = element.classList.contains('port') ? element : element.closest('.port');

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
                  // Use current shift state from event, not cached state from drag start
                  this.graph.connect(sourcePort, inputPort, e.shiftKey);
                }
              } catch (err) {
                console.error('Failed to create connection:', err);
              }
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
        // Use elementFromPoint since we have pointer capture
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (element) {
          const isNode = element.closest('.node');
          const isPort = element.classList.contains('port');

          if (!isNode && !isPort) {
            this.contextMenu.show(e.clientX, e.clientY);
          }
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
    // Don't handle keyboard shortcuts if typing in an input field
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

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

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();

    // Update active touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this.activeTouches.set(touch.identifier, touch);
    }

    // Handle based on number of active touches
    if (this.activeTouches.size === 1) {
      // Single touch - check if touching a node
      const touch = Array.from(this.activeTouches.values())[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);

      this.touchStartPos = { x: touch.clientX, y: touch.clientY };
      this.touchMoved = false;
      this.hadMultipleFingers = false; // Reset for new gesture

      if (target) {
        const nodeElement = target.closest('.node') as SVGGElement | null;
        const isPort = target.classList.contains('port');
        const isUIElement =
          target.closest('[data-file-picker-button]') ||
          target.closest('.node-control') ||
          target.closest('.context-menu');

        // If touching a node (not port or UI element), prepare to drag it
        if (nodeElement && !isPort && !isUIElement) {
          const nodeId = nodeElement.getAttribute('data-node-id');
          if (nodeId) {
            const node = this.graph.getNode(nodeId);
            if (node) {
              const worldPos = this.viewport.screenToWorld(touch.clientX, touch.clientY);

              // Select the node if not already selected
              if (!this.selectionManager.isSelected(nodeId)) {
                this.selectionManager.selectNode(nodeId, 'replace');
              }

              // Start node drag
              this.dragState = {
                type: 'nodes',
                referenceNode: node,
                offsetX: worldPos.x - node.position.x,
                offsetY: worldPos.y - node.position.y,
              };
              return;
            }
          }
        }
      }

      // Not touching a node - start canvas panning
      this.dragState = {
        type: 'pan',
        startX: touch.clientX,
        startY: touch.clientY,
      };
    } else if (this.activeTouches.size === 2) {
      // Two touches - start pinch zoom
      const touches = Array.from(this.activeTouches.values());
      this.initialTouchDistance = this.getTouchDistance(touches[0], touches[1]);
      this.initialZoomLevel = this.viewport.getZoom();

      // Mark that this gesture has involved multiple fingers
      this.hadMultipleFingers = true;

      // Cancel any existing drag
      this.dragState = { type: 'none' };
      this.touchMoved = true; // Prevent tap detection with 2 fingers
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();

    // Update active touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (this.activeTouches.has(touch.identifier)) {
        this.activeTouches.set(touch.identifier, touch);
      }
    }

    if (this.activeTouches.size === 1) {
      const touch = Array.from(this.activeTouches.values())[0];

      // Check if we've moved beyond the tap threshold
      if (this.touchStartPos && !this.touchMoved) {
        const dx = Math.abs(touch.clientX - this.touchStartPos.x);
        const dy = Math.abs(touch.clientY - this.touchStartPos.y);
        if (dx > this.TAP_THRESHOLD || dy > this.TAP_THRESHOLD) {
          this.touchMoved = true;
        }
      }

      if (this.dragState.type === 'nodes') {
        // Node dragging
        const worldPos = this.viewport.screenToWorld(touch.clientX, touch.clientY);

        // Use SelectionManager to move all selected nodes together
        this.selectionManager.setSelectedNodesPosition(
          this.dragState.referenceNode.id,
          worldPos.x,
          worldPos.y,
          this.dragState.offsetX,
          this.dragState.offsetY
        );
      } else if (this.dragState.type === 'pan') {
        // Canvas panning
        const dx = touch.clientX - this.dragState.startX;
        const dy = touch.clientY - this.dragState.startY;

        this.viewport.panImmediate(dx, dy);

        this.dragState = {
          type: 'pan',
          startX: touch.clientX,
          startY: touch.clientY,
        };
      }
    } else if (
      this.activeTouches.size === 2 &&
      this.initialTouchDistance !== null &&
      this.initialZoomLevel !== null
    ) {
      // Two touch pinch zoom
      const touches = Array.from(this.activeTouches.values());
      const currentDistance = this.getTouchDistance(touches[0], touches[1]);

      // Calculate zoom scale
      const scale = currentDistance / this.initialTouchDistance;
      const newZoom = this.initialZoomLevel * scale;

      // Get center point between the two touches
      const centerX = (touches[0].clientX + touches[1].clientX) / 2;
      const centerY = (touches[0].clientY + touches[1].clientY) / 2;

      // Apply zoom at the center point
      this.viewport.zoomToPoint(centerX, centerY, newZoom);
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();

    // Track how many touches we had before removing
    const touchesBefore = this.activeTouches.size;

    // Check if this was a tap (not a drag) - only if we NEVER had multiple fingers during this gesture
    const wasTap = !this.touchMoved && !this.hadMultipleFingers && touchesBefore === 1;
    let tapTarget: Element | null = null;

    if (wasTap && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      tapTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    }

    // Remove ended touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this.activeTouches.delete(touch.identifier);
    }

    // Handle tap on empty canvas - deselect nodes
    // Only if we never had multiple fingers (not ending a multi-touch gesture)
    if (wasTap && tapTarget) {
      const nodeElement = tapTarget.closest('.node') as SVGGElement | null;
      const isPort = tapTarget.classList.contains('port');
      const isUIElement =
        tapTarget.closest('[data-file-picker-button]') ||
        tapTarget.closest('.node-control') ||
        tapTarget.closest('.context-menu');

      // Only deselect if tapping on empty canvas (not on nodes, ports, or UI elements)
      // Node selection is already handled in onTouchStart
      if (!nodeElement && !isPort && !isUIElement) {
        this.selectionManager.clearSelection();
      }
    }

    // If no more touches, reset state completely
    if (this.activeTouches.size === 0) {
      this.dragState = { type: 'none' };
      this.initialTouchDistance = null;
      this.initialZoomLevel = null;
      this.touchStartPos = null;
      this.touchMoved = false;
      this.hadMultipleFingers = false; // Reset multi-finger tracking
    } else if (this.activeTouches.size === 1) {
      // Went from 2 touches to 1 - check what's under the remaining touch
      const touch = Array.from(this.activeTouches.values())[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);

      this.touchStartPos = { x: touch.clientX, y: touch.clientY };
      // Don't reset touchMoved here - if we had multiple fingers, keep it as moved
      // to prevent the final finger lift from being treated as a tap

      if (target) {
        const nodeElement = target.closest('.node') as SVGGElement | null;
        const isPort = target.classList.contains('port');
        const isUIElement =
          target.closest('[data-file-picker-button]') ||
          target.closest('.node-control') ||
          target.closest('.context-menu');

        // If remaining touch is on a node, prepare for node dragging
        if (nodeElement && !isPort && !isUIElement) {
          const nodeId = nodeElement.getAttribute('data-node-id');
          if (nodeId) {
            const node = this.graph.getNode(nodeId);
            if (node) {
              const worldPos = this.viewport.screenToWorld(touch.clientX, touch.clientY);
              this.dragState = {
                type: 'nodes',
                referenceNode: node,
                offsetX: worldPos.x - node.position.x,
                offsetY: worldPos.y - node.position.y,
              };
              this.initialTouchDistance = null;
              this.initialZoomLevel = null;
              return;
            }
          }
        }
      }

      // Otherwise restart canvas panning
      this.dragState = {
        type: 'pan',
        startX: touch.clientX,
        startY: touch.clientY,
      };
      this.initialTouchDistance = null;
      this.initialZoomLevel = null;
    }
  }

  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
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

    // Convert world coordinates to screen coordinates
    const startScreen = this.viewport.worldToScreen(startX, startY);
    const currentScreen = this.viewport.worldToScreen(currentX, currentY);

    // Calculate min/max in screen space
    const x = Math.min(startScreen.x, currentScreen.x);
    const y = Math.min(startScreen.y, currentScreen.y);
    const width = Math.abs(currentScreen.x - startScreen.x);
    const height = Math.abs(currentScreen.y - startScreen.y);

    // Update marquee position and size using CSS (marquee is in screen space, not world space)
    this.marqueeElement.style.left = `${x}px`;
    this.marqueeElement.style.top = `${y}px`;
    this.marqueeElement.style.width = `${width}px`;
    this.marqueeElement.style.height = `${height}px`;
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
