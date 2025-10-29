import { Graph } from '@/core/Graph';
import { serializeGraphToJSON } from '@/core/serializer';
import { deserializeGraphFromJSON } from '@/core/deserializer';
import { NodeRegistry } from '@/three/NodeRegistry';

interface SavedGraph {
  id: string;
  name: string;
  timestamp: number;
  data: string; // Serialized JSON
}

export class SaveLoadManager {
  private readonly STORAGE_KEY = 'three-nodes-saved-graphs';
  private registry: NodeRegistry;
  private graph: Graph;
  private modal: HTMLElement | null = null;
  private onLoadCallback?: (graph: Graph) => void;

  constructor(graph: Graph, registry: NodeRegistry) {
    this.graph = graph;
    this.registry = registry;
  }

  /**
   * Save the current graph to local storage
   */
  saveGraph(name?: string): void {
    const timestamp = Date.now();
    const defaultName = `Graph ${new Date(timestamp).toLocaleString()}`;
    const graphName = name || defaultName;

    const serializedData = serializeGraphToJSON(this.graph);

    const savedGraph: SavedGraph = {
      id: `graph-${timestamp}`,
      name: graphName,
      timestamp,
      data: serializedData,
    };

    // Get existing saved graphs
    const savedGraphs = this.getSavedGraphs();
    savedGraphs.push(savedGraph);

    // Save to local storage
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(savedGraphs));
      this.showNotification(`Graph saved as "${graphName}"`, 'success');
    } catch (error) {
      console.error('Failed to save graph:', error);
      this.showNotification('Failed to save graph. Storage might be full.', 'error');
    }
  }

  /**
   * Get all saved graphs from local storage
   */
  private getSavedGraphs(): SavedGraph[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load saved graphs:', error);
      return [];
    }
  }

  /**
   * Load a specific graph by ID
   */
  private loadGraphById(id: string): void {
    const savedGraphs = this.getSavedGraphs();
    const savedGraph = savedGraphs.find((g) => g.id === id);

    if (!savedGraph) {
      this.showNotification('Graph not found', 'error');
      return;
    }

    try {
      const newGraph = deserializeGraphFromJSON(savedGraph.data, this.registry);

      // Clear the current graph
      this.graph.clear();

      // Add all nodes from the loaded graph
      for (const node of newGraph.nodes.values()) {
        this.graph.addNode(node);
      }

      // Add all edges from the loaded graph
      for (const edge of newGraph.edges.values()) {
        this.graph.edges.set(edge.id, edge);
      }

      this.showNotification(`Loaded "${savedGraph.name}"`, 'success');

      // Call the load callback if set
      if (this.onLoadCallback) {
        this.onLoadCallback(this.graph);
      }
    } catch (error) {
      console.error('Failed to load graph:', error);
      this.showNotification('Failed to load graph. Data might be corrupted.', 'error');
    }
  }

  /**
   * Delete a saved graph by ID
   */
  private deleteGraphById(id: string): void {
    const savedGraphs = this.getSavedGraphs();
    const filteredGraphs = savedGraphs.filter((g) => g.id !== id);

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredGraphs));
      this.showNotification('Graph deleted', 'success');
      // Refresh the modal if it's open
      if (this.modal) {
        this.showLoadModal();
      }
    } catch (error) {
      console.error('Failed to delete graph:', error);
      this.showNotification('Failed to delete graph', 'error');
    }
  }

  /**
   * Show the save dialog
   */
  showSaveDialog(): void {
    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'save-load-modal';
    modal.innerHTML = `
      <div class="modal-header">
        <h2>Save Graph</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <label for="graph-name">Graph Name:</label>
        <input 
          type="text" 
          id="graph-name" 
          placeholder="My Graph" 
          value="Graph ${new Date().toLocaleString()}"
        />
      </div>
      <div class="modal-footer">
        <button class="modal-button cancel">Cancel</button>
        <button class="modal-button save">Save</button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Get elements
    const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('.cancel') as HTMLButtonElement;
    const saveBtn = modal.querySelector('.save') as HTMLButtonElement;
    const nameInput = modal.querySelector('#graph-name') as HTMLInputElement;

    // Focus and select the input
    setTimeout(() => {
      nameInput.focus();
      nameInput.select();
    }, 0);

    // Close handlers
    const close = () => backdrop.remove();
    closeBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    // Save handler
    const save = () => {
      const name = nameInput.value.trim();
      if (name) {
        this.saveGraph(name);
        close();
      }
    };

    saveBtn.addEventListener('click', save);
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        close();
      }
    });
  }

  /**
   * Show the load modal with saved graphs list
   */
  showLoadModal(): void {
    // Remove existing modal if any
    if (this.modal) {
      this.modal.parentElement?.remove();
      this.modal = null;
    }

    const savedGraphs = this.getSavedGraphs();

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'save-load-modal load-modal';
    this.modal = modal;

    const header = `
      <div class="modal-header">
        <h2>Load Graph</h2>
        <button class="modal-close">&times;</button>
      </div>
    `;

    let body = '';
    if (savedGraphs.length === 0) {
      body = `
        <div class="modal-body">
          <p class="empty-message">No saved graphs yet. Save your current graph to see it here.</p>
        </div>
      `;
    } else {
      // Sort by timestamp, most recent first
      savedGraphs.sort((a, b) => b.timestamp - a.timestamp);

      body = `
        <div class="modal-body">
          <div class="saved-graphs-list">
            ${savedGraphs
              .map(
                (graph) => `
              <div class="saved-graph-item" data-id="${graph.id}">
                <div class="graph-info">
                  <div class="graph-name">${this.escapeHtml(graph.name)}</div>
                  <div class="graph-date">${new Date(graph.timestamp).toLocaleString()}</div>
                </div>
                <div class="graph-actions">
                  <button class="graph-action-btn load-btn" data-id="${graph.id}" title="Load">
                    <i class="ph ph-folder-open"></i>
                  </button>
                  <button class="graph-action-btn delete-btn" data-id="${graph.id}" title="Delete">
                    <i class="ph ph-trash"></i>
                  </button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    const footer = `
      <div class="modal-footer">
        <button class="modal-button cancel">Close</button>
      </div>
    `;

    modal.innerHTML = header + body + footer;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Get elements
    const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('.cancel') as HTMLButtonElement;

    // Close handlers
    const close = () => {
      backdrop.remove();
      this.modal = null;
    };
    closeBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    // Add event listeners for load and delete buttons
    const loadBtns = modal.querySelectorAll('.load-btn');
    loadBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id!;
        this.loadGraphById(id);
        close();
      });
    });

    const deleteBtns = modal.querySelectorAll('.delete-btn');
    deleteBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id!;
        const graph = savedGraphs.find((g) => g.id === id);
        if (graph && confirm(`Delete "${graph.name}"?`)) {
          this.deleteGraphById(id);
        }
      });
    });

    // Allow clicking on the graph item to load it
    const graphItems = modal.querySelectorAll('.saved-graph-item');
    graphItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        // Don't load if clicking on action buttons
        if ((e.target as HTMLElement).closest('.graph-actions')) return;

        const id = (item as HTMLElement).dataset.id!;
        this.loadGraphById(id);
        close();
      });
    });
  }

  /**
   * Set a callback to be called when a graph is loaded
   */
  onLoad(callback: (graph: Graph) => void): void {
    this.onLoadCallback = callback;
  }

  /**
   * Show a temporary notification
   */
  private showNotification(message: string, type: 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Export graph as JSON file
   */
  exportToFile(): void {
    const serializedData = serializeGraphToJSON(this.graph);
    const blob = new Blob([serializedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showNotification('Graph exported to file', 'success');
  }

  /**
   * Import graph from JSON file
   */
  importFromFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result as string;
          const newGraph = deserializeGraphFromJSON(data, this.registry);

          // Clear the current graph
          this.graph.clear();

          // Add all nodes from the loaded graph
          for (const node of newGraph.nodes.values()) {
            this.graph.addNode(node);
          }

          // Add all edges from the loaded graph
          for (const edge of newGraph.edges.values()) {
            this.graph.edges.set(edge.id, edge);
          }

          this.showNotification('Graph imported successfully', 'success');

          // Call the load callback if set
          if (this.onLoadCallback) {
            this.onLoadCallback(this.graph);
          }
        } catch (error) {
          console.error('Failed to import graph:', error);
          this.showNotification('Failed to import graph. Invalid file format.', 'error');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }
}
