import { PortType, PortValue } from '@/types';

export interface PortSchema {
  name: string;
  type: PortType;
  defaultValue?: PortValue;
}

export interface EvaluationContext {
  [key: string]: unknown;
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
