import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import { FilePickerHelper } from '../mixins/FilePickerMixin';

/**
 * JSON Loader Node
 *
 * Loads JSON files and outputs the parsed data
 */
export class JSONLoaderNode extends TweakpaneNode<never, 'data' | 'loaded'> {
  protected filePicker: FilePickerHelper;
  private loadedData: any = null;

  constructor(id: string) {
    super(id, 'JSONLoaderNode', 'JSON Loader');

    // Property to store file path
    this.addProperty({
      name: 'filePath',
      type: 'string',
      value: '',
      label: 'File Path',
    });

    // Initialize file picker helper
    this.filePicker = new FilePickerHelper({
      acceptedFileTypes: '.json',
      buttonLabel: 'Load JSON',
      onFileSelected: async (file, url) => {
        await this.handleFileSelected(file, url);
      },
      onFileCleared: () => {
        this.clearFile();
      },
    });

    this.addOutput({ name: 'data', type: PortType.Any });
    this.addOutput({ name: 'loaded', type: PortType.Boolean });
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    // Add file picker controls using the helper
    const filePath = this.getProperty('filePath') || '';
    this.filePicker.addFilePickerControls(this.pane, filePath);
  }

  protected async handleFileSelected(file: File, url: string): Promise<void> {
    // Store file path (or name since we can't get real path in browser)
    this.setProperty('filePath', file.name);
    this.markDirty();

    try {
      // Load and parse the JSON file
      const response = await fetch(url);
      const text = await response.text();
      this.loadedData = JSON.parse(text);

      console.log(`Loaded JSON: ${file.name}`, this.loadedData);

      // Refresh UI to show file name
      if (this.pane && this.container) {
        this.pane.dispose();
        this.initializeTweakpane(this.container);
      }

      this.markDirty();

      // Force graph change notification to trigger evaluation
      if (this.graph) {
        setTimeout(() => {
          if (this.graph) {
            this.graph.triggerChange();
          }
        }, 0);
      }
    } catch (error) {
      console.error(`Error loading JSON file ${file.name}:`, error);
      this.setProperty('filePath', '');
      this.loadedData = null;

      if (this.pane && this.container) {
        this.pane.dispose();
        this.initializeTweakpane(this.container);
      }

      // Trigger change to clear outputs
      if (this.graph) {
        this.graph.triggerChange();
      }
      throw error; // Re-throw so the helper knows it failed
    }
  }

  protected clearFile(): void {
    this.setProperty('filePath', '');
    this.loadedData = null;

    if (this.pane && this.container) {
      this.pane.dispose();
      this.initializeTweakpane(this.container);
    }

    this.markDirty();

    // Force graph change notification to clear outputs
    if (this.graph) {
      this.graph.triggerChange();
    }
  }

  evaluate(_context: EvaluationContext): void {
    if (this.loadedData !== null) {
      this.setOutputValue('data', this.loadedData);
      this.setOutputValue('loaded', true);
    } else {
      this.setOutputValue('data', undefined);
      this.setOutputValue('loaded', false);
    }
  }

  getControlHeight(): number {
    const filePath = this.getProperty('filePath') || '';
    return filePath ? 60 : 30; // Show clear button if file is loaded
  }

  dispose(): void {
    this.filePicker.dispose();
    this.loadedData = null;
    super.dispose();
  }
}
