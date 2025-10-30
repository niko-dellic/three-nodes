import { NodeRegistry } from '@/three/NodeRegistry';
import { NodeMetadata } from '@/types';
import { Pane } from 'tweakpane';

export class ContextMenu {
  private element: HTMLElement;
  private pane: Pane | null = null;
  private registry: NodeRegistry;
  private isVisible = false;
  private position: { x: number; y: number } = { x: 0, y: 0 };
  private onNodeSelect: ((nodeType: string, x: number, y: number) => void) | null = null;
  private searchInput: HTMLInputElement | null = null;
  private navigableButtons: HTMLButtonElement[] = [];
  private selectedButtonIndex: number = -1;

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

    // Keyboard navigation and escape
    document.addEventListener('keydown', (e) => {
      if (!this.isVisible) return;

      // Special handling for context menu search input
      if (e.target instanceof HTMLInputElement && e.target === this.searchInput) {
        // Allow arrow keys and Enter for navigation even while typing
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.navigateButtons(1);
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.navigateButtons(-1);
          return;
        } else if (e.key === 'Enter') {
          // Enter key: select highlighted button
          if (this.selectedButtonIndex >= 0) {
            e.preventDefault();
            this.navigableButtons[this.selectedButtonIndex]?.click();
          }
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.hide();
          return;
        }
        // Allow other keys (for typing in search)
        return;
      }

      if (e.key === 'Escape') {
        this.hide();
        return;
      }

      // Handle keyboard navigation (works both in search and outside)
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateButtons(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateButtons(-1);
      } else if (e.key === 'Enter') {
        // Enter key: select highlighted button
        if (this.selectedButtonIndex >= 0) {
          e.preventDefault();
          this.navigableButtons[this.selectedButtonIndex]?.click();
        }
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
    this.selectedButtonIndex = -1;

    // Dispose of Tweakpane instance
    if (this.pane) {
      this.pane.dispose();
      this.pane = null;
    }
  }

  private buildMenu(): void {
    this.element.innerHTML = '';
    this.navigableButtons = [];
    this.selectedButtonIndex = -1;

    // Dispose old pane if exists
    if (this.pane) this.pane.dispose();

    // Get all node types grouped by category
    const allTypes = this.registry.getAllTypes();
    console.log(`Context menu: Found ${allTypes.length} node types`);
    const categories = new Map<string, NodeMetadata[]>();

    for (const metadata of allTypes) {
      if (!categories.has(metadata.category)) {
        categories.set(metadata.category, []);
      }
      categories.get(metadata.category)!.push(metadata);
    }

    // Log User category specifically
    if (categories.has('User')) {
      console.log(
        `User category has ${categories.get('User')!.length} nodes:`,
        categories.get('User')!.map((m) => m.label)
      );
    }

    // Sort categories with "User" at the top
    const sortedCategories = Array.from(categories.entries()).sort((a, b) => {
      if (a[0] === 'User') return -1;
      if (b[0] === 'User') return 1;
      return a[0].localeCompare(b[0]);
    });

    // Add search input (outside of Tweakpane)
    const searchContainer = document.createElement('div');
    searchContainer.classList.add('context-menu-search');
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search nodes...';
    this.searchInput.classList.add('context-menu-search-input');
    searchContainer.appendChild(this.searchInput);
    this.element.appendChild(searchContainer);

    // Create Tweakpane container
    const paneContainer = document.createElement('div');
    paneContainer.classList.add('context-menu-pane');
    this.element.appendChild(paneContainer);

    // Create Tweakpane instance
    this.pane = new Pane({
      container: paneContainer,
      title: 'Add Node',
    });

    // Add "Create Custom Node" button at root level (not in a folder)
    const customNodeButton = this.pane.addButton({
      title: '+ New Node',
    });

    customNodeButton.on('click', () => {
      this.handleCustomNode();
    });

    const customNodeButtonElement = this.findButtonElement(customNodeButton);
    if (customNodeButtonElement) {
      this.navigableButtons.push(customNodeButtonElement);
      customNodeButtonElement.setAttribute('data-node-type', 'CustomNode');
      customNodeButtonElement.setAttribute('data-label', 'create custom node');
    }

    // Build categories as folders
    const folders: any[] = [];
    const buttonMetadataMap = new Map<HTMLButtonElement, NodeMetadata>();

    for (const [category, nodes] of sortedCategories) {
      const folder = this.pane.addFolder({
        title: category,
        expanded: false, // Start collapsed
      });
      folders.push({ folder, category, nodes });

      // Add buttons for each node
      for (const metadata of nodes) {
        const button = folder.addButton({
          title: `${metadata.icon ? metadata.icon + ' ' : ''}${metadata.label}`,
        });

        button.on('click', () => {
          this.handleNodeSelection(metadata.type);
        });

        // Get the actual button element for navigation
        const buttonElement = this.findButtonElement(button);
        if (buttonElement) {
          this.navigableButtons.push(buttonElement);
          buttonMetadataMap.set(buttonElement, metadata);

          // Add data attributes for filtering
          buttonElement.setAttribute('data-node-type', metadata.type);
          buttonElement.setAttribute('data-label', metadata.label.toLowerCase());
        }
      }
    }

    // Setup search functionality
    this.searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase();
      this.filterNodes(query, folders);
    });

