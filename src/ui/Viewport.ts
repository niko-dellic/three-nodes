export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export class Viewport {
  private transform: Transform = { x: 0, y: 0, scale: 1 };
  private targetTransform: Transform = { x: 0, y: 0, scale: 1 };
  private minScale = 0.1;
  private maxScale = 3;
  private dampingFactor = 0.1; // Smooth damping for zoom

  getTransform(): Transform {
    return { ...this.transform };
  }

  setTransform(transform: Partial<Transform>): void {
    if (transform.x !== undefined) {
      this.transform.x = transform.x;
      this.targetTransform.x = transform.x;
    }
    if (transform.y !== undefined) {
      this.transform.y = transform.y;
      this.targetTransform.y = transform.y;
    }
    if (transform.scale !== undefined) {
      this.transform.scale = Math.max(this.minScale, Math.min(this.maxScale, transform.scale));
      this.targetTransform.scale = this.transform.scale;
    }
  }

  pan(dx: number, dy: number): void {
    this.transform.x += dx;
    this.transform.y += dy;
    this.targetTransform.x = this.transform.x;
    this.targetTransform.y = this.transform.y;
  }

  zoom(delta: number, centerX: number, centerY: number): void {
    const oldScale = this.targetTransform.scale;
    // 5x more sensitive: 0.005 instead of 0.001
    const newScale = Math.max(
      this.minScale,
      Math.min(this.maxScale, oldScale * (1 + delta * 0.0075))
    );

    // Update target transform for smooth damping
    this.targetTransform.scale = newScale;
    this.targetTransform.x = centerX - ((centerX - this.targetTransform.x) * newScale) / oldScale;
    this.targetTransform.y = centerY - ((centerY - this.targetTransform.y) * newScale) / oldScale;
  }

  // Immediate zoom without damping (for mouse wheel)
  zoomImmediate(delta: number, centerX: number, centerY: number): void {
    const oldScale = this.transform.scale;
    // 5x more sensitive: 0.005 instead of 0.001
    const newScale = Math.max(
      this.minScale,
      Math.min(this.maxScale, oldScale * (1 + delta * 0.0075))
    );

    // Update both transform and target immediately (no damping)
    this.transform.scale = newScale;
    this.targetTransform.scale = newScale;

    this.transform.x = centerX - ((centerX - this.transform.x) * newScale) / oldScale;
    this.targetTransform.x = this.transform.x;

    this.transform.y = centerY - ((centerY - this.transform.y) * newScale) / oldScale;
    this.targetTransform.y = this.transform.y;
  }

  update(): void {
    // Smoothly interpolate towards target transform (damping)
    this.transform.scale +=
      (this.targetTransform.scale - this.transform.scale) * this.dampingFactor;
    this.transform.x += (this.targetTransform.x - this.transform.x) * this.dampingFactor;
    this.transform.y += (this.targetTransform.y - this.transform.y) * this.dampingFactor;
  }

  screenToWorld(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.transform.x) / this.transform.scale,
      y: (y - this.transform.y) / this.transform.scale,
    };
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.transform.scale + this.transform.x,
      y: y * this.transform.scale + this.transform.y,
    };
  }

  applyToContext(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(
      this.transform.scale,
      0,
      0,
      this.transform.scale,
      this.transform.x,
      this.transform.y
    );
  }

  applyToSVG(svg: SVGSVGElement): void {
    const g = svg.querySelector('g');
    if (g) {
      g.setAttribute(
        'transform',
        `translate(${this.transform.x}, ${this.transform.y}) scale(${this.transform.scale})`
      );
    }
  }
}
