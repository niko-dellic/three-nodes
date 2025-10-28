import { NodeRegistry } from '@/three/NodeRegistry';
import { NodeMetadata } from '@/types';

export class ContextMenu {
  private element: HTMLElement;
  private registry: NodeRegistry;
  private isVisible = false;
  private position: { x: number; y: number } = { x: 0, y: 0 };
  private onNodeSelect: ((nodeType: string, x: number, y: number) => void) | null = null;

  constructor(container: HTMLElement, registry: NodeRegistry) {
    this.registry = registry;
    this.element = this.createContextMenu();
    container.appendChild(this.element);
    this.setupEventListeners();
  }

  private createContextMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.classList.add('context-menu');
    menu.style.display = 'none';
    return menu;
  }

  private setupEventListeners(): void {
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target as Node)) {
        this.hide();
      }
    });

    // Close menu on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  show(x: number, y: number): void {
    this.position = { x, y };
    this.isVisible = true;

    // Build menu content
    this.buildMenu();

    // Position the menu
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
    this.element.style.display = 'block';

    // Adjust position if menu goes off-screen
    requestAnimationFrame(() => {
      const rect = this.element.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        this.element.style.left = `${viewportWidth - rect.width - 10}px`;
      }
      if (rect.bottom > viewportHeight) {
        this.element.style.top = `${viewportHeight - rect.height - 10}px`;
      }
    });
  }

  hide(): void {
    this.isVisible = false;
    this.element.style.display = 'none';
  }

  private buildMenu(): void {
    this.element.innerHTML = '';

    // Get all node types grouped by category
    const allTypes = this.registry.getAllTypes();
    const categories = new Map<string, NodeMetadata[]>();

    for (const metadata of allTypes) {
      if (!categories.has(metadata.category)) {
        categories.set(metadata.category, []);
      }
      categories.get(metadata.category)!.push(metadata);
    }

    // Sort categories
    const sortedCategories = Array.from(categories.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    // Add search input
    const searchContainer = document.createElement('div');
    searchContainer.classList.add('context-menu-search');
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search nodes...';
    searchInput.classList.add('context-menu-search-input');
    searchContainer.appendChild(searchInput);
    this.element.appendChild(searchContainer);

    // Create scrollable content area
    const contentArea = document.createElement('div');
    contentArea.classList.add('context-menu-content');

    // Build categories
    for (const [category, nodes] of sortedCategories) {
      const categoryElement = this.createCategory(category, nodes);
      contentArea.appendChild(categoryElement);
    }

    // Add "Custom Node" option at the bottom
    const customSection = document.createElement('div');
    customSection.classList.add('context-menu-category');

    const customHeader = document.createElement('div');
    customHeader.classList.add('context-menu-category-header');
    customHeader.textContent = 'Advanced';
    customSection.appendChild(customHeader);

    const customItem = document.createElement('div');
    customItem.classList.add('context-menu-item', 'custom-node');
    customItem.innerHTML =
      '<span class="item-icon">✨</span><span class="item-label">Custom Node</span>';
    customItem.addEventListener('click', () => {
      this.handleCustomNode();
    });
    customSection.appendChild(customItem);

    contentArea.appendChild(customSection);

    this.element.appendChild(contentArea);

    // Setup search functionality
    searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase();
      this.filterNodes(contentArea, query);
    });

    // Focus search input
    requestAnimationFrame(() => searchInput.focus());
  }

  private createCategory(category: string, nodes: NodeMetadata[]): HTMLElement {
    const categoryElement = document.createElement('div');
    categoryElement.classList.add('context-menu-category');
    categoryElement.setAttribute('data-category', category);

    // Category header (collapsible)
    const header = document.createElement('div');
    header.classList.add('context-menu-category-header');
    header.textContent = category;
    categoryElement.appendChild(header);

    // Node items
    const itemsContainer = document.createElement('div');
    itemsContainer.classList.add('context-menu-items');

    for (const node of nodes) {
      const item = this.createMenuItem(node);
      itemsContainer.appendChild(item);
    }

    categoryElement.appendChild(itemsContainer);

    // Toggle collapse on header click
    header.addEventListener('click', () => {
      categoryElement.classList.toggle('collapsed');
    });

    return categoryElement;
  }

  private createMenuItem(metadata: NodeMetadata): HTMLElement {
    const item = document.createElement('div');
    item.classList.add('context-menu-item');
    item.setAttribute('data-node-type', metadata.type);
    item.setAttribute('data-label', metadata.label.toLowerCase());

    // Icon (using emoji or first letter)
    const icon = document.createElement('span');
    icon.classList.add('item-icon');
    icon.textContent = metadata.icon || metadata.label.charAt(0);
    item.appendChild(icon);

    // Label
    const label = document.createElement('span');
    label.classList.add('item-label');
    label.textContent = metadata.label;
    item.appendChild(label);

    // Description (tooltip)
    if (metadata.description) {
      item.title = metadata.description;
    }

    // Click handler
    item.addEventListener('click', () => {
      this.handleNodeSelection(metadata.type);
    });

    return item;
  }

  private filterNodes(contentArea: HTMLElement, query: string): void {
    const categories = contentArea.querySelectorAll('.context-menu-category');

    categories.forEach((category) => {
      const items = category.querySelectorAll('.context-menu-item');
      let visibleCount = 0;

      items.forEach((item) => {
        const label = item.getAttribute('data-label') || '';
        const nodeType = item.getAttribute('data-node-type') || '';

        if (label.includes(query) || nodeType.toLowerCase().includes(query)) {
          (item as HTMLElement).style.display = 'flex';
          visibleCount++;
        } else {
          (item as HTMLElement).style.display = 'none';
        }
      });

      // Hide category if no visible items
      (category as HTMLElement).style.display = visibleCount > 0 ? 'block' : 'none';
    });
  }

  private handleNodeSelection(nodeType: string): void {
    if (this.onNodeSelect) {
      this.onNodeSelect(nodeType, this.position.x, this.position.y);
    }
    this.hide();
  }

  private handleCustomNode(): void {
    // For now, just log - can be expanded later
    console.log('Custom node creation not yet implemented');
    alert('Custom node creation will be available in a future update!');
    this.hide();
  }

  onNodeSelectCallback(callback: (nodeType: string, x: number, y: number) => void): void {
    this.onNodeSelect = callback;
  }

  isOpen(): boolean {
    return this.isVisible;
  }
}
