import * as THREE from 'three';

// Re-export custom node types
export * from './customNode';

// Port types for the node system
export enum PortType {
  Number = 'number',
  Boolean = 'boolean',
  String = 'string',
  Vector3 = 'vector3',
  Color = 'color',
  Matrix4 = 'matrix4',
  Texture = 'texture',
  Geometry = 'geometry',
  Material = 'material',
  Object3D = 'object3d',
  Scene = 'scene',
  Camera = 'camera',
  Light = 'light',
  Point2D = 'point2d',
  Any = 'any',
}

// 2D Point type
export interface Point2D {
  x: number;
  y: number;
}

// Base value types
export type BasePortValue =
  | number
  | boolean
  | string
  | THREE.Vector3
  | THREE.Color
  | THREE.Matrix4
  | THREE.Texture
  | THREE.BufferGeometry
  | THREE.Material
  | THREE.Object3D
  | THREE.Scene
  | THREE.Camera
  | THREE.Light
  | Point2D
  | SceneOutput
  | null
  | undefined;

// Runtime value types (can be single values or arrays)
export type PortValue = BasePortValue | BasePortValue[];

// Node metadata for registry
export interface NodeMetadata {
  type: string;
  category: string;
  label: string;
  description?: string;
  icon?: string;
  sourceFile?: string; // Path to the source file for displaying full code
}

// Scene output structure
export interface SceneOutput {
  scene: THREE.Scene;
  camera: THREE.Camera;
}

// Port definition schema
export interface PortDefinition {
  name: string;
  type: PortType;
  defaultValue?: PortValue;
  required?: boolean;
}
