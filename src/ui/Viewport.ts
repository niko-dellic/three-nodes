export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export class Viewport {
  private transform: Transform = { x: 0, y: 0, scale: 1 };
  private minScale = 0.1;
  private maxScale = 3;

  getTransform(): Transform {
    return { ...this.transform };
  }

  setTransform(transform: Partial<Transform>): void {
    if (transform.x !== undefined) this.transform.x = transform.x;
    if (transform.y !== undefined) this.transform.y = transform.y;
    if (transform.scale !== undefined) {
      this.transform.scale = Math.max(this.minScale, Math.min(this.maxScale, transform.scale));
    }
  }

  pan(dx: number, dy: number): void {
    this.transform.x += dx;
    this.transform.y += dy;
  }

  zoom(delta: number, centerX: number, centerY: number): void {
    const oldScale = this.transform.scale;
    const newScale = Math.max(
      this.minScale,
      Math.min(this.maxScale, oldScale * (1 + delta * 0.001))
    );

    // Zoom towards cursor position
    this.transform.scale = newScale;
    this.transform.x = centerX - ((centerX - this.transform.x) * newScale) / oldScale;
    this.transform.y = centerY - ((centerY - this.transform.y) * newScale) / oldScale;
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
