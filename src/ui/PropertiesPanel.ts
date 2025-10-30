import { Node } from '@/core/Node';
import { Pane } from 'tweakpane';
import { ObjectInspector } from './ObjectInspector';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { CustomNodeDefinition, AIGenerationRequest } from '@/types/customNode';
import { PortType, PortDefinition } from '@/types';
import { PropertyConfig, PropertyType } from '@/core/types';
import { CustomNodeManager } from '@/three/CustomNodeManager';
import { AIAssistant } from '@/utils/AIAssistant';
import { exportCustomNodeToFile, importCustomNodeFromFile } from '@/utils/customNodeIO';
import * as prettier from 'prettier/standalone';
import prettierPluginTypescript from 'prettier/plugins/typescript';
import prettierPluginEstree from 'prettier/plugins/estree';
import { getNodeSourcePath } from '@/three/nodeSourceMap';

export class PropertiesPanel {
  private panel: HTMLElement;
  private tabsContainer: HTMLElement;
  private contentContainer: HTMLElement;
  private resizeHandle: HTMLElement;
  private selectedNodes: Node[] = [];
  private activeNodeIndex: number = 0;
  private propertyPanes: Map<string, Pane> = new Map();
  private isVisible: boolean = false;
  private width: number = 300;
  private minWidth: number = 200;
  private isResizing: boolean = false;

  // Custom node editor state
  private customNodeManager?: CustomNodeManager;
  private editorView?: EditorView;
  private codeViewerView?: EditorView; // For read-only code viewer
  private codeEditorOriginalParent?: HTMLElement; // Track original parent for fullscreen
  private codeViewerOriginalParent?: HTMLElement; // Track original parent for fullscreen
  private currentCustomNodeDef?: Partial<CustomNodeDefinition>;
  private customNodeInputs: PortDefinition[] = [];
  private customNodeOutputs: PortDefinition[] = [];
  private customNodeProperties: PropertyConfig[] = [];
  private autosaveTimer?: number;
  private currentEditingNode?: Node;

