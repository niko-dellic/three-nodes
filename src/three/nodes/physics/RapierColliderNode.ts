import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import type RAPIER from '@dimforge/rapier3d';

export class RapierColliderNode extends BaseThreeNode<
  'world' | 'rigidBody' | 'shape' | 'size',
  'collider'
> {
  constructor(id: string) {
    super(id, 'RapierColliderNode', 'Rapier Collider');
    this.addInput({ name: 'world', type: PortType.Any });
    this.addInput({ name: 'rigidBody', type: PortType.Any });
    this.addInput({ name: 'shape', type: PortType.String, defaultValue: 'box' });
    this.addInput({ name: 'size', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'collider', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const world = this.getInputValue<RAPIER.World>('world');
    const rigidBody = this.getInputValue<RAPIER.RigidBody>('rigidBody');
    const shape = this.getInputValue<string>('shape') ?? 'box';
    const size = this.getInputValue<number>('size') ?? 1;

    if (!world || !rigidBody) {
      console.warn('RapierColliderNode: Missing world or rigidBody');
      return;
    }

    // Access ColliderDesc from the RAPIER module
    const RAPIER = (world as any).constructor;
    let colliderDesc;

    switch (shape.toLowerCase()) {
      case 'sphere':
        colliderDesc = RAPIER.ColliderDesc.ball(size);
        break;
      case 'capsule':
        colliderDesc = RAPIER.ColliderDesc.capsule(size, size * 0.5);
        break;
      case 'cylinder':
        colliderDesc = RAPIER.ColliderDesc.cylinder(size, size * 0.5);
        break;
      case 'box':
      default:
        colliderDesc = RAPIER.ColliderDesc.cuboid(size, size, size);
        break;
    }

    const collider = world.createCollider(colliderDesc, rigidBody);
    this.setOutputValue('collider', collider);
  }
}

