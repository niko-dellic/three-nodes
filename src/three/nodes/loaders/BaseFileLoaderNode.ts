import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { FilePickerHelper } from '../mixins/FilePickerMixin';

/**
 * Base class for file loader nodes
 * Provides common file picker UI and loading pattern
 */
export abstract class BaseFileLoaderNode<
  TOutputs extends string = 'scene' | 'loaded',
> extends TweakpaneNode<never, TOutputs> {
  protected filePicker: FilePickerHelper;
  protected loadedObject: THREE.Object3D | null = null;

  constructor(id: string, type: string, label: string, acceptedFileTypes: string) {
    super(id, type, label);

    // Property to store file path
    this.addProperty({
      name: 'filePath',
      type: 'string',
      value: '',
      label: 'File Path',
    });

    // Initialize file picker helper
    this.filePicker = new FilePickerHelper({
      acceptedFileTypes,
      buttonLabel: 'Load File',
      onFileSelected: async (file, url) => {
        await this.handleFileSelected(file, url);
      },
      onFileCleared: () => {
        this.clearFile();
      },
    });

    this.addOutput({ name: 'scene', type: PortType.Scene }); // Scene is just an Object3D
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
      // Load the file (implemented by subclass)
      await this.loadFile(url, file);

      // Refresh UI to show file name
      if (this.pane && this.container) {
        this.pane.dispose();
        this.initializeTweakpane(this.container);
      }

      // Mark this node and all downstream nodes as dirty
      this.markDownstreamDirty();

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
      this.setProperty('filePath', '');
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
    this.loadedObject = null;
    if (this.pane && this.container) {
      this.pane.dispose();
      this.initializeTweakpane(this.container);
    }
    
    // Mark this node and all downstream nodes as dirty
    this.markDownstreamDirty();

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
    this.filePicker.dispose();
    if (this.loadedObject) {
      this.loadedObject = null;
    }
    super.dispose();
  }
}
