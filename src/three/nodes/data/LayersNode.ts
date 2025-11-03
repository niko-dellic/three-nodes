import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class LayersNode extends BaseThreeNode<'mask', 'layers'> {
  constructor(id: string) {
    super(id, 'LayersNode', 'Layers');
    this.addInput({ name: 'mask', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'layers', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const mask = this.getInputValue<number>('mask') ?? 1;
    
    const layers = new THREE.Layers();
    layers.mask = mask;
    
    this.setOutputValue('layers', layers);
  }
}

