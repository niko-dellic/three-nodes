import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

export class ImprovedNoiseNode extends BaseThreeNode<'x' | 'y' | 'z', 'noise'> {
  private perlin: ImprovedNoise;

  constructor(id: string) {
    super(id, 'ImprovedNoiseNode', 'Improved Noise');
    this.perlin = new ImprovedNoise();
    this.addInput({ name: 'x', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'y', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'z', type: PortType.Number, defaultValue: 0 });
    this.addOutput({ name: 'noise', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const x = this.getInputValue<number>('x') ?? 0;
    const y = this.getInputValue<number>('y') ?? 0;
    const z = this.getInputValue<number>('z') ?? 0;

    const noise = this.perlin.noise(x, y, z);
    this.setOutputValue('noise', noise);
  }
}

