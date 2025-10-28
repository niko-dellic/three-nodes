import * as THREE from 'three';

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
  Any = 'any',
}

// Runtime value types
export type PortValue =
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
  | SceneOutput
  | null
  | undefined;

// Node metadata for registry
export interface NodeMetadata {
  type: string;
  category: string;
  label: string;
  description?: string;
  icon?: string;
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
