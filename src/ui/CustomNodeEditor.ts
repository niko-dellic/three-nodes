import { Node } from '@/core/Node';
import { CustomNodeDefinition, AIGenerationRequest } from '@/types/customNode';
import { PortType, PortDefinition } from '@/types';
import { PropertyConfig, PropertyType } from '@/core/types';
import { CustomNodeManager } from '@/three/CustomNodeManager';
import { AIAssistant } from '@/utils/AIAssistant';
import { exportCustomNodeToFile, importCustomNodeFromFile } from '@/utils/customNodeIO';
import { CodeMirrorEditor } from './CodeMirrorEditor';

export interface CustomNodeEditorOptions {
  customNodeManager: CustomNodeManager;
  onHide?: () => void;
  onCustomNodeCreated?: (nodeType: string, position: { x: number; y: number }) => void;
}

/**
 * Handles the UI and logic for editing custom nodes
 * Manages definition, ports, properties, code editor, AI assistant, and actions
 */
export class CustomNodeEditor {
  private node?: Node;
  private codeEditor?: CodeMirrorEditor;
  private customNodeManager: CustomNodeManager;
  private onHide?: () => void;

  // State
  private currentDefinition?: Partial<CustomNodeDefinition>;
  private customNodeInputs: PortDefinition[] = [];
  private customNodeOutputs: PortDefinition[] = [];
  private customNodeProperties: PropertyConfig[] = [];

  constructor(options: CustomNodeEditorOptions) {
    this.customNodeManager = options.customNodeManager;
    this.onHide = options.onHide;
  }

  /**
   * Render the custom node editor UI
   */
  async render(node: Node, container: HTMLElement): Promise<void> {
    this.node = node;

    // Initialize state from node
    this.initializeState(node);

    // Build UI sections
    container.innerHTML = '';
    container.className = 'custom-node-editor';

    // AI Assistant (at top)
    container.appendChild(this.createAISection());

    // Node Definition (name, category, description)
    container.appendChild(this.createDefinitionSection());

    // Inputs
    container.appendChild(this.createPortsSection('Inputs', this.customNodeInputs, true));

    // Outputs
    container.appendChild(this.createPortsSection('Outputs', this.customNodeOutputs, false));

    // Properties
    container.appendChild(this.createPropertiesSection());

    // Code Editor
    container.appendChild(await this.createCodeEditorSection());

    // Actions (Export/Import/Delete)
    container.appendChild(this.createActionsSection());
  }