    // Focus search input
    requestAnimationFrame(() => this.searchInput?.focus());
  }

  private findButtonElement(_tweakpaneButton: any): HTMLButtonElement | null {
    // Tweakpane buttons are in the DOM, we need to find them
    // The button is created inside the pane's container
    const paneElement = this.pane?.element;
    if (!paneElement) return null;

    // Get all buttons and find the most recently added one
    const buttons = paneElement.querySelectorAll('button.tp-btnv_b');
    return (buttons[buttons.length - 1] as HTMLButtonElement) || null;
  }

  private filterNodes(query: string, folders: any[]): void {
    this.selectedButtonIndex = -1;

    if (!query) {
      // Show all folders and buttons
      folders.forEach(({ folder }) => {
        folder.hidden = false;
        folder.expanded = false; // Collapse when clearing search
      });
      this.navigableButtons.forEach((btn) => {
        btn.style.display = '';
        btn.parentElement!.style.display = '';
      });
      return;
    }

    // Filter buttons and folders
    folders.forEach(({ folder, nodes }) => {
      let hasVisibleNodes = false;

      // Check each button in this folder
      this.navigableButtons.forEach((btn) => {
        const label = btn.getAttribute('data-label') || '';
        const nodeType = btn.getAttribute('data-node-type') || '';

        // Check if this button belongs to this folder's nodes
        const belongsToFolder = nodes.some((n: NodeMetadata) => n.type === nodeType);

        if (belongsToFolder) {
          if (label.includes(query) || nodeType.toLowerCase().includes(query)) {
            btn.style.display = '';
            btn.parentElement!.style.display = '';
            hasVisibleNodes = true;
          } else {
            btn.style.display = 'none';
            btn.parentElement!.style.display = 'none';
          }
        }
      });

      // Show/hide folder based on visible nodes
      folder.hidden = !hasVisibleNodes;
      if (hasVisibleNodes) {
        folder.expanded = true; // Expand folders with matches
      }
    });
  }

  private navigateButtons(direction: number): void {
    // Get only truly visible buttons (not hidden by search or collapsed folders)
    const visibleButtons = this.navigableButtons.filter((btn) => {
      // Check if button itself is visible
      if (!btn.offsetParent) return false; // Element is hidden (display:none or parent hidden)

      // Check all ancestors up to the pane container for visibility
      let element: HTMLElement | null = btn;
      while (element && element !== this.pane?.element) {
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return false;
        }
        element = element.parentElement;
      }

      return true;
    });

    if (visibleButtons.length === 0) return;

    // Remove highlight from previous button
    if (this.selectedButtonIndex >= 0 && this.selectedButtonIndex < this.navigableButtons.length) {
      this.navigableButtons[this.selectedButtonIndex]?.classList.remove('tp-btn-selected');
    }

    // Calculate new index
    if (this.selectedButtonIndex === -1) {
      // No selection yet - start at first or last visible button
      const firstVisibleButton = visibleButtons[direction > 0 ? 0 : visibleButtons.length - 1];
      this.selectedButtonIndex = this.navigableButtons.indexOf(firstVisibleButton);
    } else {
      // Find current button in visible list
      const currentButton = this.navigableButtons[this.selectedButtonIndex];
      const currentVisibleIndex = visibleButtons.indexOf(currentButton);

      if (currentVisibleIndex === -1) {
        // Current button is no longer visible (e.g., folder collapsed or filtered out)
        // Jump to first/last visible button
        const firstVisibleButton = visibleButtons[direction > 0 ? 0 : visibleButtons.length - 1];
        this.selectedButtonIndex = this.navigableButtons.indexOf(firstVisibleButton);
      } else {
        // Navigate within visible buttons
        let newVisibleIndex = currentVisibleIndex + direction;

        // Wrap around
        if (newVisibleIndex < 0) newVisibleIndex = visibleButtons.length - 1;
        if (newVisibleIndex >= visibleButtons.length) newVisibleIndex = 0;

        // Get actual button
        const newButton = visibleButtons[newVisibleIndex];
        this.selectedButtonIndex = this.navigableButtons.indexOf(newButton);
      }
    }

    // Highlight new button
    const selectedButton = this.navigableButtons[this.selectedButtonIndex];
    if (selectedButton) {
      selectedButton.classList.add('tp-btn-selected');
      selectedButton.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  private handleNodeSelection(nodeType: string): void {
    if (this.onNodeSelect) {
      this.onNodeSelect(nodeType, this.position.x, this.position.y);
    }
    this.hide();
  }

  private handleCustomNode(): void {
    this.hide();

    // Create a custom node at the menu position
    if (this.onNodeSelect) {
      this.onNodeSelect('CustomNode', this.position.x, this.position.y);
    }
  }

  onNodeSelectCallback(callback: (nodeType: string, x: number, y: number) => void): void {
    this.onNodeSelect = callback;
  }

  isOpen(): boolean {
    return this.isVisible;
  }
}
