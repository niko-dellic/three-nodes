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

export interface NodeLayoutConfig {
  // Layout style options
  style?: 'inline-header' | 'stacked' | 'default'; // 'inline-header' = controls in header, 'default' = normal layout

  // Custom CSS styles to apply to specific elements
  headerStyle?: Partial<CSSStyleProperties>;
  bodyStyle?: Partial<CSSStyleProperties>;
  contentColumnStyle?: Partial<CSSStyleProperties>;

  // Hide specific columns
  hideInputColumn?: boolean;
  hideOutputColumn?: boolean;

  // Show/hide port labels (default: true)
  showInputLabels?: boolean;
  showOutputLabels?: boolean;

  // Tweakpane control width override
  tweakpaneMinWidth?: number; // Min width in pixels for Tweakpane controls (default: 250)
}

// Helper type for CSS style properties
export interface CSSStyleProperties {
  [key: string]: string | undefined;
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
