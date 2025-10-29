import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import { FilePickerHelper } from '../mixins/FilePickerMixin';
import * as d3 from 'd3';

/**
 * CSV Loader Node
 *
 * Loads CSV files using d3.csv and outputs the parsed data
 */
export class CSVLoaderNode extends TweakpaneNode<never, 'data' | 'loaded' | 'columns'> {
  protected filePicker: FilePickerHelper;
  private loadedData: any[] = [];
  private columns: string[] = [];

  constructor(id: string) {
    super(id, 'CSVLoaderNode', 'CSV Loader');

    // Property to store file path
    this.addProperty({
      name: 'filePath',
      type: 'string',
      value: '',
      label: 'File Path',
    });

    // Initialize file picker helper
    this.filePicker = new FilePickerHelper({
      acceptedFileTypes: '.csv',
      buttonLabel: 'Load CSV',
      onFileSelected: async (file, url) => {
        await this.handleFileSelected(file, url);
      },
      onFileCleared: () => {
        this.clearFile();
      },
    });

    this.addOutput({ name: 'data', type: PortType.Any }); // Array of objects
    this.addOutput({ name: 'columns', type: PortType.Any }); // Array of column names
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
      // Load and parse the CSV file using d3.csv
      const data = await d3.csv(url);
      this.loadedData = data;

      // Extract column names from the first row
      if (data.length > 0) {
        this.columns = data.columns || Object.keys(data[0]);
      } else {
        this.columns = [];
      }

      console.log(`Loaded CSV: ${file.name}`, {
        rows: this.loadedData.length,
        columns: this.columns,
        data: this.loadedData,
      });

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
      console.error(`Error loading CSV file ${file.name}:`, error);
      this.setProperty('filePath', '');
      this.loadedData = [];
      this.columns = [];

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
    this.loadedData = [];
    this.columns = [];

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
    if (this.loadedData.length > 0) {
      this.setOutputValue('data', this.loadedData);
      this.setOutputValue('columns', this.columns);
      this.setOutputValue('loaded', true);
    } else {
      this.setOutputValue('data', undefined);
      this.setOutputValue('columns', undefined);
      this.setOutputValue('loaded', false);
    }
  }

  getControlHeight(): number {
    const filePath = this.getProperty('filePath') || '';
    return filePath ? 60 : 30; // Show clear button if file is loaded
  }

  dispose(): void {
    this.filePicker.dispose();
    this.loadedData = [];
    this.columns = [];
    super.dispose();
  }
}
