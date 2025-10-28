import { Graph } from '@/core/Graph';
import { serializeGraph } from '@/core/serializer';
import { deserializeGraph } from '@/core/deserializer';
import { NodeRegistry } from '@/three/NodeRegistry';
import { SelectionManager } from './SelectionManager';

interface HistoryEntry {
  graphState: string; // Serialized graph JSON
  selectionState: string[]; // Selected node IDs
  timestamp: number;
}

export class HistoryManager {
  private history: HistoryEntry[] = [];
  private currentIndex = -1;
  private maxHistorySize = 50;
  private isApplyingHistory = false;

  constructor(
    private graph: Graph,
    private registry: NodeRegistry,
    private selectionManager: SelectionManager
  ) {
    // Record initial state
    this.recordState();

    // Listen to graph changes
    this.graph.onChange(() => {
      if (!this.isApplyingHistory) {
        this.recordState();
      }
    });
  }

  /**
   * Record current graph state to history
   */
  private recordState(): void {
    // Don't record if we're in the middle of applying history
    if (this.isApplyingHistory) return;

    const graphState = JSON.stringify(serializeGraph(this.graph));
    const selectionState = Array.from(this.selectionManager.getSelectedNodes());

    const entry: HistoryEntry = {
      graphState,
      selectionState,
      timestamp: Date.now(),
    };

    // Remove any history after current index (when new action is performed after undo)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new entry
    this.history.push(entry);

    // Trim history if it exceeds max size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }

    console.log(
      `History recorded: ${this.currentIndex + 1}/${this.history.length} (${this.canUndo() ? 'can undo' : 'cannot undo'}, ${this.canRedo() ? 'can redo' : 'cannot redo'})`
    );
  }

  /**
   * Restore graph from a history entry
   */
  private restoreState(entry: HistoryEntry): void {
    this.isApplyingHistory = true;

    try {
      // Clear current graph
      const currentNodes = Array.from(this.graph.nodes.values());
      for (const node of currentNodes) {
        this.graph.removeNode(node.id);
      }

      // Deserialize and restore graph
      const serializedGraph = JSON.parse(entry.graphState);
      const restoredGraph = deserializeGraph(serializedGraph, this.registry);

      // Copy nodes and edges from restored graph to current graph
      for (const node of restoredGraph.nodes.values()) {
        this.graph.addNode(node);
      }

      for (const edge of restoredGraph.edges.values()) {
        // Edges are already connected in the restored graph, just add them
        this.graph.edges.set(edge.id, edge);
      }

      // Restore selection
      this.selectionManager.clearSelection();
      for (const nodeId of entry.selectionState) {
        if (this.graph.getNode(nodeId)) {
          this.selectionManager.selectNode(nodeId);
        }
      }
    } finally {
      this.isApplyingHistory = false;
    }
  }

  /**
   * Undo last action
   */
  undo(): void {
    if (!this.canUndo()) {
      console.log('Nothing to undo');
      return;
    }

    this.currentIndex--;
    const entry = this.history[this.currentIndex];
    this.restoreState(entry);

    console.log(`Undo: restored to state ${this.currentIndex + 1}/${this.history.length}`);
  }

  /**
   * Redo last undone action
   */
  redo(): void {
    if (!this.canRedo()) {
      console.log('Nothing to redo');
      return;
    }

    this.currentIndex++;
    const entry = this.history[this.currentIndex];
    this.restoreState(entry);

    console.log(`Redo: restored to state ${this.currentIndex + 1}/${this.history.length}`);
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.recordState();
  }

  /**
   * Get current history stats
   */
  getStats(): { current: number; total: number; canUndo: boolean; canRedo: boolean } {
    return {
      current: this.currentIndex + 1,
      total: this.history.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    };
  }
}
