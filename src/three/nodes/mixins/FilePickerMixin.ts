import { Pane } from 'tweakpane';

/**
 * File picker functionality that can be used by any TweakpaneNode
 * Provides file selection UI and callbacks
 */
export interface FilePickerConfig {
  acceptedFileTypes: string; // e.g., ".jpg,.png,.webp" or ".gltf,.glb"
  buttonLabel?: string; // e.g., "Select Texture" or "Load Model"
  onFileSelected: (file: File, url: string) => Promise<void>;
  onFileCleared?: () => void;
  showClearButton?: boolean;
}

export class FilePickerHelper {
  private fileInput: HTMLInputElement | null = null;
  private config: FilePickerConfig;
  private currentFilePath: string = '';
  private isLoading: boolean = false;

  constructor(config: FilePickerConfig) {
    this.config = config;
  }

  /**
   * Add file picker buttons to a Tweakpane instance
   */
  addFilePickerControls(pane: Pane, filePath: string = ''): void {
    this.currentFilePath = filePath;

    const fileName = filePath
      ? filePath.split('/').pop() || filePath.split('\\').pop() || 'No file'
      : 'No file selected';

    const buttonLabel = this.config.buttonLabel || 'Select File';
    const displayLabel = filePath ? `📁 ${fileName}` : `📁 ${buttonLabel}`;

    pane.addButton({ title: displayLabel }).on('click', () => this.openFilePicker());

    if (filePath && (this.config.showClearButton ?? true)) {
      pane.addButton({ title: '🗑️ Clear' }).on('click', () => this.clearFile());
    }
  }

  /**
   * Open the file picker dialog
   */
  public openFilePicker(): void {
    // Create file input if it doesn't exist
    if (!this.fileInput) {
      this.fileInput = document.createElement('input');
      this.fileInput.type = 'file';
      this.fileInput.accept = this.config.acceptedFileTypes;
      this.fileInput.style.display = 'none';
      document.body.appendChild(this.fileInput);

      this.fileInput.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          const file = target.files[0];
          this.handleFileSelected(file);
        }
      });
    }

    // Trigger file picker
    this.fileInput.click();
  }

  /**
   * Handle file selection
   */
  private async handleFileSelected(file: File): Promise<void> {
    // Create URL for the file
    const url = URL.createObjectURL(file);

    // Mark as loading
    this.isLoading = true;

    try {
      // Call the callback provided by the node
      await this.config.onFileSelected(file, url);
    } catch (error) {
      console.error(`Error loading file ${file.name}:`, error);
      throw error;
    } finally {
      // Clean up object URL
      URL.revokeObjectURL(url);
      this.isLoading = false;

      // Clear the file input value to allow selecting the same file again
      if (this.fileInput) {
        this.fileInput.value = '';
      }
    }
  }

  /**
   * Clear the selected file
   */
  public clearFile(): void {
    this.currentFilePath = '';

    // Clear the file input value to allow selecting the same file again
    if (this.fileInput) {
      this.fileInput.value = '';
    }

    if (this.config.onFileCleared) {
      this.config.onFileCleared();
    }
  }

  /**
   * Get the current file path
   */
  getCurrentFilePath(): string {
    return this.currentFilePath;
  }

  /**
   * Check if currently loading
   */
  isCurrentlyLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.fileInput) {
      this.fileInput.remove();
      this.fileInput = null;
    }
  }
}
