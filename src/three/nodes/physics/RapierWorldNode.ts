import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d';

export class RapierWorldNode extends BaseThreeNode<'gravity' | 'timestep', 'world' | 'ready'> {
  private world: RAPIER.World | null = null;
  private rapier: typeof RAPIER | null = null;
  private isInitializing = false;

  constructor(id: string) {
    super(id, 'RapierWorldNode', 'Rapier World');
    this.addInput({ name: 'gravity', type: PortType.Vector3, defaultValue: new THREE.Vector3(0, -9.81, 0) });
    this.addInput({ name: 'timestep', type: PortType.Number, defaultValue: 1/60 });
    this.addOutput({ name: 'world', type: PortType.Any });
    this.addOutput({ name: 'ready', type: PortType.Boolean });
    
    this.initRapier();
  }

  private async initRapier(): Promise<void> {
    if (this.isInitializing || this.rapier) return;
    this.isInitializing = true;

    try {
      const RAPIER = await import('@dimforge/rapier3d');
      // Rapier 3D doesn't need manual init in newer versions
      this.rapier = RAPIER as any;
      this.isInitializing = false;
      this.markDirty();
    } catch (error) {
      console.error('Failed to initialize Rapier:', error);
      this.isInitializing = false;
    }
  }

  evaluate(_context: EvaluationContext): void {
    if (!this.rapier) {
      this.setOutputValue('ready', false);
      return;
    }

    const gravity = this.getInputValue<THREE.Vector3>('gravity') ?? new THREE.Vector3(0, -9.81, 0);

    if (!this.world) {
      const gravityVec = new this.rapier.Vector3(gravity.x, gravity.y, gravity.z);
      this.world = new this.rapier.World(gravityVec);
    } else {
      // Update gravity if it changed
      this.world.gravity.x = gravity.x;
      this.world.gravity.y = gravity.y;
      this.world.gravity.z = gravity.z;
    }

    this.setOutputValue('world', this.world);
    this.setOutputValue('ready', true);
  }

  dispose(): void {
    if (this.world) {
      this.world.free();
      this.world = null;
    }
    super.dispose();
  }
}

