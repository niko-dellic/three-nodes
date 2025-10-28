import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

/**
 * Frame Node
 * Provides animation loop functionality
 * Calls update() on all input objects each frame
 */
export class FrameNode extends BaseThreeNode<
  'enabled' | 'objects',
  'deltaTime' | 'elapsedTime' | 'frame'
> {
  private isEnabled: boolean = false;
  private animationId: number | null = null;
  private startTime: number = 0;
  private lastTime: number = 0;
  private frameCount: number = 0;

  constructor(id: string) {
    super(id, 'FrameNode', 'Frame Loop');

    this.addInput({ name: 'enabled', type: PortType.Boolean, defaultValue: false });
    this.addInput({ name: 'objects', type: PortType.Any }); // Array of updatable objects

    this.addOutput({ name: 'deltaTime', type: PortType.Number });
    this.addOutput({ name: 'elapsedTime', type: PortType.Number });
    this.addOutput({ name: 'frame', type: PortType.Number });
  }

  evaluate(context: EvaluationContext): void {
    const enabled = this.getInputValue<boolean>('enabled') ?? false;

    if (enabled && !this.isEnabled) {
      // Start animation loop
      this.startAnimationLoop(context);
      this.isEnabled = true;
    } else if (!enabled && this.isEnabled) {
      // Stop animation loop
      this.stopAnimationLoop();
      this.isEnabled = false;
    }

    // Output current timing values
    this.setOutputValue('deltaTime', 0);
    this.setOutputValue('elapsedTime', 0);
    this.setOutputValue('frame', this.frameCount);
  }

  private startAnimationLoop(context: EvaluationContext): void {
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.frameCount = 0;

    const animate = () => {
      if (!this.isEnabled) return;

      const currentTime = performance.now();
      const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
      const elapsedTime = (currentTime - this.startTime) / 1000;
      this.lastTime = currentTime;
      this.frameCount++;

      // Update output values
      this.setOutputValue('deltaTime', deltaTime);
      this.setOutputValue('elapsedTime', elapsedTime);
      this.setOutputValue('frame', this.frameCount);

      // Get updatable objects
      const objects = this.getInputValues<any>('objects');

      // Call update() on each object that has it
      for (const obj of objects) {
        if (obj && typeof obj.update === 'function') {
          try {
            obj.update(deltaTime, elapsedTime);
          } catch (error) {
            console.error('Error in object update function:', error);
          }
        }
      }

      // Re-evaluate the graph to propagate changes
      if (context.graph) {
        const evaluator = (context.graph as any).evaluator;
        if (evaluator) {
          // Mark this node and downstream as dirty
          this.markDirty();
          evaluator.markDownstreamDirty(this.id);

          // Evaluate the graph
          evaluator.evaluate(context);
        }
      }

      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  private stopAnimationLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  dispose(): void {
    this.stopAnimationLoop();
    this.isEnabled = false;
    super.dispose();
  }
}
