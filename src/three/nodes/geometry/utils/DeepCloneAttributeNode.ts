import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { deepCloneAttribute } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class DeepCloneAttributeNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'DeepCloneAttributeNode', 'Deep Clone Attribute');
    this.addInput({ name: 'attribute', type: PortType.Any });
    this.addOutput({ name: 'attribute', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const attribute = this.getInputValue<THREE.BufferAttribute>('attribute');

    if (!attribute) {
      this.setOutputValue('attribute', undefined);
      return;
    }

    try {
      const cloned = deepCloneAttribute(attribute);
      this.setOutputValue('attribute', cloned as any);
    } catch (error) {
      console.error('Error cloning attribute:', error);
      this.setOutputValue('attribute', undefined);
    }
  }
}
