/**
 * ObjectInspector - A Chrome DevTools-style object viewer
 *
 * Features matching Chrome DevTools console:
 * - Lazy rendering: Child nodes only created when parent is expanded
 * - Circular reference detection: Uses WeakSet to track visited objects
 * - No artificial depth limit: Explore as deep as needed (like Chrome)
 * - Expandable/collapsible: Click to toggle nested structures
 * - Type-specific formatting: Colors and previews for different types
 * - Three.js support: Special handling for Vector3, Color, Mesh, etc.
 *
 * Performance optimizations:
 * - Only renders visible nodes (lazy rendering on expand)
 * - Circular refs shown as [Circular] instead of recursing
 * - Memory scales with visible nodes only, not total object depth
 * - String truncation for long values
 */

interface InspectorOptions {
  expandLevel?: number;
  maxStringLength?: number;
  maxArrayPreview?: number;
}

export class ObjectInspector {
  private options: Required<InspectorOptions>;
  private circularRefs: WeakSet<object>;

  constructor(options: InspectorOptions = {}) {
    this.options = {
      expandLevel: 1,
      maxStringLength: 100,
      maxArrayPreview: 3,
      ...options,
    };
    this.circularRefs = new WeakSet();
  }

  /**
   * Creates an interactive DOM element for inspecting the given value
   */
  inspect(value: any, label?: string): HTMLElement {
    this.circularRefs = new WeakSet(); // Reset circular reference tracking
    const container = document.createElement('div');
    container.className = 'object-inspector';

    if (label) {
      const labelEl = document.createElement('div');
      labelEl.className = 'inspector-label';
      labelEl.textContent = label;
      container.appendChild(labelEl);
    }

    const content = this.createNode(value, 0);
    container.appendChild(content);

    return container;
  }

  private createNode(value: any, depth: number): HTMLElement {
    const type = this.getType(value);

    // Handle primitives and simple values
    if (type === 'null' || type === 'undefined' || type === 'boolean' || type === 'number') {
      return this.createPrimitive(value, type);
    }

    if (type === 'string') {
      return this.createString(value);
    }

    if (type === 'function') {
      return this.createFunction(value);
    }

    // Check for circular references
    if (typeof value === 'object' && value !== null) {
      if (this.circularRefs.has(value)) {
        return this.createCircularReference();
      }
      this.circularRefs.add(value);
    }

    // Handle Three.js specific types
    if (this.isThreeJsObject(value)) {
      return this.createThreeJsObject(value, depth);
    }

    if (type === 'array') {
      return this.createArray(value, depth);
    }

    if (type === 'object') {
      return this.createObject(value, depth);
    }

    // Fallback
    return this.createPrimitive(String(value), 'unknown');
  }

  private createPrimitive(value: any, type: string): HTMLElement {
    const el = document.createElement('span');
    el.className = `inspector-value inspector-${type}`;
    el.textContent = String(value);
    return el;
  }

  private createString(value: string): HTMLElement {
    const el = document.createElement('span');
    el.className = 'inspector-value inspector-string';

    if (value.length > this.options.maxStringLength) {
      const truncated = value.substring(0, this.options.maxStringLength);
      el.textContent = `"${truncated}..."`;
      el.title = value; // Show full string on hover
    } else {
      el.textContent = `"${value}"`;
    }

    return el;
  }

  private createFunction(fn: Function): HTMLElement {
    const el = document.createElement('span');
    el.className = 'inspector-value inspector-function';
    const fnStr = fn.toString();
    const match = fnStr.match(/^(?:async\s+)?function\s*([^\s(]*)/);
    const name = match?.[1] || 'anonymous';
    el.textContent = `ƒ ${name}()`;
    el.title = fnStr.substring(0, 200); // Show function source on hover
    return el;
  }

  private createCircularReference(): HTMLElement {
    const el = document.createElement('span');
    el.className = 'inspector-value inspector-circular';
    el.textContent = '[Circular]';
    return el;
  }

  private createArray(arr: any[], depth: number): HTMLElement {
    const container = document.createElement('div');
    container.className = 'inspector-expandable';

    const header = document.createElement('div');
    header.className = 'inspector-header';

    const arrow = document.createElement('span');
    arrow.className = 'inspector-arrow';
    arrow.textContent = depth < this.options.expandLevel ? '▼' : '▶';

    const preview = document.createElement('span');
    preview.className = 'inspector-preview';
    preview.textContent = this.getArrayPreview(arr);

    header.appendChild(arrow);
    header.appendChild(preview);
    container.appendChild(header);

    const content = document.createElement('div');
    content.className = 'inspector-content';
    content.style.display = depth < this.options.expandLevel ? 'block' : 'none';

    // Lazy rendering: only create children when needed
    let isRendered = false;
    const renderChildren = () => {
      if (isRendered) return;
      isRendered = true;

      // Add array elements
      arr.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'inspector-row';

        const key = document.createElement('span');
        key.className = 'inspector-key';
        key.textContent = `${index}: `;
        row.appendChild(key);

        const valueNode = this.createNode(item, depth + 1);
        row.appendChild(valueNode);

        content.appendChild(row);
      });
    };

