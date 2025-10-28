import { TweakpaneNode } from '../../TweakpaneNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core/types';
import * as THREE from 'three';

export class ColorPickerNode extends TweakpaneNode {
  private currentColor: THREE.Color;
  private params = { color: '#ffffff' };

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
    this.params.color = this.getColorHex();
  }

  protected setupTweakpaneControls(): void {
    if (!this.pane) return;

    this.params.color = this.getColorHex();

    this.pane
      .addBinding(this.params, 'color', {
        expanded: true, // Always show the color space picker
        picker: 'inline', // Show picker inline, not in a popup
      })
      .on('change', (ev) => {
        this.currentColor.set(ev.value);
        this.onTweakpaneChange();
      });
  }

  getControlHeight(): number {
    return 160; // Expanded color picker needs more height
  }

  evaluate(_context: EvaluationContext): void {
    const defaultColor = this.getInputValue<THREE.Color>('default');

    // On first evaluation, use default
    if (this.outputs.get('color')?.value === undefined && defaultColor) {
      this.currentColor = defaultColor.clone();
      this.params.color = this.getColorHex();
    }

    this.setOutputValue('color', this.currentColor);
  }

  setColor(color: THREE.Color): void {
    this.currentColor = color.clone();
    this.params.color = this.getColorHex();
    // Don't call refresh here to avoid infinite loops
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
    this.params.color = hex;
    // Don't call refresh here to avoid infinite loops
    this.markDirty();
  }
}