  constructor(container: HTMLElement) {
    // Create main panel
    this.panel = document.createElement('div');
    this.panel.className = 'properties-panel';
    this.panel.style.display = 'none';

    // Create resize handle (left edge)
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'properties-resize-handle';
    this.panel.appendChild(this.resizeHandle);

    // Create tabs container
    this.tabsContainer = document.createElement('div');
    this.tabsContainer.className = 'properties-tabs';
    this.panel.appendChild(this.tabsContainer);

    // Create content container
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'properties-content';
    this.panel.appendChild(this.contentContainer);

    container.appendChild(this.panel);

    // Set up resize functionality
    this.setupResize();

    // Load saved width from localStorage
    const savedWidth = localStorage.getItem('propertiesPanelWidth');
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
      // Only enforce minimum width, no maximum limit
      this.width = Math.max(this.minWidth, newWidth);
      this.updateWidth();
    });

    document.addEventListener('pointerup', (e) => {
      if (this.isResizing) {
        this.isResizing = false;
        this.resizeHandle.releasePointerCapture(e.pointerId);
        // Save width to localStorage
        localStorage.setItem('propertiesPanelWidth', this.width.toString());
      }
    });
  }

  private updateWidth(): void {
    this.panel.style.width = `${this.width}px`;
  }

  show(): void {
    this.isVisible = true;
    this.panel.style.display = 'flex';
    // Load saved state
    const savedState = localStorage.getItem('propertiesPanelVisible');
    if (savedState === 'true') {
      this.panel.classList.add('visible');
    }
    localStorage.setItem('propertiesPanelVisible', 'true');
    this.panel.classList.add('visible');
  }

  hide(): void {
    this.isVisible = false;
    this.panel.classList.remove('visible');
    localStorage.setItem('propertiesPanelVisible', 'false');
    setTimeout(() => {
      if (!this.isVisible) {
        this.panel.style.display = 'none';
      }
    }, 300); // Match CSS animation duration
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  setCustomNodeManager(manager: CustomNodeManager): void {
    this.customNodeManager = manager;
  }

  setSelectedNodes(nodes: Node[]): void {
    // Clean up existing property panes
    for (const pane of this.propertyPanes.values()) {
      pane.dispose();
    }
    this.propertyPanes.clear();

    this.selectedNodes = nodes;
    this.activeNodeIndex = 0;

    if (nodes.length === 0) {
      this.renderEmpty();
    } else {
      this.renderTabs();
      this.renderContent();
    }
  }

  private renderEmpty(): void {
    this.tabsContainer.innerHTML = '';
    this.contentContainer.innerHTML = '<div class="properties-empty">No node selected</div>';
  }

  private renderTabs(): void {
    this.tabsContainer.innerHTML = '';

    for (let i = 0; i < this.selectedNodes.length; i++) {
      const node = this.selectedNodes[i];
      const tab = document.createElement('div');
      tab.className = 'properties-tab';
      if (i === this.activeNodeIndex) {
        tab.classList.add('active');
      }
      tab.textContent = node.label;
      tab.addEventListener('click', () => {
        this.activeNodeIndex = i;
        this.renderTabs();
        this.renderContent();
      });
      this.tabsContainer.appendChild(tab);
    }
  }

  /**
   * Check if a node is a custom node
   */
  private isCustomNode(node: Node): boolean {
    // Check if node type is CustomNode or if it's in the Custom category
    // Custom nodes can have type 'CustomNode' (default) or their custom name
    return (
      node.type === 'CustomNode' ||
      node.type.startsWith('Custom') ||
      (node as any).metadata?.category === 'Custom'
    );
  }

  private renderContent(): void {
    if (this.selectedNodes.length === 0) {
      this.renderEmpty();
      return;
    }

    const node = this.selectedNodes[this.activeNodeIndex];
    this.contentContainer.innerHTML = '';

    // Branch based on node type
    if (this.isCustomNode(node)) {
      // Render custom node editor interface
      this.renderCustomNodeEditor(node);
    } else {
      // Render standard properties panel for built-in nodes
      this.renderStandardNodePanel(node);
    }
  }

  /**
   * Render the standard properties panel for built-in nodes
   */
  private renderStandardNodePanel(node: Node): void {
    // Create sections container
    const sectionsContainer = document.createElement('div');
    sectionsContainer.className = 'properties-sections';

    // Render properties section if node has properties
    if (node.properties.size > 0) {
      const propertiesSection = this.createPropertiesSection(node);
      sectionsContainer.appendChild(propertiesSection);
    }

    // Render data flow section
    const dataFlowSection = this.createDataFlowSection(node);
    sectionsContainer.appendChild(dataFlowSection);

    // Render code viewer section
    const codeViewerSection = this.createCodeViewerSection(node);
    sectionsContainer.appendChild(codeViewerSection);

    // Render duplicate button for built-in nodes
    const duplicateSection = this.createDuplicateButtonSection(node);
    sectionsContainer.appendChild(duplicateSection);

    this.contentContainer.appendChild(sectionsContainer);
  }

  /**
   * Render the custom node editor interface
   */
  private renderCustomNodeEditor(node: Node): void {
    // Store current editing node
    this.currentEditingNode = node;

    // Initialize custom node definition from node
    this.initializeCustomNodeDefinition(node);

    const container = document.createElement('div');
    container.className = 'custom-node-editor';

    // Add all editor sections
    container.appendChild(this.createCustomNodeDefinitionSection());
    container.appendChild(this.createCustomNodePortsSection('Inputs', this.customNodeInputs, true));
    container.appendChild(
      this.createCustomNodePortsSection('Outputs', this.customNodeOutputs, false)
    );
    container.appendChild(this.createCustomNodePropertiesSection());
    container.appendChild(this.createCustomNodeCodeEditorSection());
    container.appendChild(this.createCustomNodeAISection());
    container.appendChild(this.createCustomNodeActionsSection());

    this.contentContainer.appendChild(container);

    // Setup autosave listeners
    this.setupAutosaveListeners();
  }

  /**
   * Initialize custom node definition from selected node
   */
  private initializeCustomNodeDefinition(node: Node): void {
    // Extract current state from node
    this.currentCustomNodeDef = {
      name: node.type,
      label: node.label,
      category: 'Custom',
      icon: '✨',
      description: '',
      evaluateCode: '// Custom node code',
    };

    // Extract ports
    this.customNodeInputs = Array.from(node.inputs.values()).map((port) => ({
      name: port.name,
      type: port.type,
      defaultValue: port.defaultValue,
    }));

    this.customNodeOutputs = Array.from(node.outputs.values()).map((port) => ({
      name: port.name,
      type: port.type,
      defaultValue: port.defaultValue,
    }));

    // Extract properties
    this.customNodeProperties = Array.from(node.properties.values()).map((prop) => ({
      name: prop.name,
      type: prop.type,
      value: prop.value,
      label: prop.label,
      min: prop.min,
      max: prop.max,
      step: prop.step,
      options: prop.options,
    }));
  }

  private createPropertiesSection(node: Node): HTMLElement {
    const section = document.createElement('div');
    section.className = 'properties-section';

    const header = document.createElement('h3');
    header.className = 'properties-section-header';
    header.textContent = 'Properties';
    section.appendChild(header);

    // Create Tweakpane container for properties
    const paneContainer = document.createElement('div');
    paneContainer.className = 'properties-pane-container';
    section.appendChild(paneContainer);

    // Create Tweakpane for editing properties
    const pane = new Pane({ container: paneContainer });
    this.propertyPanes.set(node.id, pane);

    // Add bindings for each property
    for (const [name, property] of node.properties) {
      const params = { [name]: property.value };

      const bindingConfig: any = {
        label: property.label || name,
      };

      // Add type-specific configuration
      if (property.type === 'number') {
        if (property.min !== undefined) bindingConfig.min = property.min;
        if (property.max !== undefined) bindingConfig.max = property.max;
        if (property.step !== undefined) bindingConfig.step = property.step;
      } else if (property.type === 'list' && property.options) {
        bindingConfig.options = property.options;
      } else if (property.type === 'color') {
        bindingConfig.view = 'color';
      }

      const binding = pane.addBinding(params, name, bindingConfig).on('change', (ev) => {
        // Update property value but don't trigger graph evaluation
        const prop = node.properties.get(name);
        if (prop) {
          prop.value = ev.value;
          node.markDirty();
        }
      });

      // Check if this property has a corresponding connected input port
      const inputPort = node.inputs.get(name);
      if (inputPort && inputPort.connections.length > 0) {
        // Property is externally managed - gray it out
        const bindingElement = binding.element;
        bindingElement.classList.add('property-externally-managed');
        bindingConfig.disabled = true;
      }
    }

    // Add Update button
    const updateButtonContainer = document.createElement('div');
    updateButtonContainer.className = 'properties-update-button-container';
    updateButtonContainer.style.cssText = 'margin-top: 10px; padding: 0 8px;';

    const updateButton = document.createElement('button');
    updateButton.className = 'properties-update-button';
    updateButton.textContent = 'Update';
    updateButton.style.cssText = `
      width: 100%;
      padding: 8px;
      background-color: #4a90e2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    `;

    updateButton.addEventListener('mouseenter', () => {
      updateButton.style.backgroundColor = '#357abd';
    });

    updateButton.addEventListener('mouseleave', () => {
      updateButton.style.backgroundColor = '#4a90e2';
    });

    updateButton.addEventListener('click', () => {
      // Trigger graph evaluation when button is clicked
      if (node.graph) {
        node.graph.triggerChange();
      }
    });

    updateButtonContainer.appendChild(updateButton);
    section.appendChild(updateButtonContainer);

    return section;
  }

  private createDataFlowSection(node: Node): HTMLElement {
    const section = document.createElement('div');
    section.className = 'properties-section';

    const header = document.createElement('h3');
    header.className = 'properties-section-header';
    header.textContent = 'Data Flow';
    section.appendChild(header);

    // Inputs
    if (node.inputs.size > 0) {
      const inputsLabel = document.createElement('div');
      inputsLabel.className = 'data-flow-label';
      inputsLabel.textContent = 'Inputs:';
      section.appendChild(inputsLabel);

      for (const [name, port] of node.inputs) {
        const item = document.createElement('div');
        item.className = 'data-flow-item';

        const portName = document.createElement('span');
        portName.className = 'data-flow-port-name';
        portName.textContent = name + ':';
        item.appendChild(portName);

        const portValueContainer = document.createElement('div');
        portValueContainer.className = 'data-flow-port-value';

        // Create Chrome DevTools-style inspector with lazy rendering
        // expandLevel: 0 = collapsed by default (click to expand)
        // No maxDepth limit - relies on circular ref detection + lazy rendering like Chrome
        const inspector = new ObjectInspector({
          expandLevel: 0,
          maxStringLength: 100,
          maxArrayPreview: 5,
        });
        const inspectorEl = inspector.inspect(port.value);
        portValueContainer.appendChild(inspectorEl);
        item.appendChild(portValueContainer);

        section.appendChild(item);
      }
    }

    // Outputs
    if (node.outputs.size > 0) {
      const outputsLabel = document.createElement('div');
      outputsLabel.className = 'data-flow-label';
      outputsLabel.textContent = 'Outputs:';
      section.appendChild(outputsLabel);

      for (const [name, port] of node.outputs) {
        const item = document.createElement('div');
        item.className = 'data-flow-item';

        const portName = document.createElement('span');
        portName.className = 'data-flow-port-name';
        portName.textContent = name + ':';
        item.appendChild(portName);

        const portValueContainer = document.createElement('div');
        portValueContainer.className = 'data-flow-port-value';

        // Create Chrome DevTools-style inspector with lazy rendering
        // expandLevel: 0 = collapsed by default (click to expand)
        // No maxDepth limit - relies on circular ref detection + lazy rendering like Chrome
        const inspector = new ObjectInspector({
          expandLevel: 0,
          maxStringLength: 100,
          maxArrayPreview: 5,
        });
        const inspectorEl = inspector.inspect(port.value);
        portValueContainer.appendChild(inspectorEl);
        item.appendChild(portValueContainer);

        section.appendChild(item);
      }
    }

    return section;
  }

  updateDataFlow(): void {
    // Re-render the content to update data flow values
    if (this.isVisible && this.selectedNodes.length > 0) {
      this.renderContent();
    }
  }

  /**
   * Create a code viewer section showing the evaluate function
   */
  private createCodeViewerSection(node: Node): HTMLElement {
    const section = document.createElement('div');
    section.className = 'properties-section';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '12px';

    const titleEl = document.createElement('h3');
    titleEl.className = 'properties-section-header';
    titleEl.textContent = 'Source Code';
    titleEl.style.margin = '0';
    header.appendChild(titleEl);

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.textContent = '⛶ Fullscreen';
    fullscreenBtn.style.padding = '4px 8px';
    fullscreenBtn.style.fontSize = '12px';
    fullscreenBtn.style.background = 'var(--secondary-color)';
    fullscreenBtn.style.border = '1px solid var(--border-color)';
    fullscreenBtn.style.borderRadius = '4px';
    fullscreenBtn.style.color = 'var(--text-color)';
    fullscreenBtn.style.cursor = 'pointer';
    fullscreenBtn.onclick = () => this.toggleCodeViewerFullscreen();
    header.appendChild(fullscreenBtn);

    section.appendChild(header);

    // Create CodeMirror editor container
    const editorContainer = document.createElement('div');
    editorContainer.className = 'code-viewer-container';
    editorContainer.id = 'built-in-code-viewer';
    section.appendChild(editorContainer);

    // Initialize CodeMirror in read-only mode with formatted code
    requestAnimationFrame(async () => {
      // Get the full source code
      const evaluateCode = await this.getNodeEvaluateCode(node);

      // Format the code before displaying
      const formattedCode = await this.formatCode(evaluateCode);

      this.codeViewerView = new EditorView({
        state: EditorState.create({
          doc: formattedCode,
          extensions: [
            basicSetup,
            javascript({ typescript: true }),
            EditorView.lineWrapping,
            vscodeDark,
            EditorView.editable.of(false), // Read-only
            EditorState.readOnly.of(true),
          ],
        }),
        parent: editorContainer,
      });
    });

    return section;
  }

  /**
   * Get the source code for a node (full file for built-in, evaluate function for custom)
   */
  private async getNodeEvaluateCode(node: Node): Promise<string> {
    try {
      // Try to get the full source file for built-in nodes
      const sourcePath = getNodeSourcePath(node.type);

      if (sourcePath) {
        try {
          // Use dynamic import with ?raw to get the file contents
          const sourceModule = await import(/* @vite-ignore */ `${sourcePath}?raw`);
          return sourceModule.default || '// No source code available';
        } catch (importError) {
          console.warn(`Failed to load source file for ${node.type}:`, importError);
          // Fall through to extract function below
        }
      }

      // For custom nodes or if source file not found, extract the evaluate function
      if (typeof (node as any).evaluate === 'function') {
        const evaluateFunc = (node as any).evaluate;
        // Convert function to string and clean up
        let code = evaluateFunc.toString();

        // Remove the function wrapper to show just the body
        code = code
          .replace(/^[^{]*{/, '')
          .replace(/}[^}]*$/, '')
          .trim();

        return code || '// No implementation';
      }

      return '// No evaluate function found';
    } catch (error) {
      return `// Error extracting code: ${error}`;
    }
  }

  /**
   * Create a simple duplicate button section
   */
  private createDuplicateButtonSection(node: Node): HTMLElement {
    const section = document.createElement('div');
    section.className = 'properties-section';
    section.style.paddingTop = '8px';

    const duplicateBtn = document.createElement('button');
    duplicateBtn.textContent = '📋 Duplicate as Custom Node';
    duplicateBtn.className = 'duplicate-btn';
    duplicateBtn.style.width = '100%';
    duplicateBtn.style.padding = '10px';
    duplicateBtn.style.background = 'var(--selection-color)';
    duplicateBtn.style.border = '1px solid var(--selection-color)';
    duplicateBtn.style.borderRadius = '4px';
    duplicateBtn.style.color = 'white';
    duplicateBtn.style.cursor = 'pointer';
    duplicateBtn.style.fontSize = '13px';
    duplicateBtn.style.fontWeight = '500';
    duplicateBtn.onclick = () => this.duplicateNodeAsCustom(node);

    section.appendChild(duplicateBtn);

    return section;
  }

  /**
   * Duplicate a node as a custom node
   */
  private duplicateNodeAsCustom(node: Node): void {
    if (!this.customNodeManager) {
      alert('Custom node manager not available');
      return;
    }

    // Use the CustomNodeManager's duplicateNode method
    const result = this.customNodeManager.duplicateNode(node);

    if (result.success) {
      alert(`${result.message}\n\nLook for it in the context menu under the "Custom" category.`);
    } else {
      alert(`Failed to create custom node: ${result.error}`);
    }
  }

  /**
   * Custom node editor helper methods
   */
  private createCustomNodeDefinitionSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'custom-node-section';

    const header = document.createElement('h3');
    header.textContent = 'Node Definition';
    section.appendChild(header);

    // Name input
    const nameGroup = this.createFormGroup('Name', 'text', 'name', 'CustomNode');
    section.appendChild(nameGroup);

    // Label input
    const labelGroup = this.createFormGroup('Label', 'text', 'label', 'Custom Node');
    section.appendChild(labelGroup);

    // Category input
    const categoryGroup = this.createFormGroup('Category', 'text', 'category', 'Custom');
    section.appendChild(categoryGroup);

    // Description textarea
    const descGroup = this.createFormGroup('Description', 'textarea', 'description', '');
    section.appendChild(descGroup);

    return section;
  }

  private createFormGroup(
    label: string,
    type: string,
    field: string,
    placeholder: string
  ): HTMLElement {
    const group = document.createElement('div');
    group.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    group.appendChild(labelEl);

    if (type === 'textarea') {
      const textarea = document.createElement('textarea');
      textarea.placeholder = placeholder;
      textarea.dataset.field = field;
      textarea.value = (this.currentCustomNodeDef as any)?.[field] || '';
      textarea.rows = 3;
      group.appendChild(textarea);
    } else {
      const input = document.createElement('input');
      input.type = type;
      input.placeholder = placeholder;
      input.dataset.field = field;
      input.value = (this.currentCustomNodeDef as any)?.[field] || '';
      group.appendChild(input);
    }

    return group;
  }

  private createCustomNodePortsSection(
    title: string,
    ports: PortDefinition[],
    isInput: boolean
  ): HTMLElement {
    const section = document.createElement('div');
    section.className = 'custom-node-section';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    header.appendChild(titleEl);

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add';
    addBtn.className = 'add-port-btn';
    addBtn.onclick = () => this.addPort(isInput);
    header.appendChild(addBtn);

    section.appendChild(header);

    const portsList = document.createElement('div');
    portsList.className = 'ports-list';
    portsList.id = isInput ? 'inputs-list' : 'outputs-list';
    this.renderPortsList(portsList, ports, isInput);
    section.appendChild(portsList);

    return section;
  }

  private renderPortsList(container: HTMLElement, ports: PortDefinition[], isInput: boolean): void {
    container.innerHTML = '';

    if (ports.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-list';
      empty.textContent = `No ${isInput ? 'inputs' : 'outputs'} defined`;
      container.appendChild(empty);
      return;
    }

    ports.forEach((port, index) => {
      const item = document.createElement('div');
      item.className = 'port-item';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'Name';
      nameInput.value = port.name;
      nameInput.onchange = () => {
        port.name = nameInput.value;
      };
      item.appendChild(nameInput);

      const typeSelect = document.createElement('select');
      typeSelect.innerHTML = `
        <option value="number">Number</option>
        <option value="string">String</option>
        <option value="boolean">Boolean</option>
        <option value="object">Object</option>
        <option value="array">Array</option>
        <option value="any">Any</option>
      `;
      typeSelect.value = port.type;
      typeSelect.onchange = () => {
        port.type = typeSelect.value as PortType;
      };
      item.appendChild(typeSelect);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✕';
      deleteBtn.className = 'delete-btn';
      deleteBtn.onclick = () => this.removePort(index, isInput);
      item.appendChild(deleteBtn);

      container.appendChild(item);
    });
  }

  private addPort(isInput: boolean): void {
    const newPort: PortDefinition = {
      name: isInput ? 'input' : 'output',
      type: 'number' as PortType,
    };

    if (isInput) {
      this.customNodeInputs.push(newPort);
    } else {
      this.customNodeOutputs.push(newPort);
    }

    this.refreshPortsList();
  }

  private removePort(index: number, isInput: boolean): void {
    if (isInput) {
      this.customNodeInputs.splice(index, 1);
    } else {
      this.customNodeOutputs.splice(index, 1);
    }

    this.refreshPortsList();
  }

  private refreshPortsList(): void {
    const inputsList = document.getElementById('inputs-list');
    const outputsList = document.getElementById('outputs-list');

    if (inputsList) {
      this.renderPortsList(inputsList, this.customNodeInputs, true);
    }
    if (outputsList) {
      this.renderPortsList(outputsList, this.customNodeOutputs, false);
    }
  }

  private createCustomNodePropertiesSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'custom-node-section';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const titleEl = document.createElement('h3');
    titleEl.textContent = 'Properties';
    header.appendChild(titleEl);

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add';
    addBtn.className = 'add-property-btn';
    addBtn.onclick = () => this.addProperty();
    header.appendChild(addBtn);

    section.appendChild(header);

    const propsList = document.createElement('div');
    propsList.className = 'properties-list';
    propsList.id = 'properties-list';
    this.renderPropertiesList(propsList);
    section.appendChild(propsList);

    return section;
  }

  private renderPropertiesList(container: HTMLElement): void {
    container.innerHTML = '';

    if (this.customNodeProperties.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-list';
      empty.textContent = 'No properties defined';
      container.appendChild(empty);
      return;
    }

    this.customNodeProperties.forEach((prop, index) => {
      const item = document.createElement('div');
      item.className = 'property-item';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'Name';
      nameInput.value = prop.name;
      nameInput.onchange = () => {
        prop.name = nameInput.value;
      };
      item.appendChild(nameInput);

      const typeSelect = document.createElement('select');
      typeSelect.innerHTML = `
        <option value="number">Number</option>
        <option value="string">String</option>
        <option value="boolean">Boolean</option>
        <option value="color">Color</option>
        <option value="list">List</option>
      `;
      typeSelect.value = prop.type;
      typeSelect.onchange = () => {
        prop.type = typeSelect.value as PropertyType;
      };
      item.appendChild(typeSelect);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✕';
      deleteBtn.className = 'delete-btn';
      deleteBtn.onclick = () => this.removeProperty(index);
      item.appendChild(deleteBtn);

      container.appendChild(item);
    });
  }

  private addProperty(): void {
    const newProp: PropertyConfig = {
      name: 'property',
      type: 'number',
      value: 0,
    };

    this.customNodeProperties.push(newProp);
    this.refreshPropertiesList();
  }

  private removeProperty(index: number): void {
    this.customNodeProperties.splice(index, 1);
    this.refreshPropertiesList();
  }

  private refreshPropertiesList(): void {
    const propsList = document.getElementById('properties-list');
    if (propsList) {
      this.renderPropertiesList(propsList);
    }
  }

  private createCustomNodeCodeEditorSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'custom-node-section';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const titleEl = document.createElement('h3');
    titleEl.textContent = 'Evaluate Function';
    header.appendChild(titleEl);

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.textContent = '⛶ Fullscreen';
    fullscreenBtn.onclick = () => this.toggleCodeEditorFullscreen();
    header.appendChild(fullscreenBtn);

    section.appendChild(header);

    const editorContainer = document.createElement('div');
    editorContainer.className = 'code-editor-container';
    editorContainer.id = 'custom-node-code-editor';
    section.appendChild(editorContainer);

    // Initialize CodeMirror with auto-formatted code
    requestAnimationFrame(async () => {
      const startCode = this.currentCustomNodeDef?.evaluateCode || '// Add your custom logic here';

      // Auto-format the code before displaying
      const formattedCode = await this.formatCode(startCode);

      this.editorView = new EditorView({
        state: EditorState.create({
          doc: formattedCode,
          extensions: [
            basicSetup,
            javascript({ typescript: true }),
            EditorView.lineWrapping,
            vscodeDark,
          ],
        }),
        parent: editorContainer,
      });

      // Block keyboard shortcuts
      editorContainer.addEventListener(
        'keydown',
        (e) => {
          if ((e.target as HTMLElement).closest('.cm-editor')) {
            e.stopPropagation();
          }
        },
        true
      );
    });

    return section;
  }

  private toggleCodeEditorFullscreen(): void {
    const container = document.getElementById('custom-node-code-editor');
    if (!container || !this.editorView) return;

    // Check if already in fullscreen
    const existingFullscreen = document.querySelector('.code-editor-fullscreen');

    if (existingFullscreen) {
      // Exit fullscreen - move container back to original location
      if (this.codeEditorOriginalParent) {
        // Remove fullscreen wrapper
        const fullscreenWrapper = existingFullscreen as HTMLElement;
        fullscreenWrapper.parentElement?.removeChild(fullscreenWrapper);

        // Restore original container
        container.className = 'code-editor-container';
        this.codeEditorOriginalParent.appendChild(container);
        this.codeEditorOriginalParent = undefined;
      }
    } else {
      // Enter fullscreen - store original parent first
      this.codeEditorOriginalParent = container.parentElement as HTMLElement;

      const fullscreenWrapper = document.createElement('div');
      fullscreenWrapper.className = 'code-editor-fullscreen';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ Exit Fullscreen';
      closeBtn.className = 'code-editor-fullscreen-close';
      closeBtn.onclick = () => this.toggleCodeEditorFullscreen();
      fullscreenWrapper.appendChild(closeBtn);

      // Move container to fullscreen (preserves all state)
      container.className = 'code-editor-container-fullscreen';
      fullscreenWrapper.appendChild(container);
      document.body.appendChild(fullscreenWrapper);
    }
  }

  private toggleCodeViewerFullscreen(): void {
    const container = document.getElementById('built-in-code-viewer');
    if (!container || !this.codeViewerView) return;

    // Check if already in fullscreen
    const existingFullscreen = document.querySelector('.code-editor-fullscreen');

    if (existingFullscreen) {
      // Exit fullscreen - move container back to original location
      if (this.codeViewerOriginalParent) {
        // Remove fullscreen wrapper
        const fullscreenWrapper = existingFullscreen as HTMLElement;
        fullscreenWrapper.parentElement?.removeChild(fullscreenWrapper);

        // Restore original container
        container.className = 'code-viewer-container';
        this.codeViewerOriginalParent.appendChild(container);
        this.codeViewerOriginalParent = undefined;
      }
    } else {
      // Enter fullscreen - store original parent first
      this.codeViewerOriginalParent = container.parentElement as HTMLElement;

      const fullscreenWrapper = document.createElement('div');
      fullscreenWrapper.className = 'code-editor-fullscreen';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ Exit Fullscreen';
      closeBtn.className = 'code-editor-fullscreen-close';
      closeBtn.onclick = () => this.toggleCodeViewerFullscreen();
      fullscreenWrapper.appendChild(closeBtn);

      // Move container to fullscreen (preserves all state)
      container.className = 'code-editor-container-fullscreen';
      fullscreenWrapper.appendChild(container);
      document.body.appendChild(fullscreenWrapper);
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
      // Don't show alert, just log and return original code
      return code; // Return original code if formatting fails
    }
  }

  private createCustomNodeAISection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'custom-node-section';

    const titleEl = document.createElement('h3');
    titleEl.textContent = '🤖 AI Assistant';
    section.appendChild(titleEl);

    const providerGroup = document.createElement('div');
    providerGroup.className = 'form-group';

    const providerLabel = document.createElement('label');
    providerLabel.textContent = 'Provider';
    providerGroup.appendChild(providerLabel);

    const providerSelect = document.createElement('select');
    providerSelect.innerHTML = `
      <option value="openai">OpenAI (GPT-4)</option>
      <option value="anthropic">Anthropic (Claude)</option>
    `;
    providerGroup.appendChild(providerSelect);

    section.appendChild(providerGroup);

    const keyGroup = document.createElement('div');
    keyGroup.className = 'form-group';

    const keyLabel = document.createElement('label');
    keyLabel.textContent = 'API Key';
    keyGroup.appendChild(keyLabel);

    const keyInput = document.createElement('input');
    keyInput.type = 'password';
    keyInput.placeholder = 'Enter API key';
    keyGroup.appendChild(keyInput);

    section.appendChild(keyGroup);

    const genBtn = document.createElement('button');
    genBtn.textContent = 'Generate Code';
    genBtn.onclick = () =>
      this.generateAICode(providerSelect.value as 'openai' | 'anthropic', keyInput.value);
    section.appendChild(genBtn);

    return section;
  }

  private async generateAICode(provider: 'openai' | 'anthropic', apiKey: string): Promise<void> {
    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }

    const description = prompt('Describe what you want the node to do:');
    if (!description) return;

    try {
      const request: AIGenerationRequest = {
        description,
        provider,
        mode: 'code-only',
        existingInputs: this.customNodeInputs,
        existingOutputs: this.customNodeOutputs,
        existingProperties: this.customNodeProperties,
      };

      // Save API key
      AIAssistant.saveAPIKeys({ [provider]: apiKey });

      const response = await AIAssistant.generateCode(request);

      if (response.success && response.code && this.editorView) {
        // Update editor with generated code
        this.editorView.dispatch({
          changes: {
            from: 0,
            to: this.editorView.state.doc.length,
            insert: response.code,
          },
        });

        alert('Code generated successfully!');
      } else {
        alert(`Error: ${response.error}`);
      }
    } catch (error) {
      alert(`Failed to generate code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private createCustomNodeActionsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'custom-node-actions';

    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export';
    exportBtn.onclick = () => this.exportCustomNode();
    section.appendChild(exportBtn);

    const importBtn = document.createElement('button');
    importBtn.textContent = 'Import';
    importBtn.onclick = () => this.importCustomNode();
    section.appendChild(importBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'danger-btn';
    deleteBtn.onclick = () => this.deleteCustomNode();
    section.appendChild(deleteBtn);

    return section;
  }

  private exportCustomNode(): void {
    if (!this.currentCustomNodeDef) return;

    const definition: CustomNodeDefinition = {
      id: this.currentCustomNodeDef.id || `custom-${Date.now()}`,
      name: this.currentCustomNodeDef.name || 'CustomNode',
      label: this.currentCustomNodeDef.label || 'Custom Node',
      category: this.currentCustomNodeDef.category || 'Custom',
      icon: this.currentCustomNodeDef.icon || '✨',
      description: this.currentCustomNodeDef.description || '',
      inputs: this.customNodeInputs,
      outputs: this.customNodeOutputs,
      properties: this.customNodeProperties,
      evaluateCode: this.editorView?.state.doc.toString() || '',
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    exportCustomNodeToFile(definition);
  }

  private async importCustomNode(): Promise<void> {
    try {
      const definition = await importCustomNodeFromFile();
      if (definition && this.customNodeManager) {
        const result = this.customNodeManager.createCustomNode(definition);
        if (result.success) {
          alert('Custom node imported successfully!');
        } else {
          alert(`Import failed: ${result.error}`);
        }
      }
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private deleteCustomNode(): void {
    if (!this.currentCustomNodeDef?.name || !this.customNodeManager) return;

    if (confirm(`Delete custom node "${this.currentCustomNodeDef.label}"?`)) {
      const result = this.customNodeManager.deleteCustomNode(this.currentCustomNodeDef.name);
      if (result.success) {
        alert('Custom node deleted successfully!');
        this.hide();
      } else {
        alert(`Delete failed: ${result.error}`);
      }
    }
  }

  /**
   * Setup autosave listeners for custom node editor
   */
  private setupAutosaveListeners(): void {
    // Listen to all form inputs
    const formInputs = this.contentContainer.querySelectorAll('input, textarea, select');
    formInputs.forEach((input) => {
      input.addEventListener('input', () => this.triggerAutosave());
      input.addEventListener('change', () => this.triggerAutosave());
    });

    // Listen to code editor changes if available
    if (this.editorView) {
      // CodeMirror change listener
      const checkForChanges = () => {
        this.triggerAutosave();
      };

      // Use a mutation observer to detect code changes
      const editorElement = this.editorView.dom;
      const observer = new MutationObserver(checkForChanges);
      observer.observe(editorElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }

  /**
   * Trigger autosave with 1-second debounce
   */
  private triggerAutosave(): void {
    // Clear existing timer
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }

    // Set new timer
    this.autosaveTimer = window.setTimeout(() => {
      this.performAutosave();
    }, 1000);
  }

  /**
   * Perform the actual autosave operation
   */
  private performAutosave(): void {
    if (!this.currentEditingNode || !this.customNodeManager) return;

    try {
      // Gather current state from form inputs
      const nameInput = this.contentContainer.querySelector(
        'input[data-field="name"]'
      ) as HTMLInputElement;
      const labelInput = this.contentContainer.querySelector(
        'input[data-field="label"]'
      ) as HTMLInputElement;
      const categoryInput = this.contentContainer.querySelector(
        'input[data-field="category"]'
      ) as HTMLInputElement;
      const descriptionInput = this.contentContainer.querySelector(
        'textarea[data-field="description"]'
      ) as HTMLTextAreaElement;

      const previousName = this.currentCustomNodeDef?.name;
      const newName = nameInput?.value || 'CustomNode';

      // Update current definition
      this.currentCustomNodeDef = {
        ...this.currentCustomNodeDef,
        name: newName,
        label: labelInput?.value || 'Custom Node',
        category: categoryInput?.value || 'Custom',
        description: descriptionInput?.value || '',
        evaluateCode: this.editorView?.state.doc.toString() || '',
      };

      // Create full definition
      const definition: CustomNodeDefinition = {
        id: this.currentCustomNodeDef.id || `custom-${Date.now()}`,
        name: this.currentCustomNodeDef.name || 'CustomNode',
        label: this.currentCustomNodeDef.label || 'Custom Node',
        category: this.currentCustomNodeDef.category || 'Custom',
        icon: this.currentCustomNodeDef.icon || '✨',
        description: this.currentCustomNodeDef.description || '',
        inputs: this.customNodeInputs,
        outputs: this.customNodeOutputs,
        properties: this.customNodeProperties,
        evaluateCode: this.currentCustomNodeDef.evaluateCode || '',
        version: '1.0.0',
        createdAt: this.currentCustomNodeDef.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      // Check if name changed from default
      const isNewNode = previousName === 'CustomNode' && newName !== 'CustomNode';

      if (isNewNode) {
        // Register as new custom node
        const result = this.customNodeManager.createCustomNode(definition);
        if (result.success) {
          console.log('Custom node registered:', newName);

          // Update the actual node in the graph
          this.currentEditingNode.type = newName;
          this.currentEditingNode.label = definition.label;
        }
      } else if (previousName && previousName !== 'CustomNode') {
        // Update existing custom node
        const result = this.customNodeManager.updateCustomNode(definition);
        if (result.success) {
          console.log('Custom node updated:', newName);
        }
      } else {
        // Just store locally, don't register yet
        console.log('Custom node definition updated (not yet registered)');
      }
    } catch (error) {
      console.error('Autosave failed:', error);
    }
  }

  dispose(): void {
    // Clean up property panes
    for (const pane of this.propertyPanes.values()) {
      pane.dispose();
    }
    this.propertyPanes.clear();

    // Remove panel from DOM
    this.panel.remove();
  }
}