    // Render immediately if auto-expanded, otherwise render on first click
    if (depth < this.options.expandLevel) {
      renderChildren();
    }

    container.appendChild(content);

    // Toggle functionality with lazy rendering
    header.addEventListener('click', () => {
      const isExpanded = content.style.display === 'block';

      if (!isExpanded && !isRendered) {
        // First time expanding - render children now
        renderChildren();
      }

      content.style.display = isExpanded ? 'none' : 'block';
      arrow.textContent = isExpanded ? '▶' : '▼';
    });

    return container;
  }

  private createObject(obj: object, depth: number): HTMLElement {
    const container = document.createElement('div');
    container.className = 'inspector-expandable';

    const header = document.createElement('div');
    header.className = 'inspector-header';

    const arrow = document.createElement('span');
    arrow.className = 'inspector-arrow';
    arrow.textContent = depth < this.options.expandLevel ? '▼' : '▶';

    const preview = document.createElement('span');
    preview.className = 'inspector-preview';
    preview.textContent = this.getObjectPreview(obj);

    header.appendChild(arrow);
    header.appendChild(preview);
    container.appendChild(header);

    const content = document.createElement('div');
    content.className = 'inspector-content';
    content.style.display = depth < this.options.expandLevel ? 'block' : 'none';

    // Lazy rendering: only create children when needed
    let isRendered = false;
    const renderChildren = () => {
      if (isRendered) return;
      isRendered = true;

      // Add object properties
      const entries = Object.entries(obj);
      entries.forEach(([key, value]) => {
        const row = document.createElement('div');
        row.className = 'inspector-row';

        const keyEl = document.createElement('span');
        keyEl.className = 'inspector-key';
        keyEl.textContent = `${key}: `;
        row.appendChild(keyEl);

        const valueNode = this.createNode(value, depth + 1);
        row.appendChild(valueNode);

        content.appendChild(row);
      });
    };

    // Render immediately if auto-expanded, otherwise render on first click
    if (depth < this.options.expandLevel) {
      renderChildren();
    }

    container.appendChild(content);

    // Toggle functionality with lazy rendering
    header.addEventListener('click', () => {
      const isExpanded = content.style.display === 'block';

      if (!isExpanded && !isRendered) {
        // First time expanding - render children now
        renderChildren();
      }

      content.style.display = isExpanded ? 'none' : 'block';
      arrow.textContent = isExpanded ? '▶' : '▼';
    });

    return container;
  }

  private createThreeJsObject(obj: any, depth: number): HTMLElement {
    const container = document.createElement('div');
    container.className = 'inspector-expandable';

    const header = document.createElement('div');
    header.className = 'inspector-header';

    const arrow = document.createElement('span');
    arrow.className = 'inspector-arrow';
    arrow.textContent = depth < this.options.expandLevel ? '▼' : '▶';

    const preview = document.createElement('span');
    preview.className = 'inspector-preview inspector-threejs';
    preview.textContent = this.getThreeJsPreview(obj);

    header.appendChild(arrow);
    header.appendChild(preview);
    container.appendChild(header);

    const content = document.createElement('div');
    content.className = 'inspector-content';
    content.style.display = depth < this.options.expandLevel ? 'block' : 'none';

    // Lazy rendering: only create children when needed
    let isRendered = false;
    const renderChildren = () => {
      if (isRendered) return;
      isRendered = true;

      // Show relevant properties for Three.js objects
      const props = this.getRelevantThreeJsProps(obj);
      props.forEach((key) => {
        const value = obj[key];
        const row = document.createElement('div');
        row.className = 'inspector-row';

        const keyEl = document.createElement('span');
        keyEl.className = 'inspector-key';
        keyEl.textContent = `${key}: `;
        row.appendChild(keyEl);

        const valueNode = this.createNode(value, depth + 1);
        row.appendChild(valueNode);

        content.appendChild(row);
      });
    };

    // Render immediately if auto-expanded, otherwise render on first click
    if (depth < this.options.expandLevel) {
      renderChildren();
    }

    container.appendChild(content);

    // Toggle functionality with lazy rendering
    header.addEventListener('click', () => {
      const isExpanded = content.style.display === 'block';

      if (!isExpanded && !isRendered) {
        // First time expanding - render children now
        renderChildren();
      }

      content.style.display = isExpanded ? 'none' : 'block';
      arrow.textContent = isExpanded ? '▶' : '▼';
    });

    return container;
  }

  private getType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'function') return 'function';
    return typeof value;
  }

  private isThreeJsObject(obj: any): boolean {
    return (
      obj &&
      (obj.isVector2 ||
        obj.isVector3 ||
        obj.isVector4 ||
        obj.isColor ||
        obj.isMatrix3 ||
        obj.isMatrix4 ||
        obj.isEuler ||
        obj.isQuaternion ||
        obj.isObject3D ||
        obj.isMesh ||
        obj.isGeometry ||
        obj.isMaterial ||
        obj.isTexture ||
        obj.isCamera ||
        obj.isLight ||
        obj.isScene)
    );
  }

  private getThreeJsPreview(obj: any): string {
    if (obj.isVector2) return `Vector2(${obj.x.toFixed(2)}, ${obj.y.toFixed(2)})`;
    if (obj.isVector3)
      return `Vector3(${obj.x.toFixed(2)}, ${obj.y.toFixed(2)}, ${obj.z.toFixed(2)})`;
    if (obj.isColor) return `Color(#${obj.getHexString()})`;
    if (obj.isEuler) return `Euler(${obj.x.toFixed(2)}, ${obj.y.toFixed(2)}, ${obj.z.toFixed(2)})`;
    if (obj.isObject3D)
      return `${obj.type || 'Object3D'} {${obj.name ? `name: "${obj.name}"` : 'id: ' + obj.id}}`;
    if (obj.isMaterial)
      return `${obj.type || 'Material'} {${obj.name ? `name: "${obj.name}"` : 'id: ' + obj.id}}`;
    if (obj.isGeometry) return `${obj.type || 'Geometry'}`;
    if (obj.isTexture) return `Texture {${obj.name || 'id: ' + obj.id}}`;

    return 'Object {...}';
  }

  private getRelevantThreeJsProps(obj: any): string[] {
    // For simple value types, show only their core properties
    if (obj.isVector2 || obj.isVector3 || obj.isVector4) {
      return ['x', 'y', 'z', 'w'].filter((k) => k in obj);
    }
    if (obj.isColor) {
      return ['r', 'g', 'b'];
    }
    if (obj.isEuler) {
      return ['x', 'y', 'z', 'order'];
    }
    if (obj.isQuaternion) {
      return ['x', 'y', 'z', 'w'];
    }

    // For complex objects (Object3D, Material, etc.), show ALL enumerable properties
    // This allows full exploration like Chrome console
    if (obj.isObject3D || obj.isMaterial || obj.isGeometry || obj.isTexture) {
      return Object.keys(obj);
    }

    // Fallback: show all enumerable properties
    return Object.keys(obj);
  }

  private getArrayPreview(arr: any[]): string {
    const constructor = arr.constructor.name;
    if (arr.length === 0) return `${constructor}(0) []`;

    const preview = arr
      .slice(0, this.options.maxArrayPreview)
      .map((v) => this.getValuePreview(v))
      .join(', ');

    const more =
      arr.length > this.options.maxArrayPreview
        ? `, ... ${arr.length - this.options.maxArrayPreview} more`
        : '';

    return `${constructor}(${arr.length}) [${preview}${more}]`;
  }

  private getObjectPreview(obj: object): string {
    const constructor = obj.constructor?.name || 'Object';
    const keys = Object.keys(obj);

    if (keys.length === 0) return `${constructor} {}`;

    const preview = keys
      .slice(0, 3)
      .map((k) => `${k}: ${this.getValuePreview((obj as any)[k])}`)
      .join(', ');

    const more = keys.length > 3 ? ', ...' : '';

    return `${constructor} {${preview}${more}}`;
  }

  private getValuePreview(value: any): string {
    const type = this.getType(value);

    switch (type) {
      case 'string':
        return value.length > 20 ? `"${value.substring(0, 17)}..."` : `"${value}"`;
      case 'number':
      case 'boolean':
        return String(value);
      case 'null':
        return 'null';
      case 'undefined':
        return 'undefined';
      case 'array':
        return `Array(${value.length})`;
      case 'object':
        return value.constructor?.name || 'Object';
      case 'function':
        return 'ƒ';
      default:
        return '...';
    }
  }
}
