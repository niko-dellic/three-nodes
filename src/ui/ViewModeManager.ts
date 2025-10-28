import { GraphEditor } from './GraphEditor';
import { LiveViewport } from './LiveViewport';

export type ViewMode = 'editor' | 'viewport';

export class ViewModeManager {
  private currentMode: ViewMode = 'editor';
  private liveViewport: LiveViewport;
  private editorContainer: HTMLElement;
  private toggleButton: HTMLButtonElement;

  constructor(
    _graphEditor: GraphEditor,
    liveViewport: LiveViewport,
    editorContainer: HTMLElement,
    toggleButton: HTMLButtonElement
  ) {
    this.liveViewport = liveViewport;
    this.editorContainer = editorContainer;
    this.toggleButton = toggleButton;

    this.setupEventListeners();
    this.updateMode();
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
