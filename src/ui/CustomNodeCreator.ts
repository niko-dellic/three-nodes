import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { CustomNodeDefinition } from '@/types/customNode';
import { PortType, PortDefinition } from '@/types';
import { PropertyConfig, PropertyType } from '@/core/types';
import { CustomNodeManager } from '@/three/CustomNodeManager';
import { AIAssistant } from '@/utils/AIAssistant';
import {
  createDefaultDefinition,
  exportCustomNodeToFile,
  importCustomNodeFromFile,
} from '@/utils/customNodeIO';

export class CustomNodeCreator {
  private panel: HTMLElement;
  private contentContainer: HTMLElement;
  private resizeHandle: HTMLElement;
  private isVisible: boolean = false;
  private manager: CustomNodeManager;
  private onNodeCreated?: () => void;

  // Resize properties
  private width: number = 500;
  private minWidth: number = 400;
  private isResizing: boolean = false;

  // Editor
  private editorView?: EditorView;

  // Current definition being edited
  private currentDefinition: Partial<CustomNodeDefinition>;

  // Port and property lists
  private inputsList: PortDefinition[] = [];
  private outputsList: PortDefinition[] = [];
  private propertiesList: PropertyConfig[] = [];

  constructor(container: HTMLElement, manager: CustomNodeManager) {
    this.manager = manager;
    this.currentDefinition = createDefaultDefinition();

    // Create main panel
    this.panel = document.createElement('div');
    this.panel.className = 'custom-node-creator';
    this.panel.style.display = 'none';

    // Create resize handle (left edge)
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'custom-node-creator-resize-handle';
    this.panel.appendChild(this.resizeHandle);

    // Create content container with scroll
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'custom-node-creator-content';
    this.panel.appendChild(this.contentContainer);

    container.appendChild(this.panel);

    // Set up resize functionality
    this.setupResize();

    // Set up keyboard event blocking for input fields
    this.setupKeyboardEventBlocking();

    // Load saved width from localStorage
    const savedWidth = localStorage.getItem('customNodeCreatorWidth');
    if (savedWidth) {
      this.width = Math.max(this.minWidth, parseInt(savedWidth, 10));
    }
    this.updateWidth();
  }

