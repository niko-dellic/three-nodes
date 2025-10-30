import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import * as prettier from 'prettier/standalone';
import prettierPluginTypescript from 'prettier/plugins/typescript';
import prettierPluginEstree from 'prettier/plugins/estree';

export interface CodeMirrorEditorOptions {
  containerId: string;
  initialCode?: string;
  readOnly?: boolean;
}

/**
 * Unified CodeMirror editor component that handles both editable and read-only modes
 * Supports formatting, fullscreen, and keyboard event management
 */
export class CodeMirrorEditor {
  private editorView?: EditorView;
  private container?: HTMLElement;
  private originalParent?: HTMLElement;
  private readonly containerId: string;
  private readOnly: boolean; // Made mutable to support dynamic switching

  constructor(options: CodeMirrorEditorOptions) {
    this.containerId = options.containerId;
    this.readOnly = options.readOnly ?? false;
  }

  /**
   * Initialize the editor with formatted code
   */
  async initialize(code: string): Promise<void> {
    this.container = document.getElementById(this.containerId) as HTMLElement;
    if (!this.container) {
      throw new Error(`Container with id "${this.containerId}" not found`);
    }

    // Format code before displaying
    const formattedCode = await this.formatCode(code);

    // Create the editor
    await this.createEditor(formattedCode);
  }

  /**
   * Create the CodeMirror editor with current configuration
   */
  private async createEditor(code: string): Promise<void> {
    if (!this.container) return;

    // Create editor extensions
    const extensions = this.createExtensions();

    // Create editor
    this.editorView = new EditorView({
      state: EditorState.create({
        doc: code,
        extensions,
      }),
      parent: this.container,
    });

    // Set up keyboard event handling
    this.setupKeyboardHandling();
  }

  /**
   * Create the extensions array based on current configuration
   */
  private createExtensions(): any[] {
    const extensions = [
      basicSetup,
      javascript({ typescript: true }),
      EditorView.lineWrapping,
      vscodeDark,
    ];

    // Add read-only extensions if needed
    if (this.readOnly) {
      extensions.push(EditorView.editable.of(false));
      extensions.push(EditorState.readOnly.of(true));
    }

    return extensions;
  }

  /**
   * Set up keyboard event handling
   */
  private setupKeyboardHandling(): void {
    if (!this.container) return;

    // Block keyboard shortcuts from propagating to the graph editor
    this.container.addEventListener(
      'keydown',
      (e) => {
        if ((e.target as HTMLElement).closest('.cm-editor')) {
          e.stopPropagation();
        }
      },
      true
    );
  }

  /**
   * Get the current code from the editor
   */
  getCode(): string {
    return this.editorView?.state.doc.toString() || '';
  }

  /**
   * Get the current readonly state
   */
  isReadOnly(): boolean {
    return this.readOnly;
  }

  /**
   * Update the editor content
   */
  async setCode(code: string, format: boolean = true): Promise<void> {
    if (!this.editorView) return;

    const finalCode = format ? await this.formatCode(code) : code;

    this.editorView.dispatch({
      changes: {
        from: 0,
        to: this.editorView.state.doc.length,
        insert: finalCode,
      },
    });
  }

  /**
   * Format the current editor code
   */
  async formatCurrentCode(): Promise<void> {
    if (!this.editorView) {
      console.warn('No editor view available to format');
      return;
    }

    try {
      const currentCode = this.getCode();
      const formattedCode = await this.formatCode(currentCode);

      this.editorView.dispatch({
        changes: {
          from: 0,
          to: this.editorView.state.doc.length,
          insert: formattedCode,
        },
      });

      console.log('Code formatted successfully');
    } catch (error) {
      console.error('Failed to format code:', error);
      throw error;
    }
  }

