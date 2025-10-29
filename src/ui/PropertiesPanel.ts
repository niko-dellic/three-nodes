import { Node } from '@/core/Node';
import { TweakpaneNode } from '@/three/TweakpaneNode';
import { Pane } from 'tweakpane';

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
  private maxWidth: number = 600;
  private isResizing: boolean = false;

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
      this.width = Math.max(this.minWidth, Math.min(this.maxWidth, parseInt(savedWidth, 10)));
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
      this.width = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));
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

  private renderContent(): void {
    if (this.selectedNodes.length === 0) {
      this.renderEmpty();
      return;
    }

    const node = this.selectedNodes[this.activeNodeIndex];
    this.contentContainer.innerHTML = '';

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

    this.contentContainer.appendChild(sectionsContainer);
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

        const portValue = document.createElement('span');
        portValue.className = 'data-flow-port-value';
        portValue.textContent = this.formatValue(port.value);
        item.appendChild(portValue);

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

        const portValue = document.createElement('span');
        portValue.className = 'data-flow-port-value';
        portValue.textContent = this.formatValue(port.value);
        item.appendChild(portValue);

        section.appendChild(item);
      }
    }

    return section;
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '(none)';
    }

    if (typeof value === 'number') {
      return value.toFixed(3);
    }

    if (typeof value === 'string') {
      return value.length > 50 ? value.substring(0, 47) + '...' : value;
    }

    if (typeof value === 'boolean') {
      return value.toString();
    }

    if (typeof value === 'object') {
      // Special handling for common types
      if (value.isColor) {
        return '#' + value.getHexString();
      }
      if (value.isVector3) {
        return `(${value.x.toFixed(2)}, ${value.y.toFixed(2)}, ${value.z.toFixed(2)})`;
      }
      if (value.isVector2) {
        return `(${value.x.toFixed(2)}, ${value.y.toFixed(2)})`;
      }
      if (value.x !== undefined && value.y !== undefined) {
        return `(${value.x.toFixed(2)}, ${value.y.toFixed(2)})`;
      }
      return JSON.stringify(value).substring(0, 50);
    }

    return String(value);
  }

  updateDataFlow(): void {
    // Re-render the content to update data flow values
    if (this.isVisible && this.selectedNodes.length > 0) {
      this.renderContent();
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
