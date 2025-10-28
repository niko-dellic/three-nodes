import { GraphEditor } from './GraphEditor';
import { LiveViewport } from './LiveViewport';

export type ViewMode = 'editor' | 'viewport';

export class ViewModeManager {
  private currentMode: ViewMode = 'editor';
  private liveViewport: LiveViewport;
  private editorContainer: HTMLElement;
  private toggleButton: HTMLButtonElement;
  private appContainer: HTMLElement;

  constructor(
    _graphEditor: GraphEditor,
    liveViewport: LiveViewport,
    editorContainer: HTMLElement,
    appContainer: HTMLElement
  ) {
    this.liveViewport = liveViewport;
    this.editorContainer = editorContainer;
    this.appContainer = appContainer;

    // Create toggle button
    this.toggleButton = this.createToggleButton();

    this.setupEventListeners();
    this.updateMode();
  }

  private createToggleButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'toolbar-button';
    button.id = 'toggle-button';
    button.textContent = 'View 3D';

    // Find the toggle button container in the toolbar
    const container = document.getElementById('toggle-button-container');
    if (container) {
      container.appendChild(button);
    } else {
      // Fallback to appContainer if toolbar not found
      this.appContainer.appendChild(button);
    }

    return button;
  }

  private setupEventListeners(): void {
    // Tab key to toggle
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.toggle();
      }
    });

    // Button click
    this.toggleButton.addEventListener('click', () => {
      this.toggle();
    });
  }

  toggle(): void {
    this.currentMode = this.currentMode === 'editor' ? 'viewport' : 'editor';
    this.updateMode();
  }

  setMode(mode: ViewMode): void {
    this.currentMode = mode;
    this.updateMode();
  }

  private updateMode(): void {
    if (this.currentMode === 'editor') {
      this.editorContainer.classList.remove('hidden');
      this.liveViewport.setControlsEnabled(false);
      this.toggleButton.textContent = 'View 3D';
    } else {
      this.editorContainer.classList.add('hidden');
      this.liveViewport.setControlsEnabled(true);
      this.toggleButton.textContent = 'Edit Nodes';
    }
  }

  getCurrentMode(): ViewMode {
    return this.currentMode;
  }
}
