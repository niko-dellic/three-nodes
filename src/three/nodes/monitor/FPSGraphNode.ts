import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

/**
 * FPS Graph node using Tweakpane Essentials plugin
 * Monitors and displays frame rate in a graph
 */
export class FPSGraphNode extends TweakpaneNode<never, 'fps'> {
  private fpsGraph: any = null;
  private lastFrameTime: number = performance.now();
  private frameCount: number = 0;
  private fpsSum: number = 0;
  private updateInterval: number = 100; // Update every 100ms

  constructor(id: string) {
    super(id, 'FPSGraphNode', 'FPS Graph');

    // Output port for current FPS value
    this.addOutput({ name: 'fps', type: PortType.Number });

    // Properties
    this.addProperty({
      name: 'minFps',
      type: 'number',
      value: 0,
      label: 'Min FPS',
      min: 0,
      max: 144,
    });
    this.addProperty({
      name: 'maxFps',
      type: 'number',
      value: 60,
      label: 'Max FPS',
      min: 0,
      max: 144,
    });
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    const minFps = this.getProperty('minFps') ?? 0;
    const maxFps = this.getProperty('maxFps') ?? 60;

    // Add FPS graph using Tweakpane Essentials
    this.fpsGraph = this.pane.addBlade({
      view: 'fpsgraph',
      label: 'FPS',
      min: minFps,
      max: maxFps,
    });
  }

  evaluate(_context: EvaluationContext): void {
    // Calculate FPS
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    if (deltaTime > 0) {
      const currentFps = 1000 / deltaTime;
      this.fpsSum += currentFps;
      this.frameCount++;

      // Update FPS graph
      if (this.fpsGraph && this.fpsGraph.begin && this.fpsGraph.end) {
        this.fpsGraph.begin();
        this.fpsGraph.end();
      }

      // Calculate average FPS
      const avgFps = this.fpsSum / this.frameCount;
      this.setOutputValue('fps', avgFps);

      // Reset counters periodically
      if (this.frameCount >= 10) {
        this.fpsSum = 0;
        this.frameCount = 0;
      }
    }

    this.lastFrameTime = currentTime;
  }

  getControlHeight(): number {
    return 80;
  }

  dispose(): void {
    this.fpsGraph = null;
    super.dispose();
  }
}
