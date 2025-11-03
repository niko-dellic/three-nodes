import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d';

export class RapierRigidBodyNode extends BaseThreeNode<
  'world' | 'type' | 'position' | 'rotation',
  'rigidBody'
> {
  constructor(id: string) {
    super(id, 'RapierRigidBodyNode', 'Rapier Rigid Body');
    this.addInput({ name: 'world', type: PortType.Any });
    this.addInput({ name: 'type', type: PortType.String, defaultValue: 'dynamic' });
    this.addInput({ name: 'position', type: PortType.Vector3, defaultValue: new THREE.Vector3(0, 0, 0) });
    this.addInput({ name: 'rotation', type: PortType.Any, defaultValue: new THREE.Quaternion(0, 0, 0, 1) });
    this.addOutput({ name: 'rigidBody', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const world = this.getInputValue<RAPIER.World>('world');
    const type = this.getInputValue<string>('type') ?? 'dynamic';
    const position = this.getInputValue<THREE.Vector3>('position') ?? new THREE.Vector3(0, 0, 0);
    const rotation = this.getInputValue<THREE.Quaternion>('rotation') ?? new THREE.Quaternion(0, 0, 0, 1);

    if (!world) {
      console.warn('RapierRigidBodyNode: No world provided');
      return;
    }

    // Create rigid body description
    let bodyDesc;
    switch (type.toLowerCase()) {
      case 'static':
        bodyDesc = (world.constructor as any).RigidBodyDesc?.fixed?.();
        break;
      case 'kinematic':
        bodyDesc = (world.constructor as any).RigidBodyDesc?.kinematicPositionBased?.();
        break;
      case 'dynamic':
      default:
        bodyDesc = (world.constructor as any).RigidBodyDesc?.dynamic?.();
        break;
    }

    if (!bodyDesc) {
      // Fallback: try accessing from RAPIER module
      const RAPIER = (world as any).constructor;
      if (type.toLowerCase() === 'static') {
        bodyDesc = RAPIER.RigidBodyDesc.fixed();
      } else if (type.toLowerCase() === 'kinematic') {
        bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
      } else {
        bodyDesc = RAPIER.RigidBodyDesc.dynamic();
      }
    }

    bodyDesc.setTranslation(position.x, position.y, position.z);
    bodyDesc.setRotation({ w: rotation.w, x: rotation.x, y: rotation.y, z: rotation.z });

    const rigidBody = world.createRigidBody(bodyDesc);
    this.setOutputValue('rigidBody', rigidBody);
  }
}

