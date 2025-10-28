import { PortType, PortValue } from '@/types';
import type { Node } from './Node';

export class Port {
  public id: string;
  public name: string;
  public type: PortType;
  public node: Node;
  public isInput: boolean;
  private _value: PortValue = undefined;
  private _defaultValue: PortValue;

  constructor(
    name: string,
    type: PortType,
    node: Node,
    isInput: boolean,
    defaultValue?: PortValue
  ) {
    this.id = `${node.id}_${name}_${isInput ? 'in' : 'out'}`;
    this.name = name;
    this.type = type;
    this.node = node;
    this.isInput = isInput;
    this._defaultValue = defaultValue;
    this._value = defaultValue;
  }

  get value(): PortValue {
    return this._value;
  }

  set value(val: PortValue) {
    this._value = val;
  }

  get defaultValue(): PortValue {
    return this._defaultValue;
  }

  reset(): void {
    this._value = this._defaultValue;
  }

  // Check if types are compatible for connections
  canConnectTo(other: Port): boolean {
    if (this.isInput === other.isInput) return false;
    if (this.type === PortType.Any || other.type === PortType.Any) return true;

    // Check if types are exactly the same
    if (this.type === other.type) return true;

    // Check Three.js type hierarchy compatibility
    return this.isTypeCompatible(this.type, other.type);
  }

  // Check if two types are compatible based on Three.js hierarchy
  private isTypeCompatible(sourceType: PortType, targetType: PortType): boolean {
    // Object3D is the base class - it accepts Mesh, Light, Camera, Scene
    const object3DCompatible = [PortType.Object3D, PortType.Light, PortType.Camera, PortType.Scene];

    // If target is Object3D, accept any Object3D-derived type
    if (targetType === PortType.Object3D && object3DCompatible.includes(sourceType)) {
      return true;
    }

    // If source is Object3D, it can also connect to derived types (upcast)
    if (sourceType === PortType.Object3D && object3DCompatible.includes(targetType)) {
      return true;
    }

    return false;
  }
}
