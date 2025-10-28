import { PortType, PortValue } from '@/types';

export interface PortSchema {
  name: string;
  type: PortType;
  defaultValue?: PortValue;
}

export interface EvaluationContext {
  graph?: import('./Graph').Graph; // Reference to the graph for accessing shared resources
  [key: string]: unknown;
}

export type PropertyType = 'number' | 'string' | 'boolean' | 'color' | 'list' | 'point';

export interface PropertyConfig {
  name: string;
  type: PropertyType;
  value: any;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Record<string, any>; // For list type
  multiline?: boolean; // For string type
  rows?: number; // For multiline string type
}

export interface NodeProperty {
  name: string;
  type: PropertyType;
  value: any;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Record<string, any>;
  multiline?: boolean;
  rows?: number;
}

export interface SerializedGraph {
  version: string;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}

export interface SerializedNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  inputs: Record<string, PortValue>;
  properties?: Record<string, any>; // Optional node properties
  customWidth?: number; // Optional custom width set by user
  customHeight?: number; // Optional custom height set by user
}

export interface SerializedEdge {
  id: string;
  sourceNodeId: string;
  sourcePortName: string;
  targetNodeId: string;
  targetPortName: string;
}
