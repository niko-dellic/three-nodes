import { Node } from '@/core/Node';
import { CustomNodeDefinition } from '@/types/customNode';
import { PortType, PortDefinition } from '@/types';
import { PropertyConfig, PropertyType } from '@/core/types';
import { CustomNodeManager } from '@/three/CustomNodeManager';

interface CustomNodeFieldsManagerOptions {
  customNodeManager?: CustomNodeManager;
  onRegenerateCode: () => void;
  onTriggerAutosave: () => void;
}

/**
 * Manages the UI fields for custom node editing (definition, ports, properties)
 */
export class CustomNodeFieldsManager {
  private customNodeManager?: CustomNodeManager;
  private onRegenerateCode: () => void;
  private onTriggerAutosave: () => void;

  // State references (shared with PropertiesPanel)
  private currentCustomNodeDef?: Partial<CustomNodeDefinition>;
  private customNodeInputs: PortDefinition[] = [];
  private customNodeOutputs: PortDefinition[] = [];
  private customNodeProperties: PropertyConfig[] = [];
  private currentEditingNode?: Node;

  constructor(options: CustomNodeFieldsManagerOptions) {
    this.customNodeManager = options.customNodeManager;
    this.onRegenerateCode = options.onRegenerateCode;
    this.onTriggerAutosave = options.onTriggerAutosave;
  }

  /**
   * Set the state for the current editing session
   */
  setState(
    currentCustomNodeDef: Partial<CustomNodeDefinition> | undefined,
    customNodeInputs: PortDefinition[],
    customNodeOutputs: PortDefinition[],
    customNodeProperties: PropertyConfig[],
    currentEditingNode: Node | undefined
  ): void {
    this.currentCustomNodeDef = currentCustomNodeDef;
    this.customNodeInputs = customNodeInputs;
    this.customNodeOutputs = customNodeOutputs;
    this.customNodeProperties = customNodeProperties;
    this.currentEditingNode = currentEditingNode;
  }

  /**
   * Create the node definition section (name, category, description)
   */
  createCustomNodeDefinitionSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'custom-node-section';

    const header = document.createElement('h3');
    header.textContent = 'Node Definition';
    section.appendChild(header);

    // Name input (also serves as label)
    const nameGroup = this.createFormGroup('Name', 'text', 'name', 'CustomNode');
    section.appendChild(nameGroup);

    // Category dropdown
    const categoryGroup = this.createCategoryDropdown();
    section.appendChild(categoryGroup);

    // Description textarea
    const descGroup = this.createFormGroup('Description', 'textarea', 'description', '');
    section.appendChild(descGroup);