  private setupResize(): void {
    this.resizeHandle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.isResizing = true;
      this.resizeHandle.setPointerCapture(e.pointerId);
    });

    document.addEventListener('pointermove', (e) => {
      if (!this.isResizing) return;

      const containerRect = this.panel.parentElement!.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      this.width = Math.max(this.minWidth, newWidth);
      this.updateWidth();
    });

    document.addEventListener('pointerup', (e) => {
      if (this.isResizing) {
        this.isResizing = false;
        this.resizeHandle.releasePointerCapture(e.pointerId);
        // Save width to localStorage
        localStorage.setItem('customNodeCreatorWidth', this.width.toString());
      }
    });
  }

  private setupKeyboardEventBlocking(): void {
    // Prevent keyboard shortcuts from firing when typing in input fields
    const blockKeyboardEvent = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // Check if the event originated from an input field, textarea, select, or CodeMirror editor
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.closest('.cm-editor') // CodeMirror editor
      ) {
        // Stop the event from bubbling up to parent elements
        e.stopPropagation();
      }
    };

    // Add event listeners for all keyboard events that might trigger shortcuts
    this.panel.addEventListener('keydown', blockKeyboardEvent, true);
    this.panel.addEventListener('keyup', blockKeyboardEvent, true);
    this.panel.addEventListener('keypress', blockKeyboardEvent, true);
  }

  private updateWidth(): void {
    this.panel.style.width = `${this.width}px`;
  }

  show(): void {
    this.isVisible = true;
    this.panel.style.display = 'flex';
    this.currentDefinition = createDefaultDefinition();
    this.inputsList = [];
    this.outputsList = [];
    this.propertiesList = [];
    this.buildUI();

    // Add visible class after a brief delay for animation
    requestAnimationFrame(() => {
      this.panel.classList.add('visible');
    });
  }

  hide(): void {
    this.isVisible = false;
    this.panel.classList.remove('visible');

    // Cleanup editor
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = undefined;
    }

    setTimeout(() => {
      if (!this.isVisible) {
        this.panel.style.display = 'none';
      }
    }, 300);
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  onNodeCreatedCallback(callback: () => void): void {
    this.onNodeCreated = callback;
  }

  private buildUI(): void {
    this.contentContainer.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'custom-node-creator-header';
    header.innerHTML = '<h2>✨ Create Custom Node</h2>';

    const closeButton = document.createElement('button');
    closeButton.className = 'custom-node-creator-close';
    closeButton.textContent = '×';
    closeButton.onclick = () => this.hide();
    header.appendChild(closeButton);

    this.contentContainer.appendChild(header);

    // AI Assistant Section (at the top!)
    this.contentContainer.appendChild(this.createAIAssistantSection());

    // Node Definition Section
    this.contentContainer.appendChild(this.createNodeDefinitionSection());

    // Inputs Section
    this.contentContainer.appendChild(this.createPortsSection('Inputs', this.inputsList, true));

    // Outputs Section
    this.contentContainer.appendChild(this.createPortsSection('Outputs', this.outputsList, false));

    // Properties Section
    this.contentContainer.appendChild(this.createPropertiesSection());

    // Code Editor Section
    this.contentContainer.appendChild(this.createCodeEditorSection());

    // Actions Section (at bottom)
    this.contentContainer.appendChild(this.createActionsSection());
  }

  private createNodeDefinitionSection(): HTMLElement {
    const section = this.createSection('Node Definition');

    // Name
    section.appendChild(
      this.createInput(
        'name',
        'Node Name',
        'text',
        'MyCustomNode',
        'Unique identifier (use PascalCase)'
      )
    );

    // Label
    section.appendChild(
      this.createInput('label', 'Display Label', 'text', 'My Custom Node', 'Human-readable name')
    );

    // Category
    section.appendChild(
      this.createInput('category', 'Category', 'text', 'Custom', 'Menu category for organization')
    );

    // Description
    section.appendChild(
      this.createTextarea('description', 'Description', 'What does this node do?')
    );

    return section;
  }

  private createPortsSection(
    title: string,
    portsList: PortDefinition[],
    isInput: boolean
  ): HTMLElement {
    const section = this.createSection(title);

    const listContainer = document.createElement('div');
    listContainer.className = 'ports-list';
    section.appendChild(listContainer);

    const renderList = () => {
      listContainer.innerHTML = '';

      portsList.forEach((port, index) => {
        const portItem = document.createElement('div');
        portItem.className = 'port-item';

        const portInfo = document.createElement('div');
        portInfo.className = 'port-info';
        portInfo.innerHTML = `<strong>${port.name}</strong> <span class="port-type">(${port.type})</span>`;
        portItem.appendChild(portInfo);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'port-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = () => {
          portsList.splice(index, 1);
          renderList();
        };
        portItem.appendChild(removeBtn);

        listContainer.appendChild(portItem);
      });
    };

    renderList();

    // Add port button
    const addButton = document.createElement('button');
    addButton.className = 'add-port-btn';
    addButton.textContent = `+ Add ${isInput ? 'Input' : 'Output'}`;
    addButton.onclick = () => this.showAddPortDialog(portsList, isInput, renderList);
    section.appendChild(addButton);

    return section;
  }

  private showAddPortDialog(
    portsList: PortDefinition[],
    isInput: boolean,
    onUpdate: () => void
  ): void {
    const dialog = document.createElement('div');
    dialog.className = 'port-dialog';

    const overlay = document.createElement('div');
    overlay.className = 'port-dialog-overlay';
    overlay.onclick = () => document.body.removeChild(dialog);

    const content = document.createElement('div');
    content.className = 'port-dialog-content';
    content.innerHTML = `<h3>Add ${isInput ? 'Input' : 'Output'} Port</h3>`;

    const nameInput = this.createInput(
      'portName',
      'Port Name',
      'text',
      '',
      'e.g., value, position'
    );
    content.appendChild(nameInput);

    const typeSelect = document.createElement('div');
    typeSelect.className = 'form-group';
    typeSelect.innerHTML = `
      <label>Port Type</label>
      <select id="portType">
        ${Object.values(PortType)
          .map((type) => `<option value="${type}">${type}</option>`)
          .join('')}
      </select>
    `;
    content.appendChild(typeSelect);

    const actions = document.createElement('div');
    actions.className = 'dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => document.body.removeChild(dialog);
    actions.appendChild(cancelBtn);

    const addBtn = document.createElement('button');
    addBtn.className = 'primary-btn';
    addBtn.textContent = 'Add';
    addBtn.onclick = () => {
      const name = (nameInput.querySelector('input') as HTMLInputElement).value.trim();
      const type = (typeSelect.querySelector('select') as HTMLSelectElement).value as PortType;

      if (!name) {
        alert('Port name is required');
        return;
      }

      if (portsList.some((p) => p.name === name)) {
        alert('A port with this name already exists');
        return;
      }

      portsList.push({ name, type });
      onUpdate();
      document.body.removeChild(dialog);
    };
    actions.appendChild(addBtn);

    content.appendChild(actions);
    dialog.appendChild(overlay);
    dialog.appendChild(content);
    document.body.appendChild(dialog);

    // Focus name input
    requestAnimationFrame(() => {
      (nameInput.querySelector('input') as HTMLInputElement).focus();
    });
  }

  private createPropertiesSection(): HTMLElement {
    const section = this.createSection('Properties');

    const listContainer = document.createElement('div');
    listContainer.className = 'properties-list';
    section.appendChild(listContainer);

    const renderList = () => {
      listContainer.innerHTML = '';

      this.propertiesList.forEach((prop, index) => {
        const propItem = document.createElement('div');
        propItem.className = 'property-item';

        const propInfo = document.createElement('div');
        propInfo.className = 'property-info';
        propInfo.innerHTML = `<strong>${prop.name}</strong> <span class="property-type">(${prop.type})</span>`;
        propItem.appendChild(propInfo);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'property-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = () => {
          this.propertiesList.splice(index, 1);
          renderList();
        };
        propItem.appendChild(removeBtn);

        listContainer.appendChild(propItem);
      });
    };

    renderList();

    // Add property button
    const addButton = document.createElement('button');
    addButton.className = 'add-property-btn';
    addButton.textContent = '+ Add Property';
    addButton.onclick = () => this.showAddPropertyDialog(renderList);
    section.appendChild(addButton);

    return section;
  }

  private showAddPropertyDialog(onUpdate: () => void): void {
    const dialog = document.createElement('div');
    dialog.className = 'port-dialog';

    const overlay = document.createElement('div');
    overlay.className = 'port-dialog-overlay';
    overlay.onclick = () => document.body.removeChild(dialog);

    const content = document.createElement('div');
    content.className = 'port-dialog-content';
    content.innerHTML = '<h3>Add Property</h3>';

    const nameInput = this.createInput(
      'propName',
      'Property Name',
      'text',
      '',
      'e.g., multiplier, enabled'
    );
    content.appendChild(nameInput);

    const typeSelect = document.createElement('div');
    typeSelect.className = 'form-group';
    typeSelect.innerHTML = `
      <label>Property Type</label>
      <select id="propType">
        <option value="number">number</option>
        <option value="string">string</option>
        <option value="boolean">boolean</option>
        <option value="color">color</option>
      </select>
    `;
    content.appendChild(typeSelect);

    const valueInput = this.createInput('propValue', 'Default Value', 'text', '', 'Default value');
    content.appendChild(valueInput);

    const actions = document.createElement('div');
    actions.className = 'dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => document.body.removeChild(dialog);
    actions.appendChild(cancelBtn);

    const addBtn = document.createElement('button');
    addBtn.className = 'primary-btn';
    addBtn.textContent = 'Add';
    addBtn.onclick = () => {
      const name = (nameInput.querySelector('input') as HTMLInputElement).value.trim();
      const type = (typeSelect.querySelector('select') as HTMLSelectElement).value as PropertyType;
      const valueStr = (valueInput.querySelector('input') as HTMLInputElement).value.trim();

      if (!name) {
        alert('Property name is required');
        return;
      }

      if (this.propertiesList.some((p) => p.name === name)) {
        alert('A property with this name already exists');
        return;
      }

      // Convert value to appropriate type
      let value: any = valueStr;
      if (type === 'number') {
        value = parseFloat(valueStr) || 0;
      } else if (type === 'boolean') {
        value = valueStr.toLowerCase() === 'true';
      }

      this.propertiesList.push({ name, type, value, label: name });
      onUpdate();
      document.body.removeChild(dialog);
    };
    actions.appendChild(addBtn);

    content.appendChild(actions);
    dialog.appendChild(overlay);
    dialog.appendChild(content);
    document.body.appendChild(dialog);

    requestAnimationFrame(() => {
      (nameInput.querySelector('input') as HTMLInputElement).focus();
    });
  }

  private createCodeEditorSection(): HTMLElement {
    const section = this.createSection('Evaluate Function');

    // Fullscreen button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'code-editor-fullscreen-btn';
    fullscreenBtn.textContent = '⛶ Fullscreen';
    fullscreenBtn.onclick = () => this.toggleFullscreenEditor();
    section.appendChild(fullscreenBtn);

    const editorContainer = document.createElement('div');
    editorContainer.className = 'code-editor-container';
    editorContainer.id = 'code-editor-container';
    section.appendChild(editorContainer);

    // Initialize CodeMirror
    requestAnimationFrame(() => {
      const startDoc =
        this.currentDefinition.evaluateCode || createDefaultDefinition().evaluateCode || '';

      this.editorView = new EditorView({
        state: EditorState.create({
          doc: startDoc,
          extensions: [
            basicSetup,
            javascript({ typescript: true }),
            EditorView.lineWrapping,
            vscodeDark,
          ],
        }),
        parent: editorContainer,
      });
    });

    return section;
  }

  private toggleFullscreenEditor(): void {
    const editorContainer = document.getElementById('code-editor-container');
    if (!editorContainer) return;

    // Enter fullscreen - move the entire editor container
    const fullscreenWrapper = document.createElement('div');
    fullscreenWrapper.className = 'code-editor-fullscreen';
    fullscreenWrapper.id = 'code-editor-fullscreen';

    // Exit button (top right)
    const closeBtn = document.createElement('button');
    closeBtn.className = 'code-editor-fullscreen-close';
    closeBtn.textContent = '✕ Exit (ESC)';
    closeBtn.onclick = () => this.exitFullscreenEditor();

    fullscreenWrapper.appendChild(closeBtn);

    // Store the original parent so we can move it back later
    const originalParent = editorContainer.parentElement;
    if (!originalParent) return;

    // Store reference to original parent for later
    (fullscreenWrapper as any).__originalParent = originalParent;

    // Add fullscreen class to editor container for styling
    editorContainer.classList.add('code-editor-container-fullscreen');

    // Move the actual editor container (preserves all state)
    fullscreenWrapper.appendChild(editorContainer);

    // Block keyboard shortcuts in fullscreen mode
    const blockKeyboardEvent = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.cm-editor')) {
        e.stopPropagation();
      }
    };
    fullscreenWrapper.addEventListener('keydown', blockKeyboardEvent, true);
    fullscreenWrapper.addEventListener('keyup', blockKeyboardEvent, true);
    fullscreenWrapper.addEventListener('keypress', blockKeyboardEvent, true);

    document.body.appendChild(fullscreenWrapper);

    // Focus the editor
    requestAnimationFrame(() => {
      this.editorView?.focus();
    });

    // ESC to exit
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.exitFullscreenEditor();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  private exitFullscreenEditor(): void {
    const fullscreenWrapper = document.getElementById('code-editor-fullscreen');
    if (!fullscreenWrapper) return;

    const editorContainer = document.getElementById('code-editor-container');
    if (!editorContainer) return;

    // Get the original parent
    const originalParent = (fullscreenWrapper as any).__originalParent;
    if (!originalParent) return;

    // Remove fullscreen class
    editorContainer.classList.remove('code-editor-container-fullscreen');

    // Move editor container back to original parent
    originalParent.appendChild(editorContainer);

    // Remove fullscreen wrapper
    fullscreenWrapper.remove();

    // Focus the editor
    requestAnimationFrame(() => {
      this.editorView?.focus();
    });
  }

  private createAIAssistantSection(): HTMLElement {
    const section = this.createSection('🤖 Assistant (Optional)');

    // Provider selection
    const providerGroup = document.createElement('div');
    providerGroup.className = 'form-group';

    const providerLabel = document.createElement('label');
    providerLabel.textContent = 'AI Provider';
    providerGroup.appendChild(providerLabel);

    const providerSelect = document.createElement('select');
    providerSelect.id = 'ai-provider-select';
    providerSelect.innerHTML = `
      <option value="openai">OpenAI (GPT-4)</option>
      <option value="anthropic">Anthropic (Claude)</option>
    `;
    providerGroup.appendChild(providerSelect);

    section.appendChild(providerGroup);

    // API Key input
    const keyGroup = document.createElement('div');
    keyGroup.className = 'form-group';

    const keyLabel = document.createElement('label');
    keyLabel.textContent = 'API Key';
    keyGroup.appendChild(keyLabel);

    const keyWrapper = document.createElement('div');
    keyWrapper.className = 'api-key-input-wrapper';

    const keyInput = document.createElement('input');
    keyInput.id = 'ai-api-key-input';
    keyInput.type = 'password';
    keyInput.placeholder = 'Enter API key';
    keyInput.className = 'api-key-input';

    // Update placeholder when provider changes
    const updateKeyPlaceholder = () => {
      const provider = providerSelect.value as 'openai' | 'anthropic';
      const hasKey = AIAssistant.hasAPIKey(provider);
      keyInput.placeholder = hasKey ? '••••••••••••••••' : 'Enter API key';
    };
    updateKeyPlaceholder();
    providerSelect.addEventListener('change', updateKeyPlaceholder);

    keyWrapper.appendChild(keyInput);

    const saveKeyBtn = document.createElement('button');
    saveKeyBtn.className = 'api-key-save-btn';
    saveKeyBtn.textContent = 'Save';
    saveKeyBtn.onclick = () => {
      const key = keyInput.value.trim();
      if (key) {
        const keys = AIAssistant.loadAPIKeys();
        const provider = providerSelect.value as 'openai' | 'anthropic';
        keys[provider] = key;
        AIAssistant.saveAPIKeys(keys);
        alert('API key saved!');
        keyInput.value = '';
        updateKeyPlaceholder();
      }
    };
    keyWrapper.appendChild(saveKeyBtn);

    keyGroup.appendChild(keyWrapper);
    section.appendChild(keyGroup);

    // Description for AI
    const aiDescGroup = document.createElement('div');
    aiDescGroup.className = 'form-group';

    const aiDescLabel = document.createElement('label');
    aiDescLabel.textContent = 'Describe Your Node';
    aiDescGroup.appendChild(aiDescLabel);

    const aiDescTextarea = document.createElement('textarea');
    aiDescTextarea.id = 'ai-description';
    aiDescTextarea.placeholder =
      'E.g., "A node that takes two numbers and multiplies them together"';
    aiDescTextarea.rows = 3;
    aiDescGroup.appendChild(aiDescTextarea);

    section.appendChild(aiDescGroup);

    // Generate buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'ai-button-group';

    const generateFullBtn = document.createElement('button');
    generateFullBtn.className = 'ai-generate-btn ai-generate-full-btn';
    generateFullBtn.textContent = '✨ Generate Complete Node';
    generateFullBtn.onclick = () => this.generateFullNodeWithAI();
    buttonGroup.appendChild(generateFullBtn);

    const generateCodeBtn = document.createElement('button');
    generateCodeBtn.className = 'ai-generate-btn ai-generate-code-btn';
    generateCodeBtn.textContent = '⚡ Generate Code Only';
    generateCodeBtn.onclick = () => this.generateCodeWithAI();
    buttonGroup.appendChild(generateCodeBtn);

    section.appendChild(buttonGroup);

    const hint = document.createElement('p');
    hint.className = 'ai-hint';
    hint.innerHTML =
      '<strong>Generate Complete Node:</strong> AI designs the entire node (name, inputs, outputs, properties, code)<br>' +
      "<strong>Generate Code Only:</strong> AI writes code for the ports you've already defined";
    section.appendChild(hint);

    return section;
  }

  private async generateFullNodeWithAI(): Promise<void> {
    const description = (
      document.getElementById('ai-description') as HTMLTextAreaElement
    )?.value.trim();

    if (!description) {
      alert('Please describe what your node should do.');
      return;
    }

    const providerSelect = document.getElementById('ai-provider-select') as HTMLSelectElement;
    const provider = providerSelect.value as 'openai' | 'anthropic';

    if (!AIAssistant.hasAPIKey(provider)) {
      alert(
        `Please configure your ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key first.`
      );
      return;
    }

    // Show loading
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'ai-loading';
    loadingMsg.textContent = 'Generating complete node structure...';
    this.contentContainer.appendChild(loadingMsg);

    try {
      const response = await AIAssistant.generateCode({
        description,
        provider,
        mode: 'full',
      });

      if (response.success && response.nodeStructure) {
        const structure = response.nodeStructure;

        // Populate name and label
        if (structure.name) {
          (document.querySelector('input[data-field="name"]') as HTMLInputElement).value =
            structure.name;
        }
        if (structure.label) {
          (document.querySelector('input[data-field="label"]') as HTMLInputElement).value =
            structure.label;
        }
        if (structure.category) {
          (document.querySelector('input[data-field="category"]') as HTMLInputElement).value =
            structure.category;
        }

        // Set description
        (
          document.querySelector('textarea[data-field="description"]') as HTMLTextAreaElement
        ).value = description;

        // Populate inputs
        if (structure.inputs && structure.inputs.length > 0) {
          this.inputsList = structure.inputs;
          this.buildUI(); // Rebuild to show new inputs
          return; // buildUI will be called, so exit here
        }

        // Populate outputs
        if (structure.outputs && structure.outputs.length > 0) {
          this.outputsList = structure.outputs;
        }

        // Populate properties
        if (structure.properties && structure.properties.length > 0) {
          this.propertiesList = structure.properties;
        }

        // Populate code
        if (response.code && this.editorView) {
          this.editorView.dispatch({
            changes: {
              from: 0,
              to: this.editorView.state.doc.length,
              insert: response.code,
            },
          });
        }

        // Rebuild UI to show all updates
        this.buildUI();

        alert('Complete node generated successfully! Review and adjust as needed.');
      } else {
        alert(`Failed to generate node: ${response.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      loadingMsg.remove();
    }
  }

  private async generateCodeWithAI(): Promise<void> {
    const description = (
      document.getElementById('ai-description') as HTMLTextAreaElement
    )?.value.trim();

    if (!description) {
      alert('Please describe what your node should do.');
      return;
    }

    const providerSelect = document.getElementById('ai-provider-select') as HTMLSelectElement;
    const provider = providerSelect.value as 'openai' | 'anthropic';

    if (!AIAssistant.hasAPIKey(provider)) {
      alert(
        `Please configure your ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key first.`
      );
      return;
    }

    // Show loading
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'ai-loading';
    loadingMsg.textContent = 'Generating code...';
    this.contentContainer.appendChild(loadingMsg);

    try {
      const response = await AIAssistant.generateCode({
        description,
        provider,
        mode: 'code-only',
        existingInputs: this.inputsList,
        existingOutputs: this.outputsList,
        existingProperties: this.propertiesList,
      });

      if (response.success && response.code) {
        // Update editor with generated code
        if (this.editorView) {
          this.editorView.dispatch({
            changes: {
              from: 0,
              to: this.editorView.state.doc.length,
              insert: response.code,
            },
          });
        }
        alert('Code generated successfully!');
      } else {
        alert(`Failed to generate code: ${response.error}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      loadingMsg.remove();
    }
  }

  private createActionsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'custom-node-creator-actions';

    const importBtn = document.createElement('button');
    importBtn.textContent = '📁 Import';
    importBtn.onclick = () => this.importNode();
    section.appendChild(importBtn);

    const exportBtn = document.createElement('button');
    exportBtn.textContent = '💾 Export';
    exportBtn.onclick = () => this.exportNode();
    section.appendChild(exportBtn);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'primary-btn';
    saveBtn.textContent = 'Save';
    saveBtn.onclick = () => this.saveNode();
    section.appendChild(saveBtn);

    return section;
  }

  private async importNode(): Promise<void> {
    try {
      const definition = await importCustomNodeFromFile();
      const result = this.manager.importCustomNode(JSON.stringify(definition));

      if (result.success) {
        alert(result.message || 'Node imported successfully!');
        if (this.onNodeCreated) {
          this.onNodeCreated();
        }
        this.hide();
      } else {
        alert(`Import failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private exportNode(): void {
    const definition = this.buildDefinition();
    if (!definition) return;

    exportCustomNodeToFile(definition as CustomNodeDefinition);
  }

  private saveNode(): void {
    const definition = this.buildDefinition();
    if (!definition) return;

    const result = this.manager.createCustomNode(definition as CustomNodeDefinition);

    if (result.success) {
      alert(result.message || 'Custom node created successfully!');
      if (this.onNodeCreated) {
        this.onNodeCreated();
      }
      this.hide();
    } else {
      alert(`Failed to create node: ${result.error}`);
    }
  }

  private buildDefinition(): Partial<CustomNodeDefinition> | null {
    // Collect values from form
    const name = (
      document.querySelector('input[data-field="name"]') as HTMLInputElement
    )?.value.trim();
    const label = (
      document.querySelector('input[data-field="label"]') as HTMLInputElement
    )?.value.trim();
    const category = (
      document.querySelector('input[data-field="category"]') as HTMLInputElement
    )?.value.trim();
    const description = (
      document.querySelector('textarea[data-field="description"]') as HTMLTextAreaElement
    )?.value.trim();

    const evaluateCode = this.editorView?.state.doc.toString() || '';

    // Validate
    if (!name) {
      alert('Node name is required');
      return null;
    }
    if (!label) {
      alert('Display label is required');
      return null;
    }
    if (!category) {
      alert('Category is required');
      return null;
    }
    if (!evaluateCode) {
      alert('Evaluate function code is required');
      return null;
    }

    return {
      ...this.currentDefinition,
      name,
      label,
      category,
      icon: '✨',
      description,
      inputs: this.inputsList,
      outputs: this.outputsList,
      properties: this.propertiesList,
      evaluateCode,
    };
  }

  // Helper methods to create form elements
  private createSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'creator-section';

    const header = document.createElement('h3');
    header.className = 'creator-section-header';
    header.textContent = title;
    section.appendChild(header);

    return section;
  }

  private createInput(
    field: string,
    label: string,
    type: string,
    placeholder: string,
    hint?: string
  ): HTMLElement {
    const group = document.createElement('div');
    group.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    group.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.dataset.field = field;
    input.value = (this.currentDefinition as any)[field] || '';
    group.appendChild(input);

    if (hint) {
      const hintEl = document.createElement('small');
      hintEl.className = 'form-hint';
      hintEl.textContent = hint;
      group.appendChild(hintEl);
    }

    return group;
  }

  private createTextarea(field: string, label: string, placeholder: string): HTMLElement {
    const group = document.createElement('div');
    group.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    group.appendChild(labelEl);

    const textarea = document.createElement('textarea');
    textarea.placeholder = placeholder;
    textarea.dataset.field = field;
    textarea.rows = 3;
    textarea.value = (this.currentDefinition as any)[field] || '';
    group.appendChild(textarea);

    return group;
  }
}
