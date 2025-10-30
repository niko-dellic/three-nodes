import { Node } from '@/core/Node';
import { Pane } from 'tweakpane';
import { ObjectInspector } from './ObjectInspector';
import { CustomNodeDefinition, AIGenerationRequest } from '@/types/customNode';
import { PortDefinition } from '@/types';
import { PropertyConfig } from '@/core/types';
import { CustomNodeManager } from '@/three/CustomNodeManager';
import { AIAssistant } from '@/utils/AIAssistant';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { CustomNodeFieldsManager } from './CustomNodeFieldsManager';
import { BaseThreeNode } from '@/three';
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
  private codeEditor?: CodeMirrorEditor; // Unified code editor (readonly/editable)
  private customNodeFieldsManager: CustomNodeFieldsManager;
  private currentCustomNodeDef?: Partial<CustomNodeDefinition>;
  private customNodeInputs: PortDefinition[] = [];
  private customNodeOutputs: PortDefinition[] = [];
  private customNodeProperties: PropertyConfig[] = [];
  private currentEditingNode?: Node;
  private isUpdatingFromCode: boolean = false; // Flag to prevent circular updates
  private isUpdatingFromField: boolean = false; // Flag to prevent circular updates

  // Callback for when a new custom node is created and should be added to canvas
  private onCustomNodeCreated?: (nodeType: string, position: { x: number; y: number }) => void;

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

    // Initialize custom node fields manager
    this.customNodeFieldsManager = new CustomNodeFieldsManager({
      onRegenerateCode: () => this.regenerateClassCode(),
      onTriggerAutosave: () => this.triggerNodeAutosave(),
    });

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
    // Update the fields manager with the custom node manager
    this.customNodeFieldsManager = new CustomNodeFieldsManager({
      customNodeManager: manager,
      onRegenerateCode: () => this.regenerateClassCode(),
      onTriggerAutosave: () => this.triggerNodeAutosave(),
    });
  }

  /**
   * Set callback for when a custom node is created and needs to be added to canvas
   */
  setOnCustomNodeCreated(
    callback: (nodeType: string, position: { x: number; y: number }) => void
  ): void {
    this.onCustomNodeCreated = callback;
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
      tab.addEventListener('click', async () => {
        this.activeNodeIndex = i;
        this.renderTabs();
        await this.renderContent();
      });
      this.tabsContainer.appendChild(tab);
    }
  }

  /**
   * Check if a node is a custom node
   */
  private isCustomNode(node: Node): boolean {
    // If we're currently editing this node and it has a custom node definition, it's custom
    // This handles the case where the name has been changed but not yet saved
    if (this.currentEditingNode === node && this.currentCustomNodeDef) {
      return true;
    }

    // Check if this node exists in the custom node registry
    // This is the most reliable way to detect custom nodes
    if (this.customNodeManager?.getCustomNode(node.type) !== undefined) {
      return true;
    }

    // Fallback: check for default CustomNode type
    return node.type === 'CustomNode';
  }

  /**
   * Helper method to trigger autosave on the current editing node
   */
  private triggerNodeAutosave(): void {
    if (
      this.currentEditingNode &&
      typeof (this.currentEditingNode as any).triggerAutosave === 'function'
    ) {
      (this.currentEditingNode as any).triggerAutosave();
    }
  }

  private async renderContent(): Promise<void> {
    if (this.selectedNodes.length === 0) {
      this.renderEmpty();
      return;
    }

    const node = this.selectedNodes[this.activeNodeIndex];

    // Dispose the code editor before clearing the container
    if (this.codeEditor) {
      this.codeEditor.dispose();
      this.codeEditor = undefined;
    }

    this.contentContainer.innerHTML = '';

    // Branch based on node type
    if (this.isCustomNode(node)) {
      // Render custom node editor interface
      await this.renderCustomNodeEditor(node);
    } else {
      // Render standard properties panel for built-in nodes
      await this.renderStandardNodePanel(node);
    }
  }

  /**
   * Render the standard properties panel for built-in nodes
   */
  private async renderStandardNodePanel(node: Node): Promise<void> {
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

    // Try to render code viewer section (only if source is available)
    const codeViewerSection = await this.createCodeSection(node, false);
    if (codeViewerSection) {
      sectionsContainer.appendChild(codeViewerSection);
    }

    // Render duplicate button for built-in nodes
    const duplicateSection = this.createDuplicateButtonSection(node);
    sectionsContainer.appendChild(duplicateSection);

    this.contentContainer.appendChild(sectionsContainer);
  }

  /**
   * Render the custom node editor interface
   */
  private async renderCustomNodeEditor(node: Node): Promise<void> {
    // Store current editing node
    this.currentEditingNode = node;

    // Initialize custom node definition from node
    this.initializeCustomNodeDefinition(node);

    // Set state on fields manager
    this.customNodeFieldsManager.setState(
      this.currentCustomNodeDef,
      this.customNodeInputs,
      this.customNodeOutputs,
      this.customNodeProperties,
      this.currentEditingNode
    );

    const container = document.createElement('div');
    container.className = 'custom-node-editor';

    // Add all editor sections (AI assistant at top to help with everything)
    container.appendChild(this.createCustomNodeAISection());
    container.appendChild(this.customNodeFieldsManager.createCustomNodeDefinitionSection());
    container.appendChild(this.customNodeFieldsManager.createCustomNodePortsSections());
    container.appendChild(this.customNodeFieldsManager.createCustomNodePropertiesSection());

    // Code section (always shown for custom nodes, even if it fails to load)
    const codeSection = await this.createCodeSection(node, true);
    if (codeSection) {
      container.appendChild(codeSection);
    }

    container.appendChild(this.createCustomNodeActionsSection());

    this.contentContainer.appendChild(container);

    // Setup autosave listeners
    this.setupAutosaveListeners();
  }

  /**
   * Initialize custom node definition from selected node
   */
  private initializeCustomNodeDefinition(node: Node): void {
    // Generate the full class code for the custom node
    const fullClassCode = this.generateCustomNodeClassCode(node);

    // Extract current state from node (use name as label)
    this.currentCustomNodeDef = {
      name: node.type,
      label: node.type, // Use name as label
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

  async updateDataFlow(): Promise<void> {
    // Re-render the content to update data flow values
    if (this.isVisible && this.selectedNodes.length > 0) {
      await this.renderContent();
    }
  }

  /**
   * Create a unified code section that handles both readonly and editable modes
   * Returns null if code cannot be loaded (for built-in nodes)
   */
  private async createCodeSection(
    node: Node,
    showFormatButton: boolean = false
  ): Promise<HTMLElement | null> {
    // Try to get the code first before creating any DOM elements
    let code: string;
    try {
      code = showFormatButton
        ? this.currentCustomNodeDef?.evaluateCode || '// Add your custom logic here'
        : await this.getNodeEvaluateCode(node);

      // If we couldn't get code for a built-in node, don't render the section
      if (
        !showFormatButton &&
        (!code ||
          code.startsWith('// Error extracting code') ||
          code === '// No source code available')
      ) {
        console.log(`No source code available for ${node.type}, skipping code viewer section`);
        return null;
      }
    } catch (error) {
      console.warn(`Failed to load source code for ${node.type}:`, error);
      // For built-in nodes, return null to hide the section
      if (!showFormatButton) {
        return null;
      }
      // For custom nodes, use fallback
      code = '// Add your custom logic here';
    }

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

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';

    // Add format button if requested
    if (showFormatButton) {
      const formatBtn = document.createElement('button');
      formatBtn.textContent = '✨ Format';
      formatBtn.onclick = () => this.formatEditorCode();
      buttonContainer.appendChild(formatBtn);
    }

    // Add fullscreen button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.innerHTML = '<i class="ph ph-corners-out"></i>';
    fullscreenBtn.onclick = () => this.toggleCodeEditorFullscreen();
    buttonContainer.appendChild(fullscreenBtn);

    header.appendChild(buttonContainer);
    section.appendChild(header);

    // Add helper text
    const helperText = document.createElement('div');
    helperText.style.fontSize = '12px';
    helperText.style.color = '#888';
    helperText.style.marginBottom = '8px';
    helperText.style.fontStyle = 'italic';
    helperText.textContent = showFormatButton
      ? 'Full class source code. You can edit the evaluate() function body directly. To modify inputs/outputs/properties, use the form fields above.'
      : 'Full class source code (read-only). Click "Duplicate as Custom Node" below to create an editable copy.';
    section.appendChild(helperText);

    // Create CodeMirror editor container
    const editorContainer = document.createElement('div');
    editorContainer.className = showFormatButton
      ? 'code-editor-container'
      : 'code-viewer-container';
    editorContainer.id = 'unified-code-editor';
    section.appendChild(editorContainer);

    // Initialize code editor
    requestAnimationFrame(async () => {
      try {
        if (!this.codeEditor) {
          // Create new editor with the appropriate readonly state
          this.codeEditor = new CodeMirrorEditor({
            containerId: 'unified-code-editor',
            readOnly: !showFormatButton, // false for custom nodes (editable), true for built-in (readonly)
          });
          await this.codeEditor.initialize(code);
        } else {
          // This shouldn't happen as we dispose the editor before re-rendering
          console.warn('Code editor already exists, updating content');
          await this.codeEditor.setCode(code);
        }
      } catch (error) {
        console.error('Failed to initialize code editor:', error);
      }
    });

    return section;
  }

  /**
   * Get the source code for a node (uses getRawCode from BaseThreeNode)
   */
  private async getNodeEvaluateCode(node: Node): Promise<string> {
    try {
      // Use the node's getRawCode method (works for both built-in and custom nodes)
      if (typeof (node as BaseThreeNode).getRawCode === 'function')
        return (node as BaseThreeNode).getRawCode();

      return '// No evaluate function found';
    } catch (error) {
      return `// Error extracting code: ${error}`;
    }
  }

  /**
   * Extract the evaluate function body from full class code
   */
  private extractEvaluateFunctionBody(fullCode: string): string {
    try {
      // Try to find the evaluate function using regex
      const evaluateRegex = /evaluate\s*\([^)]*\)\s*:\s*\w+\s*\{([\s\S]*)\}\s*\}/;
      const match = fullCode.match(evaluateRegex);

      if (match && match[1]) {
        // Found the evaluate function body, return it trimmed
        return match[1].trim();
      }

      // If we can't extract it, return the original code
      // (might be just evaluate function body already)
      return fullCode;
    } catch (error) {
      console.warn('Failed to extract evaluate function body:', error);
      return fullCode;
    }
  }

  /**
   * Generate a full class code representation for a custom node
   */
  private generateCustomNodeClassCode(node: Node): string {
    // Use the node's getRawCode method if available
    if (typeof (node as any).getRawCode === 'function') {
      return (node as any).getRawCode();
    }

    // Fallback to the old method if getRawCode is not available
    return this.generateCustomNodeClassCodeFallback(node);
  }

  /**
   * Fallback method for generating class code (kept for compatibility)
   */
  private generateCustomNodeClassCodeFallback(node: Node): string {
    const inputs = Array.from(node.inputs.values());
    const outputs = Array.from(node.outputs.values());
    const properties = Array.from(node.properties.values());

    // Get the evaluate function body
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

    // Generate the full class code
    let classCode = `import { BaseThreeNode } from '@/three/BaseThreeNode';
import { EvaluationContext } from '@/core/types';
import * as THREE from 'three';

`;

    // Add docstring placeholder
    classCode += `/**\n * Custom node - add your description here\n */\n`;

    classCode += `export class ${node.type} extends BaseThreeNode {
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
   * Create a simple duplicate button section
   */
  private createDuplicateButtonSection(node: Node): HTMLElement {
    const duplicateBtn = document.createElement('button');
    duplicateBtn.textContent = 'Duplicate Node';

    duplicateBtn.onclick = () => this.duplicateNodeAsCustom(node);

    return duplicateBtn;
  }

  /**
   * Duplicate a node as a custom node
   */
  private duplicateNodeAsCustom(node: Node): void {
    if (!this.customNodeManager) {
      alert('Custom node manager not available');
      return;
    }

    // Use the CustomNodeManager's duplicateNode method to create the definition
    const result = this.customNodeManager.duplicateNode(node);

    if (result.success && result.nodeName) {
      // Get the custom node definition that was just created
      const definition = this.customNodeManager.getCustomNode(result.nodeName);

      if (definition && this.onCustomNodeCreated) {
        // Notify GraphEditor to create an instance of the new custom node on the canvas
        // Position it near the original node
        this.onCustomNodeCreated(definition.name, {
          x: node.position.x + 100,
          y: node.position.y + 100,
        });

        console.log(`Custom node created: ${definition.label}`);
      }
    } else {
      alert(`Failed to create custom node: ${result.error}`);
    }
  }

  private toggleCodeEditorFullscreen(): void {
    this.codeEditor?.toggleFullscreen();
  }

  /**
   * Format the code in the custom node editor
   */
  private async formatEditorCode(): Promise<void> {
    if (!this.codeEditor) {
      console.warn('No editor view available to format');
      return;
    }

    try {
      await this.codeEditor.formatCurrentCode();
    } catch (error) {
      console.error('Failed to format code:', error);
      alert('Failed to format code. Check console for details.');
    }
  }

  private createCustomNodeAISection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'custom-node-section';

    const titleEl = document.createElement('h3');
    titleEl.textContent = 'Yolo AI Mode (Optional)';
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

      if (response.success && response.code && this.codeEditor) {
        // Update editor with generated code (format to ensure proper indentation)
        await this.codeEditor.setCode(response.code, true);

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
    if (!this.currentEditingNode) return;

    // Cast to CustomNode to access export method
    const customNode = this.currentEditingNode as any;
    if (customNode.exportToFile) {
      customNode.exportToFile();
    }
  }

  private async importCustomNode(): Promise<void> {
    if (!this.currentEditingNode) return;

    try {
      // Cast to CustomNode to access import method
      const customNode = this.currentEditingNode as any;
      if (customNode.importFromFile) {
        const success = await customNode.importFromFile();
        if (success) {
          alert('Custom node imported successfully!');
          // Refresh the UI to show the imported data
          this.renderContent();
        } else {
          alert('Import failed');
        }
      }
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private deleteCustomNode(): void {
    if (!this.currentEditingNode) return;

    if (confirm(`Delete custom node "${this.currentEditingNode.label}"?`)) {
      // Cast to CustomNode to access delete method
      const customNode = this.currentEditingNode as any;
      if (customNode.delete) {
        const success = customNode.delete();
        if (success) {
          alert('Custom node deleted successfully!');
          this.hide();
        } else {
          alert('Delete failed');
        }
      }
    }
  }

  /**
   * Setup autosave listeners for custom node editor
   */
  private setupAutosaveListeners(): void {
    if (!this.currentEditingNode) return;

    // Cast to CustomNode to access autosave methods
    const customNode = this.currentEditingNode as any;

    // Listen to name input specifically for real-time updates
    const nameInput = this.contentContainer.querySelector(
      'input[data-field="name"]'
    ) as HTMLInputElement;
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        customNode.triggerNameUpdate();
        customNode.triggerAutosave();
      });
    }

    // Listen to description textarea for docstring generation
    const descriptionInput = this.contentContainer.querySelector(
      'textarea[data-field="description"]'
    ) as HTMLTextAreaElement;
    if (descriptionInput) {
      descriptionInput.addEventListener('input', () => {
        this.regenerateClassCode();
        customNode.triggerAutosave();
      });
    }

    // Listen to all other form inputs
    const formInputs = this.contentContainer.querySelectorAll(
      'input:not([data-field="name"]), textarea:not([data-field="description"]), select'
    );
    formInputs.forEach((input) => {
      input.addEventListener('input', () => customNode.triggerAutosave());
      input.addEventListener('change', () => customNode.triggerAutosave());
    });

    // Listen to code editor changes if available
    if (this.codeEditor) {
      // CodeMirror change listener
      const checkForChanges = () => {
        this.syncClassNameFromCode();
        customNode.triggerAutosave();
      };

      // Use a mutation observer to detect code changes
      const editorContainer = document.getElementById('unified-code-editor');
      if (editorContainer) {
        const observer = new MutationObserver(checkForChanges);
        observer.observe(editorContainer, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }
    }
  }

  /**
   * Sync the class name from CodeMirror to the name field
   */
  private syncClassNameFromCode(): void {
    if (!this.codeEditor || this.isUpdatingFromField) return;

    const code = this.codeEditor.getCode();
    const classNameMatch = code.match(/export\s+class\s+(\w+)\s+extends/);

    if (classNameMatch && classNameMatch[1]) {
      const className = classNameMatch[1];
      const nameInput = this.contentContainer.querySelector(
        'input[data-field="name"]'
      ) as HTMLInputElement;

      if (nameInput && nameInput.value !== className) {
        // Set flag to prevent circular updates
        this.isUpdatingFromCode = true;

        nameInput.value = className;

        // Update the node and definition
        if (this.currentEditingNode) {
          this.currentEditingNode.label = className;
          this.currentEditingNode.type = className;
          this.currentEditingNode.markDirty();
          if (this.currentEditingNode.graph) {
            this.currentEditingNode.graph.triggerChange();
          }
        }

        if (this.currentCustomNodeDef) {
          this.currentCustomNodeDef.name = className;
          this.currentCustomNodeDef.label = className;
        }

        // Update tabs
        this.renderTabs();

        // Clear flag after a short delay
        setTimeout(() => {
          this.isUpdatingFromCode = false;
        }, 100);
      }
    }
  }

  /**
   * Regenerate the class code based on current state
   */
  private async regenerateClassCode(): Promise<void> {
    if (!this.currentEditingNode || !this.codeEditor || this.isUpdatingFromCode) return;

    // Set flag to prevent circular updates
    this.isUpdatingFromField = true;

    const nameInput = this.contentContainer.querySelector(
      'input[data-field="name"]'
    ) as HTMLInputElement;

    // Store the current evaluate function body
    const fullCode = this.codeEditor.getCode();
    const evaluateBody = this.extractEvaluateFunctionBody(fullCode);

    // Temporarily update the node's evaluate function for code generation
    const tempNode = { ...this.currentEditingNode } as Node;
    tempNode.type = nameInput?.value || this.currentEditingNode.type;
    tempNode.label = nameInput?.value || this.currentEditingNode.label;

    // Generate new class code
    const newClassCode = this.generateCustomNodeClassCodeWithEvaluate(tempNode, evaluateBody);

    // Update the editor with formatting to prevent indentation accumulation
    await this.codeEditor.setCode(newClassCode, true);

    // Clear flag after a short delay
    setTimeout(() => {
      this.isUpdatingFromField = false;
    }, 100);
  }

  /**
   * Generate class code with a specific evaluate body
   */
  private generateCustomNodeClassCodeWithEvaluate(node: Node, evaluateBody: string): string {
    const inputs = Array.from(node.inputs.values());
    const outputs = Array.from(node.outputs.values());
    const properties = Array.from(node.properties.values());

    // Get description for docstring
    const descriptionInput = this.contentContainer.querySelector(
      'textarea[data-field="description"]'
    ) as HTMLTextAreaElement;
    const description = descriptionInput?.value || '';

    let classCode = `import { BaseThreeNode } from '@/three/BaseThreeNode';
import { EvaluationContext } from '@/core/types';
import * as THREE from 'three';

`;

    // Add docstring if description exists
    if (description.trim()) {
      classCode += `/**\n * ${description.trim().replace(/\n/g, '\n * ')}\n */\n`;
    }

    classCode += `export class ${node.type} extends BaseThreeNode {
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

  dispose(): void {
    // Clean up property panes
    for (const pane of this.propertyPanes.values()) {
      pane.dispose();
    }
    this.propertyPanes.clear();

    // Clean up code editor
    if (this.codeEditor) {
      this.codeEditor.dispose();
      this.codeEditor = undefined;
    }

    // Remove panel from DOM
    this.panel.remove();
  }
}