    return section;
  }

  /**
   * Create a dropdown for selecting category
   */
  private createCategoryDropdown(): HTMLElement {
    const group = document.createElement('div');
    group.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.textContent = 'Category';
    group.appendChild(labelEl);

    const select = document.createElement('select');
    select.dataset.field = 'category';

    // Get all categories from the node registry
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
      if (category === (this.currentCustomNodeDef?.category || 'User')) {
        option.selected = true;
      }
      select.appendChild(option);
    }

    group.appendChild(select);
    return group;
  }

  /**
   * Get all unique categories from the node registry
   */
  private getAllCategories(): string[] {
    if (!this.customNodeManager) return ['User'];

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
   * Create a form group with label and input/textarea
   */
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

  /**
   * Create a flexbox container with both inputs and outputs side-by-side
   */
  createCustomNodePortsSections(): HTMLElement {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '1rem';
    container.style.width = '100%';

    const inputsSection = this.createCustomNodePortsSection('Inputs', this.customNodeInputs, true);
    inputsSection.style.flex = '1';
    inputsSection.style.minWidth = '0';

    const outputsSection = this.createCustomNodePortsSection(
      'Outputs',
      this.customNodeOutputs,
      false
    );
    outputsSection.style.flex = '1';
    outputsSection.style.minWidth = '0';

    container.appendChild(inputsSection);
    container.appendChild(outputsSection);

    return container;
  }

  /**
   * Create the ports section (inputs or outputs)
   */
  createCustomNodePortsSection(
    title: string,
    ports: PortDefinition[],
    isInput: boolean
  ): HTMLElement {
    const section = document.createElement('div');
    section.className = 'custom-node-section';

    const header = document.createElement('div');

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

  /**
   * Render the list of ports
   */
  private renderPortsList(container: HTMLElement, ports: PortDefinition[], isInput: boolean): void {
    container.innerHTML = '';

    if (ports.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-list muted';
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
        this.updatePortName(index, nameInput.value, isInput);
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
        this.updatePortType(index, typeSelect.value as PortType, isInput);
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

  /**
   * Update a port's name (handles renaming in the node's port map)
   */
  private updatePortName(index: number, newName: string, isInput: boolean): void {
    const ports = isInput ? this.customNodeInputs : this.customNodeOutputs;
    const port = ports[index];
    if (!port || !this.currentEditingNode) return;

    const oldName = port.name;
    port.name = newName;

    // Update the actual node's port map
    const portMap = isInput ? this.currentEditingNode.inputs : this.currentEditingNode.outputs;
    const portObj = portMap.get(oldName);
    if (portObj) {
      // Remove old port
      portMap.delete(oldName);
      // Add with new name
      portObj.name = newName;
      portMap.set(newName, portObj);
    }

    this.onRegenerateCode();
    this.onTriggerAutosave();
  }

  /**
   * Update a port's type
   */
  private updatePortType(index: number, newType: PortType, isInput: boolean): void {
    const ports = isInput ? this.customNodeInputs : this.customNodeOutputs;
    const port = ports[index];
    if (!port || !this.currentEditingNode) return;

    port.type = newType;

    // Update the actual node's port
    const portMap = isInput ? this.currentEditingNode.inputs : this.currentEditingNode.outputs;
    const portObj = portMap.get(port.name);
    if (portObj) {
      portObj.type = newType;
    }

    this.onRegenerateCode();
    this.onTriggerAutosave();
  }

  /**
   * Add a new port (input or output)
   */
  private addPort(isInput: boolean): void {
    // Generate unique name by counting existing ports
    const existingPorts = isInput ? this.customNodeInputs : this.customNodeOutputs;
    const baseName = isInput ? 'input' : 'output';
    let counter = 1;
    let uniqueName = baseName;

    // Find a unique name
    while (existingPorts.some((p) => p.name === uniqueName)) {
      uniqueName = `${baseName}${counter}`;
      counter++;
    }

    const newPort: PortDefinition = {
      name: uniqueName,
      type: 'number' as PortType,
    };

    if (isInput) {
      this.customNodeInputs.push(newPort);
      // Add to actual node using protected method
      if (this.currentEditingNode) {
        (this.currentEditingNode as any).addInput(newPort);
      }
    } else {
      this.customNodeOutputs.push(newPort);
      // Add to actual node using protected method
      if (this.currentEditingNode) {
        (this.currentEditingNode as any).addOutput(newPort);
      }
    }

    this.refreshPortsList();
    this.onRegenerateCode();
    this.onTriggerAutosave();
  }

  /**
   * Remove a port at the given index
   */
  private removePort(index: number, isInput: boolean): void {
    if (isInput) {
      const portName = this.customNodeInputs[index]?.name;
      this.customNodeInputs.splice(index, 1);
      // Remove from actual node
      if (this.currentEditingNode && portName) {
        this.currentEditingNode.inputs.delete(portName);
      }
    } else {
      const portName = this.customNodeOutputs[index]?.name;
      this.customNodeOutputs.splice(index, 1);
      // Remove from actual node
      if (this.currentEditingNode && portName) {
        this.currentEditingNode.outputs.delete(portName);
      }
    }

    this.refreshPortsList();
    this.onRegenerateCode();
    this.onTriggerAutosave();
  }

  /**
   * Refresh the ports lists in the UI
   */
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

  /**
   * Create the properties section
   */
  createCustomNodePropertiesSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'custom-node-section';

    const header = document.createElement('div');

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

  /**
   * Render the list of properties
   */
  private renderPropertiesList(container: HTMLElement): void {
    container.innerHTML = '';

    if (this.customNodeProperties.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-list muted';
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

  /**
   * Add a new property
   */
  private addProperty(): void {
    const newProp: PropertyConfig = {
      name: 'property',
      type: 'number',
      value: 0,
    };

    this.customNodeProperties.push(newProp);

    // Add to actual node using protected method
    if (this.currentEditingNode) {
      (this.currentEditingNode as any).addProperty(newProp);
    }

    this.refreshPropertiesList();
    this.onRegenerateCode();
    this.onTriggerAutosave();
  }

  /**
   * Remove a property at the given index
   */
  private removeProperty(index: number): void {
    const propName = this.customNodeProperties[index]?.name;
    this.customNodeProperties.splice(index, 1);

    // Remove from actual node
    if (this.currentEditingNode && propName) {
      this.currentEditingNode.properties.delete(propName);
    }

    this.refreshPropertiesList();
    this.onRegenerateCode();
    this.onTriggerAutosave();
  }

  /**
   * Refresh the properties list in the UI
   */
  private refreshPropertiesList(): void {
    const propsList = document.getElementById('properties-list');
    if (propsList) {
      this.renderPropertiesList(propsList);
    }
  }
}
