import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { computeMorphedAttributes } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class ComputeMorphedAttributesNode extends BaseThreeNode<
  'object',
  'attributes'
> {
  constructor(id: string) {
    super(id, 'ComputeMorphedAttributesNode', 'Compute Morphed Attributes');
    this.addInput({ name: 'object', type: PortType.Object3D });
    this.addOutput({ name: 'attributes', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const object = this.getInputValue<THREE.Object3D>('object');

    if (!object || !(object instanceof THREE.Mesh || object instanceof THREE.SkinnedMesh)) {
      this.setOutputValue('attributes', undefined);
      return;
    }

    try {
      const attributes = computeMorphedAttributes(object as any);
      this.setOutputValue('attributes', attributes as any);
    } catch (error) {
      console.error('Error computing morphed attributes:', error);
      this.setOutputValue('attributes', undefined);
    }
  }
}
