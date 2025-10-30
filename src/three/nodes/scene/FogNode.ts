import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Fog Node
 * Creates fog for atmospheric effects in scenes
 * Supports both linear fog (near/far) and exponential fog (density)
 */
export class FogNode extends BaseThreeNode<
  'color' | 'near' | 'far' | 'density',
  'fog'
> {
  private fog: THREE.Fog | THREE.FogExp2;

  constructor(id: string) {
    super(id, 'FogNode', 'Fog');

    // Create default linear fog with visible range
    this.fog = new THREE.Fog(0xcccccc, 1, 15);

    // Inputs for dynamic customization
    this.addInput({ name: 'color', type: PortType.Color });
    this.addInput({ name: 'near', type: PortType.Number });
    this.addInput({ name: 'far', type: PortType.Number });
    this.addInput({ name: 'density', type: PortType.Number });

    this.addOutput({ name: 'fog', type: PortType.Any });

    // Properties with defaults (adjusted for immediate visibility)
    this.addProperty({
      name: 'fogType',
      type: 'select',
      value: 'linear',
      label: 'Fog Type',
      options: ['linear', 'exponential'],
    });
    this.addProperty({
      name: 'color',
      type: 'color',
      value: '#888888',
      label: 'Color',
    });
    this.addProperty({
      name: 'near',
      type: 'number',
      value: 1,
      label: 'Near (Linear)',
    });
    this.addProperty({
      name: 'far',
      type: 'number',
      value: 15,
      label: 'Far (Linear)',
    });
    this.addProperty({
      name: 'density',
      type: 'number',
      value: 0.1,
      label: 'Density (Exponential)',
    });
  }

  evaluate(_context: EvaluationContext): void {
    // Get values from inputs (if connected) or properties (as fallback)
    const fogType = this.getProperty('fogType') ?? 'linear';
    const colorInput = this.getInputValue<THREE.Color | string>('color');
    const colorProp = this.getProperty('color') ?? '#cccccc';
    const color = colorInput ?? colorProp;

    let near = this.getInputValue<number>('near') ?? this.getProperty('near') ?? 10;
    let far = this.getInputValue<number>('far') ?? this.getProperty('far') ?? 50;
    let density = this.getInputValue<number>('density') ?? this.getProperty('density') ?? 0.05;

    // Ensure valid values
    near = Math.max(0, near);
    far = Math.max(near + 0.1, far); // Far must be greater than near
    density = Math.max(0.0001, density);

    // Check if we need to recreate the fog (type changed)
    const currentType = this.fog instanceof THREE.Fog ? 'linear' : 'exponential';
    const needsRecreation = currentType !== fogType;

    if (needsRecreation) {
      if (fogType === 'linear') {
        this.fog = new THREE.Fog(new THREE.Color(color), near, far);
      } else {
        this.fog = new THREE.FogExp2(new THREE.Color(color), density);
      }
    } else {
      // Update existing fog properties
      this.fog.color = new THREE.Color(color);
      
      if (this.fog instanceof THREE.Fog) {
        this.fog.near = near;
        this.fog.far = far;
      } else if (this.fog instanceof THREE.FogExp2) {
        this.fog.density = density;
      }
    }

    console.log('FogNode: Created fog', this.fog);
    this.setOutputValue('fog', this.fog);
  }

  dispose(): void {
    // Fog doesn't have resources to dispose
    super.dispose();
  }
}