  /**
   * Initialize state from the node
   */
  private initializeState(node: Node): void {
    // Generate the full class code for the custom node
    const fullClassCode = this.generateCustomNodeClassCode(node);

    // Extract current state from node (use name as label)
    this.currentDefinition = {
      name: node.type,
      label: node.type,
      category: 'User',
      icon: '✨',
      description: '',
      evaluateCode: fullClassCode,
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
    }));

    // Extract properties
    this.customNodeProperties = Array.from(node.properties.values()).map((prop) => ({
      name: prop.name,
      type: prop.type,
      value: prop.value,
      label: prop.label,
      min: (prop as any).min,
      max: (prop as any).max,
      step: (prop as any).step,
      options: (prop as any).options,
    }));
  }

  /**
   * Create AI Assistant section
   */
  private createAISection(): HTMLElement {
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

  /**
   * Create Node Definition section (name, category, description)
   */
  private createDefinitionSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'custom-node-section';

    const header = document.createElement('h3');
    header.textContent = 'Node Definition';
    section.appendChild(header);

    // Name input
    section.appendChild(
      this.createFormGroup('Name', 'text', 'name', this.node?.type || 'CustomNode')
    );

    // Category dropdown
    section.appendChild(this.createCategoryDropdown());

    // Description textarea
    section.appendChild(this.createFormGroup('Description', 'textarea', 'description', ''));

    return section;
  }

  /**
   * Create form group helper
   */
  private createFormGroup(label: string, type: string, field: string, value: string): HTMLElement {
    const group = document.createElement('div');
    group.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    group.appendChild(labelEl);

    if (type === 'textarea') {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('data-field', field);
      textarea.rows = 3;
      group.appendChild(textarea);
    } else {
      const input = document.createElement('input');
      input.type = type;
      input.value = value;
      input.setAttribute('data-field', field);
      group.appendChild(input);
    }

    return group;
  }

  /**
   * Create category dropdown
   */
  private createCategoryDropdown(): HTMLElement {
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = 'Category';
    group.appendChild(label);

    const select = document.createElement('select');
    select.setAttribute('data-field', 'category');

    // Get all categories
    const categories = this.getAllCategories();

    // Always include "User" category at the top
    if (!categories.includes('User')) {
      categories.unshift('User');
    }

    // Populate dropdown
    for (const category of categories) {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      if (category === (this.currentDefinition?.category || 'User')) {
        option.selected = true;
      }
      select.appendChild(option);
    }

    group.appendChild(select);
    return group;
  }

  /**
   * Get all categories from registry
   */
  private getAllCategories(): string[] {
    const registry = (this.customNodeManager as any).registry;
    if (!registry || typeof registry.getAllTypes !== 'function') {
      return ['User'];
    }

    const allTypes = registry.getAllTypes();
    const categories = new Set<string>();

    for (const metadata of allTypes) {
      if (metadata.category) {
        categories.add(metadata.category);
      }
    }

    // Sort with "User" first
    const sortedCategories = Array.from(categories).sort((a, b) => {
      if (a === 'User') return -1;
      if (b === 'User') return 1;
      return a.localeCompare(b);
    });

    return sortedCategories;
  }

  /**
   * Create Ports section (inputs or outputs)
   */
  private createPortsSection(
    title: string,
    ports: PortDefinition[],
    isInput: boolean
  ): HTMLElement {
    const section = document.createElement('div');
    section.className = 'custom-node-section';

    const titleEl = document.createElement('h4');
    titleEl.textContent = title;
    section.appendChild(titleEl);

    const listContainer = document.createElement('div');
    listContainer.className = isInput ? 'ports-list-inputs' : 'ports-list-outputs';
    listContainer.id = isInput ? 'inputs-list' : 'outputs-list';
    this.renderPortsList(listContainer, ports, isInput);
    section.appendChild(listContainer);

    const addBtn = document.createElement('button');
    addBtn.textContent = `+ Add ${isInput ? 'Input' : 'Output'}`;
    addBtn.type = 'button';
    addBtn.onclick = () => this.addPort(isInput);
    section.appendChild(addBtn);

    return section;
  }

  /**
   * Render ports list
   */
  private renderPortsList(container: HTMLElement, ports: PortDefinition[], isInput: boolean): void {
    container.innerHTML = '';

    if (ports.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.textContent = `No ${isInput ? 'inputs' : 'outputs'} defined`;
      emptyMsg.style.color = '#888';
      emptyMsg.style.fontStyle = 'italic';
      container.appendChild(emptyMsg);
      return;
    }

    ports.forEach((port, index) => {
      const portItem = document.createElement('div');
      portItem.className = 'port-item';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = port.name;
      nameInput.placeholder = 'Port name';
      nameInput.addEventListener('input', () => {
        port.name = nameInput.value;
        this.onPortChanged();
      });
      portItem.appendChild(nameInput);

      const typeSelect = document.createElement('select');
      const types = Object.values(PortType);
      types.forEach((type) => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        if (type === port.type) option.selected = true;
        typeSelect.appendChild(option);
      });
      typeSelect.addEventListener('change', () => {
        port.type = typeSelect.value as PortType;
        this.onPortChanged();
      });
      portItem.appendChild(typeSelect);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕';
      removeBtn.className = 'remove-btn';
      removeBtn.onclick = () => this.removePort(index, isInput);
      portItem.appendChild(removeBtn);

      container.appendChild(portItem);
    });
  }

  /**
   * Add a new port
   */
  private addPort(isInput: boolean): void {
    const ports = isInput ? this.customNodeInputs : this.customNodeOutputs;
    const baseName = isInput ? 'input' : 'output';

    // Generate unique name
    let uniqueName = baseName;
    let counter = 1;
    while (ports.some((p) => p.name === uniqueName)) {
      uniqueName = `${baseName}${counter}`;
      counter++;
    }

    ports.push({
      name: uniqueName,
      type: PortType.Number,
    });

    // Refresh list
    const listId = isInput ? 'inputs-list' : 'outputs-list';
    const container = document.getElementById(listId);
    if (container) {
      this.renderPortsList(container, ports, isInput);
    }

    this.onPortChanged();
  }

  /**
   * Remove a port
   */
  private removePort(index: number, isInput: boolean): void {
    const ports = isInput ? this.customNodeInputs : this.customNodeOutputs;
    ports.splice(index, 1);

    // Refresh list
    const listId = isInput ? 'inputs-list' : 'outputs-list';
    const container = document.getElementById(listId);
    if (container) {
      this.renderPortsList(container, ports, isInput);
    }

    this.onPortChanged();
  }

  /**
   * Create Properties section
   */
  private createPropertiesSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'custom-node-section';

    const titleEl = document.createElement('h4');
    titleEl.textContent = 'Properties';
    section.appendChild(titleEl);

    const listContainer = document.createElement('div');
    listContainer.className = 'properties-list';
    listContainer.id = 'properties-list';
    this.renderPropertiesList(listContainer);
    section.appendChild(listContainer);

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Property';
    addBtn.type = 'button';
    addBtn.onclick = () => this.addProperty();
    section.appendChild(addBtn);

    return section;
  }

  /**
   * Render properties list
   */
  private renderPropertiesList(container: HTMLElement): void {
    container.innerHTML = '';

    if (this.customNodeProperties.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.textContent = 'No properties defined';
      emptyMsg.style.color = '#888';
      emptyMsg.style.fontStyle = 'italic';
      container.appendChild(emptyMsg);
      return;
    }

    this.customNodeProperties.forEach((prop, index) => {
      const propItem = document.createElement('div');
      propItem.className = 'property-item';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = prop.name;
      nameInput.placeholder = 'Property name';
      nameInput.addEventListener('input', () => {
        prop.name = nameInput.value;
        this.onPropertyChanged();
      });
      propItem.appendChild(nameInput);

      const typeSelect = document.createElement('select');
      const types: PropertyType[] = ['number', 'string', 'boolean', 'color', 'list', 'point'];
      types.forEach((type) => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        if (type === prop.type) option.selected = true;
        typeSelect.appendChild(option);
      });
      typeSelect.addEventListener('change', () => {
        prop.type = typeSelect.value as PropertyType;
        this.onPropertyChanged();
      });
      propItem.appendChild(typeSelect);

      const valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.value = String(prop.value);
      valueInput.placeholder = 'Default value';
      valueInput.addEventListener('input', () => {
        // Convert value based on type
        if (prop.type === 'number') {
          prop.value = parseFloat(valueInput.value) || 0;
        } else if (prop.type === 'boolean') {
          prop.value = valueInput.value === 'true';
        } else {
          prop.value = valueInput.value;
        }
        this.onPropertyChanged();
      });
      propItem.appendChild(valueInput);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕';
      removeBtn.className = 'remove-btn';
      removeBtn.onclick = () => this.removeProperty(index);
      propItem.appendChild(removeBtn);

      container.appendChild(propItem);
    });
  }

  /**
   * Add property
   */
  private addProperty(): void {
    // Generate unique name
    let uniqueName = 'property';
    let counter = 1;
    while (this.customNodeProperties.some((p) => p.name === uniqueName)) {
      uniqueName = `property${counter}`;
      counter++;
    }

    this.customNodeProperties.push({
      name: uniqueName,
      type: 'number',
      value: 0,
    });

    // Refresh list
    const container = document.getElementById('properties-list');
    if (container) {
      this.renderPropertiesList(container);
    }

    this.onPropertyChanged();
  }

  /**
   * Remove property
   */
  private removeProperty(index: number): void {
    this.customNodeProperties.splice(index, 1);

    // Refresh list
    const container = document.getElementById('properties-list');
    if (container) {
      this.renderPropertiesList(container);
    }

    this.onPropertyChanged();
  }

  /**
   * Create Code Editor section
   */
  private async createCodeEditorSection(): Promise<HTMLElement> {
    const section = document.createElement('div');
    section.className = 'custom-node-section';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const titleEl = document.createElement('h3');
    titleEl.textContent = 'Source Code';
    header.appendChild(titleEl);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';

    const formatBtn = document.createElement('button');
    formatBtn.innerHTML = '<i class="ph-bold ph-magic-wand"></i>';
    formatBtn.title = 'Format Code';
    formatBtn.onclick = () => this.formatCode();
    buttonContainer.appendChild(formatBtn);

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.innerHTML = '<i class="ph-bold ph-corners-out"></i>';
    fullscreenBtn.title = 'Fullscreen';
    fullscreenBtn.onclick = () => this.codeEditor?.toggleFullscreen();
    buttonContainer.appendChild(fullscreenBtn);

    header.appendChild(buttonContainer);
    section.appendChild(header);

    // Helper text
    const helperText = document.createElement('div');
    helperText.style.fontSize = '12px';
    helperText.style.color = '#888';
    helperText.style.marginBottom = '8px';
    helperText.style.fontStyle = 'italic';
    helperText.textContent =
      'Full class source code. You can edit the evaluate() function body directly. To modify inputs/outputs/properties, use the form fields above.';
    section.appendChild(helperText);

    const editorContainer = document.createElement('div');
    editorContainer.className = 'code-editor-container';
    editorContainer.id = 'custom-node-code-editor';
    section.appendChild(editorContainer);

    // Initialize code editor
    requestAnimationFrame(async () => {
      const startCode = this.currentDefinition?.evaluateCode || '// Add your custom logic here';

      this.codeEditor = new CodeMirrorEditor({
        containerId: 'custom-node-code-editor',
        readOnly: false,
      });

      await this.codeEditor.initialize(startCode);
    });

    return section;
  }

  /**
   * Create Actions section (Export/Import/Delete)
   */
  private createActionsSection(): HTMLElement {
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

  /**
   * Format code in editor
   */
  private async formatCode(): Promise<void> {
    if (!this.codeEditor) return;

    try {
      await this.codeEditor.formatCurrentCode();
    } catch (error) {
      console.error('Failed to format code:', error);
      alert('Failed to format code. Check console for details.');
    }
  }

  /**
   * Generate AI code
   */
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

      AIAssistant.saveAPIKeys({ [provider]: apiKey });

      const response = await AIAssistant.generateCode(request);

      if (response.success && response.code && this.codeEditor) {
        // Format the AI-generated code to ensure proper indentation
        await this.codeEditor.setCode(response.code, true);
        alert('Code generated successfully!');
      } else {
        alert(`Error: ${response.error}`);
      }
    } catch (error) {
      alert(`Failed to generate code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export custom node
   */
  private exportCustomNode(): void {
    if (!this.currentDefinition || !this.node) return;

    const definition: CustomNodeDefinition = {
      id: this.currentDefinition.id || `custom-${Date.now()}`,
      name: this.currentDefinition.name || 'CustomNode',
      label: this.currentDefinition.label || 'Custom Node',
      category: this.currentDefinition.category || 'User',
      icon: this.currentDefinition.icon || '✨',
      description: this.currentDefinition.description || '',
      inputs: this.customNodeInputs,
      outputs: this.customNodeOutputs,
      properties: this.customNodeProperties,
      evaluateCode: this.codeEditor?.getCode() || '',
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    exportCustomNodeToFile(definition);
  }

  /**
   * Import custom node
   */
  private async importCustomNode(): Promise<void> {
    try {
      const definition = await importCustomNodeFromFile();
      if (definition) {
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

  /**
   * Delete custom node
   */
  private deleteCustomNode(): void {
    if (!this.currentDefinition?.name) return;

    if (
      confirm(
        `Delete custom node "${this.currentDefinition.label || this.currentDefinition.name}"?`
      )
    ) {
      const result = this.customNodeManager.deleteCustomNode(this.currentDefinition.name);
      if (result.success) {
        alert('Custom node deleted successfully!');
        this.onHide?.();
      } else {
        alert(`Delete failed: ${result.error}`);
      }
    }
  }

  /**
   * Handle port changes
   */
  private onPortChanged(): void {
    // Trigger callback or autosave
    // This can be expanded to notify parent
  }

  /**
   * Handle property changes
   */
  private onPropertyChanged(): void {
    // Trigger callback or autosave
    // This can be expanded to notify parent
  }

  /**
   * Generate custom node class code
   */
  private generateCustomNodeClassCode(node: Node): string {
    const inputs = Array.from(node.inputs.values());
    const outputs = Array.from(node.outputs.values());
    const properties = Array.from(node.properties.values());

    let evaluateBody = '// Add your custom logic here';
    if (typeof (node as any).evaluate === 'function') {
      const evaluateFunc = (node as any).evaluate;
      let code = evaluateFunc.toString();
      code = code
        .replace(/^[^{]*{/, '')
        .replace(/}[^}]*$/, '')
        .trim();
      evaluateBody = code || evaluateBody;
    }

    let classCode = `import { BaseThreeNode } from '@/three/BaseThreeNode';
import { EvaluationContext } from '@/core/types';
import * as THREE from 'three';

/**
 * Custom node - add your description here
 */
export class ${node.type} extends BaseThreeNode {
  constructor(id: string) {
    super(id, '${node.type}', '${node.label}');

`;

    // Add inputs
    if (inputs.length > 0) {
      classCode += `    // Add inputs\n`;
      for (const input of inputs) {
        const defaultValue =
          input.defaultValue !== undefined ? JSON.stringify(input.defaultValue) : 'undefined';
        classCode += `    this.addInput({\n`;
        classCode += `      name: '${input.name}',\n`;
        classCode += `      type: '${input.type}',\n`;
        classCode += `      defaultValue: ${defaultValue},\n`;
        classCode += `    });\n`;
      }
      classCode += '\n';
    }

    // Add outputs
    if (outputs.length > 0) {
      classCode += `    // Add outputs\n`;
      for (const output of outputs) {
        classCode += `    this.addOutput({\n`;
        classCode += `      name: '${output.name}',\n`;
        classCode += `      type: '${output.type}',\n`;
        classCode += `    });\n`;
      }
      classCode += '\n';
    }

    // Add properties
    if (properties.length > 0) {
      classCode += `    // Add properties\n`;
      for (const prop of properties) {
        classCode += `    this.addProperty({\n`;
        classCode += `      name: '${prop.name}',\n`;
        classCode += `      type: '${prop.type}',\n`;
        classCode += `      value: ${JSON.stringify(prop.value)},\n`;
        if ((prop as any).min !== undefined) classCode += `      min: ${(prop as any).min},\n`;
        if ((prop as any).max !== undefined) classCode += `      max: ${(prop as any).max},\n`;
        if ((prop as any).step !== undefined) classCode += `      step: ${(prop as any).step},\n`;
        if ((prop as any).options !== undefined)
          classCode += `      options: ${JSON.stringify((prop as any).options)},\n`;
        classCode += `    });\n`;
      }
      classCode += '\n';
    }

    classCode += `  }

  evaluate(context: EvaluationContext): void {
${evaluateBody
  .split('\n')
  .map((line) => '    ' + line)
  .join('\n')}
  }
}
`;

    return classCode;
  }

  /**
   * Get current code from editor
   */
  getCode(): string {
    return this.codeEditor?.getCode() || '';
  }

  /**
   * Get current definition
   */
  getDefinition(): Partial<CustomNodeDefinition> | undefined {
    return this.currentDefinition;
  }

  /**
   * Get inputs
   */
  getInputs(): PortDefinition[] {
    return this.customNodeInputs;
  }

  /**
   * Get outputs
   */
  getOutputs(): PortDefinition[] {
    return this.customNodeOutputs;
  }

  /**
   * Get properties
   */
  getProperties(): PropertyConfig[] {
    return this.customNodeProperties;
  }

  /**
   * Dispose and clean up
   */
  dispose(): void {
    this.codeEditor?.dispose();
    this.codeEditor = undefined;
    this.node = undefined;
  }
}
