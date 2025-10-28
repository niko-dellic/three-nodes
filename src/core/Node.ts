import { Port } from './Port';
import { PortSchema, EvaluationContext, PropertyConfig, NodeProperty } from './types';
import { PortValue } from '@/types';

export abstract class Node {
  public id: string;
  public type: string;
  public label: string;
  public inputs: Map<string, Port> = new Map();
  public outputs: Map<string, Port> = new Map();
  public properties: Map<string, NodeProperty> = new Map();
  public position: { x: number; y: number } = { x: 0, y: 0 };
  public customWidth?: number; // Optional custom width set by user resize
  public customHeight?: number; // Optional custom height set by user resize

  // Dirty flag for incremental evaluation
  private _isDirty = true;
  private _outputCache: Map<string, PortValue> = new Map();

  constructor(id: string, type: string, label: string) {
    this.id = id;
    this.type = type;
    this.label = label;
  }

  protected addInput(schema: PortSchema): Port {
    const port = new Port(schema.name, schema.type, this, true, schema.defaultValue);
    this.inputs.set(schema.name, port);
    return port;
  }

  protected addOutput(schema: PortSchema): Port {
    const port = new Port(schema.name, schema.type, this, false, schema.defaultValue);
    this.outputs.set(schema.name, port);
    return port;
  }

  protected addProperty(config: PropertyConfig): void {
    const property: NodeProperty = {
      name: config.name,
      type: config.type,
      value: config.value,
      label: config.label,
      min: config.min,
      max: config.max,
      step: config.step,
      options: config.options,
    };
    this.properties.set(config.name, property);
  }

  getProperty(name: string): any {
    const property = this.properties.get(name);
    return property ? property.value : undefined;
  }

  setProperty(name: string, value: any): void {
    const property = this.properties.get(name);
    if (property) {
      property.value = value;
      this.markDirty();
    }
  }

  // Abstract method that subclasses must implement
  abstract evaluate(context: EvaluationContext): void;

  // Lifecycle hooks
  init(): void {
    // Override if needed
  }

  dispose(): void {
    // Override if needed (cleanup GPU resources, etc.)
  }

  // Dirty flag management
  get isDirty(): boolean {
    return this._isDirty;
  }

  markDirty(): void {
    this._isDirty = true;
  }

  markClean(): void {
    this._isDirty = false;
  }

  // Cache management
  cacheOutput(portName: string, value: PortValue): void {
    this._outputCache.set(portName, value);
  }

  getCachedOutput(portName: string): PortValue | undefined {
    return this._outputCache.get(portName);
  }

  clearCache(): void {
    this._outputCache.clear();
  }

  // Helper to get input value
  protected getInputValue<T = PortValue>(name: string): T | undefined {
    const port = this.inputs.get(name);
    return port?.value as T | undefined;
  }

  // Helper to set output value
  protected setOutputValue(name: string, value: PortValue): void {
    const port = this.outputs.get(name);
    if (port) {
      port.value = value;
      this.cacheOutput(name, value);
    }
  }
}
