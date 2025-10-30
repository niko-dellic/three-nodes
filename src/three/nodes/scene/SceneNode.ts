import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';

export class SceneNode extends BaseThreeNode<never, 'scene'> {
  constructor(id: string) {
    super(id, 'SceneNode', 'Scene');
    this.addOutput({ name: 'scene', type: PortType.Scene });
  }

  evaluate(_context: EvaluationContext): void {
    // Output the graph's default scene
    const scene = _context.graph?.defaultScene;
    if (scene) {
      this.setOutputValue('scene', scene);
    } else {
      console.warn('SceneNode: No default scene available in graph context');
    }
  }

  dispose(): void {
    // No need to clear or dispose the scene - it's owned by the graph
    super.dispose();
  }
}
