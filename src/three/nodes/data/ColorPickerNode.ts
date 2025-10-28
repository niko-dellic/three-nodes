import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core/types';
import * as THREE from 'three';

export class ColorPickerNode extends BaseThreeNode {
  private currentColor: THREE.Color;

  constructor(id: string) {
    super(id, 'ColorPickerNode', 'Color Picker');

    // Default color input
    this.addInput({
      name: 'default',
      type: PortType.Color,
      defaultValue: new THREE.Color(1, 1, 1),
    });

    // Output
    this.addOutput({ name: 'color', type: PortType.Color });

    // Initialize with default color (white)
    this.currentColor = new THREE.Color(1, 1, 1);
  }

  evaluate(_context: EvaluationContext): void {
    const defaultColor = this.getInputValue<THREE.Color>('default');

    // On first evaluation, use default
    if (this.outputs.get('color')?.value === undefined && defaultColor) {
      this.currentColor = defaultColor.clone();
    }

    this.setOutputValue('color', this.currentColor);
  }

  setColor(color: THREE.Color): void {
    this.currentColor = color.clone();
    this.markDirty();
  }

  getColor(): THREE.Color {
    return this.currentColor;
  }

  getColorHex(): string {
    return '#' + this.currentColor.getHexString();
  }

  setColorFromHex(hex: string): void {
    this.currentColor.set(hex);
    this.markDirty();
  }
}
