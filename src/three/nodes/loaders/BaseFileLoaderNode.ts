import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Base class for file loader nodes
 * Provides common file picker UI and loading pattern
 */
export abstract class BaseFileLoaderNode<
  TOutputs extends string = 'scene' | 'loaded',
> extends TweakpaneNode<never, TOutputs> {
  protected fileInput: HTMLInputElement | null = null;
  protected loadedObject: THREE.Object3D | null = null;
  protected isLoading: boolean = false;

  constructor(id: string, type: string, label: string, acceptedFileTypes: string) {
    super(id, type, label);

    // Property to store file path
    this.addProperty({
      name: 'filePath',
      type: 'string',
      value: '',
      label: 'File Path',
    });

    this.addProperty({
      name: 'acceptedTypes',
      type: 'string',
      value: acceptedFileTypes,
      label: 'Accepted Types',
    });

    this.addOutput({ name: 'scene', type: PortType.Scene }); // Scene is just an Object3D
    this.addOutput({ name: 'loaded', type: PortType.Boolean });
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    const params = {
      selectFile: () => this.openFilePicker(),
      clearFile: () => this.clearFile(),
    };

    // Show current file name if loaded
    const filePath = this.getProperty('filePath') || '';
    const fileName = filePath
      ? filePath.split('/').pop() || filePath.split('\\').pop() || 'No file'
      : 'No file selected';

    this.pane.addButton({ title: `📁 ${fileName}` }).on('click', params.selectFile);

    if (filePath) {
      this.pane.addButton({ title: '🗑️ Clear' }).on('click', params.clearFile);
    }
  }

  protected openFilePicker(): void {
    // Create file input if it doesn't exist
    if (!this.fileInput) {
      this.fileInput = document.createElement('input');
      this.fileInput.type = 'file';
      this.fileInput.accept = this.getProperty('acceptedTypes') || '*';
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

  protected async handleFileSelected(file: File): Promise<void> {
    // Store file path (or name since we can't get real path in browser)
    this.setProperty('filePath', file.name);

    // Create URL for the file
    const url = URL.createObjectURL(file);

    // Mark as loading
    this.isLoading = true;
    this.markDirty();

    try {
      // Load the file (implemented by subclass)
      await this.loadFile(url, file);

      // Refresh UI to show file name
      if (this.pane && this.container) {
        this.pane.dispose();
        this.initializeTweakpane(this.container);
      }

      // Mark as loaded
      this.isLoading = false;
      this.markDirty();

      // Force graph change notification to trigger evaluation
      // Use setTimeout to ensure the evaluation happens after this async operation completes
      if (this.graph) {
        setTimeout(() => {
          if (this.graph) {
            this.graph.triggerChange();
          }
        }, 0);
      }
    } catch (error) {
      console.error(`Error loading file ${file.name}:`, error);
      this.isLoading = false;
      this.setProperty('filePath', '');
      if (this.pane && this.container) {
        this.pane.dispose();
        this.initializeTweakpane(this.container);
      }

      // Trigger change to clear outputs
      if (this.graph) {
        this.graph.triggerChange();
      }
    } finally {
      // Clean up object URL
      URL.revokeObjectURL(url);
    }
  }

  protected clearFile(): void {
    this.setProperty('filePath', '');
    this.loadedObject = null;
    if (this.pane && this.container) {
      this.pane.dispose();
      this.initializeTweakpane(this.container);
    }
    this.markDirty();

    // Force graph change notification to clear outputs and preview
    if (this.graph) {
      this.graph.triggerChange();
    }
  }

  /**
   * Load file from URL - implemented by subclasses
   */
  protected abstract loadFile(url: string, file: File): Promise<void>;

  evaluate(_context: EvaluationContext): void {
    if (this.loadedObject) {
      this.setOutputValue('scene', this.loadedObject);
      this.setOutputValue('loaded', true);
    } else {
      this.setOutputValue('scene', undefined);
      this.setOutputValue('loaded', false);
    }
  }

  getControlHeight(): number {
    const filePath = this.getProperty('filePath') || '';
    return filePath ? 60 : 30; // Show clear button if file is loaded
  }

  dispose(): void {
    if (this.fileInput) {
      this.fileInput.remove();
      this.fileInput = null;
    }
    if (this.loadedObject) {
      this.loadedObject = null;
    }
    super.dispose();
  }
}