  /**
   * Format code using Prettier
   */
  private async formatCode(code: string): Promise<string> {
    try {
      const formatted = await prettier.format(code, {
        parser: 'typescript',
        plugins: [prettierPluginTypescript, prettierPluginEstree],
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
        printWidth: 80,
      });
      return formatted;
    } catch (error) {
      console.error('Prettier formatting error:', error);
      return code; // Return original code if formatting fails
    }
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen(): void {
    if (!this.container || !this.editorView) return;

    const existingFullscreen = document.querySelector('.code-editor-fullscreen');

    if (existingFullscreen) {
      // Exit fullscreen
      this.exitFullscreen(existingFullscreen as HTMLElement);
    } else {
      // Enter fullscreen
      this.enterFullscreen();
    }
  }

  /**
   * Enter fullscreen mode
   */
  private enterFullscreen(): void {
    if (!this.container) return;

    // Store original parent
    this.originalParent = this.container.parentElement as HTMLElement;

    const fullscreenWrapper = document.createElement('div');
    fullscreenWrapper.className = 'code-editor-fullscreen';

    // Create button container for top-right controls
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText =
      'position: absolute; top: 0.5rem; right: 0.5rem; display: flex; gap: 0.5rem; z-index: 1000;';

    // Add format button if not read-only
    if (!this.isReadOnly()) {
      const formatBtn = document.createElement('button');
      formatBtn.textContent = 'Format';
      formatBtn.className = 'code-editor-fullscreen-close'; // Reuse same style
      formatBtn.onclick = async () => {
        const currentCode = this.getCode();
        const formatted = await this.formatCode(currentCode);
        this.setCode(formatted);
      };
      buttonContainer.appendChild(formatBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.className = 'code-editor-fullscreen-close';
    closeBtn.onclick = () => this.toggleFullscreen();
    buttonContainer.appendChild(closeBtn);

    fullscreenWrapper.appendChild(buttonContainer);

    // Add Escape key listener
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.toggleFullscreen();
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Store handler reference for cleanup
    (fullscreenWrapper as any).__escapeHandler = escapeHandler;

    // Move container to fullscreen (preserves all state)
    this.container.className = this.isReadOnly()
      ? 'code-viewer-container-fullscreen'
      : 'code-editor-container-fullscreen';
    fullscreenWrapper.appendChild(this.container);
    document.body.appendChild(fullscreenWrapper);
  }

  /**
   * Exit fullscreen mode
   */
  private exitFullscreen(fullscreenWrapper: HTMLElement): void {
    if (!this.container || !this.originalParent) return;

    // Remove escape key listener
    const escapeHandler = (fullscreenWrapper as any).__escapeHandler;
    if (escapeHandler) {
      document.removeEventListener('keydown', escapeHandler);
    }

    fullscreenWrapper.parentElement?.removeChild(fullscreenWrapper);

    // Restore original container class and parent
    this.container.className = this.isReadOnly()
      ? 'code-viewer-container'
      : 'code-editor-container';
    this.originalParent.appendChild(this.container);
    this.originalParent = undefined;
  }

  /**
   * Check if editor is in fullscreen mode
   */
  isFullscreen(): boolean {
    return !!document.querySelector('.code-editor-fullscreen');
  }

  /**
   * Switch between readonly and editable modes
   * Note: This recreates the editor with the new configuration
   */
  async setReadOnly(readOnly: boolean): Promise<void> {
    if (!this.editorView || !this.container) return;

    // Store current content
    const currentCode = this.getCode();

    // Update readonly state
    this.readOnly = readOnly;

    // Destroy current editor
    this.editorView.destroy();
    this.editorView = undefined;

    // Clear container
    this.container.innerHTML = '';

    // Recreate editor with new configuration
    await this.createEditor(currentCode);
  }

  /**
   * Dispose the editor and clean up resources
   */
  dispose(): void {
    // Exit fullscreen if active
    const existingFullscreen = document.querySelector('.code-editor-fullscreen');
    if (existingFullscreen) {
      this.exitFullscreen(existingFullscreen as HTMLElement);
    }

    // Destroy editor
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = undefined;
    }

    this.container = undefined;
    this.originalParent = undefined;
  }
}
