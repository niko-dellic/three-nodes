import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class Float32BufferAttributeNode extends BaseThreeNode<
  'array' | 'itemSize' | 'normalized',
  'attribute'
> {
  constructor(id: string) {
    super(id, 'Float32BufferAttributeNode', 'Float32 Buffer Attribute');
    this.addInput({ name: 'array', type: PortType.Any, defaultValue: [] });
    this.addInput({ name: 'itemSize', type: PortType.Number, defaultValue: 3 });
    this.addInput({ name: 'normalized', type: PortType.Boolean, defaultValue: false });
    this.addOutput({ name: 'attribute', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const array = this.getInputValue<number[] | Float32Array>('array') ?? [];
    const itemSize = this.getInputValue<number>('itemSize') ?? 3;
    const normalized = this.getInputValue<boolean>('normalized') ?? false;

    // Convert array to proper format if needed
    const typedArray = Array.isArray(array) ? new Float32Array(array) : array;
    
    const attribute = new THREE.Float32BufferAttribute(typedArray, itemSize, normalized);
    this.setOutputValue('attribute', attribute);
  }
}

