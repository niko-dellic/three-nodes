import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Filter Objects Node
 * Filters a list of Object3D based on various criteria
 * Can optionally search recursively through children
 *
 * Supports filtering by:
 * - Type (Mesh, Light, Camera, Group, etc.)
 * - Name (exact or partial match)
 * - Visibility
 * - Custom property checks
 */
export class FilterObjectsNode extends BaseThreeNode<'objects' | 'name', 'filtered'> {
  constructor(id: string) {
    super(id, 'FilterObjectsNode', 'Filter Objects');

    // Input: Object3D or array of Object3Ds to filter
    this.addInput({ name: 'objects', type: PortType.Object3D });

    // Input: Optional name filter
    this.addInput({ name: 'name', type: PortType.String, defaultValue: '' });

    // Output: Filtered objects
    this.addOutput({ name: 'filtered', type: PortType.Object3D });

    // Properties
    this.addProperty({ name: 'recursive', type: 'boolean', value: false, label: 'Recursive' });
    this.addProperty({ name: 'filterType', type: 'string', value: 'All', label: 'Type' });
    this.addProperty({ name: 'onlyVisible', type: 'boolean', value: false, label: 'Only Visible' });
    this.addProperty({ name: 'nameMatch', type: 'string', value: 'contains', label: 'Name Match' });
    this.addProperty({
      name: 'caseSensitive',
      type: 'boolean',
      value: false,
      label: 'Case Sensitive',
    });
    this.addProperty({
      name: 'hasMaterial',
      type: 'boolean',
      value: false,
      label: 'Must Have Material',
    });
    this.addProperty({
      name: 'hasGeometry',
      type: 'boolean',
      value: false,
      label: 'Must Have Geometry',
    });
  }

  evaluate(_context: EvaluationContext): void {
    const inputObjects = this.getInputValues<THREE.Object3D>('objects');
    const nameFilter = this.getInputValue<string>('name') || '';

    // Flatten all objects (handle both single objects and arrays)
    const objects: THREE.Object3D[] = [];
    for (const obj of inputObjects) {
      if (obj) {
        if (Array.isArray(obj)) {
          objects.push(...obj.filter((o) => o !== null && o !== undefined));
        } else {
          objects.push(obj);
        }
      }
    }

    if (objects.length === 0) {
      this.setOutputValue('filtered', []);
      return;
    }

    // Get properties
    const recursive = this.getProperty('recursive') ?? false;
    const filterType = this.getProperty('filterType') ?? 'All';
    const onlyVisible = this.getProperty('onlyVisible') ?? false;
    const nameMatch = this.getProperty('nameMatch') ?? 'contains';
    const caseSensitive = this.getProperty('caseSensitive') ?? false;
    const hasMaterial = this.getProperty('hasMaterial') ?? false;
    const hasGeometry = this.getProperty('hasGeometry') ?? false;

    // Collect objects to filter
    const toFilter: THREE.Object3D[] = [];

    if (recursive) {
      // Recursively collect all objects
      for (const obj of objects) {
        obj.traverse((child) => {
          toFilter.push(child);
        });
      }
    } else {
      // Just use the input objects
      toFilter.push(...objects);
    }

    // Apply filters
    const filtered = toFilter.filter((obj) => {
      // Filter by visibility
      if (onlyVisible && !obj.visible) {
        return false;
      }

      // Filter by type
      if (filterType !== 'All') {
        if (!this.checkType(obj, filterType)) {
          return false;
        }
      }

      // Filter by name
      if (nameFilter.trim() !== '') {
        if (!this.checkName(obj.name, nameFilter, nameMatch, caseSensitive)) {
          return false;
        }
      }

      // Filter by material
      if (hasMaterial) {
        if (!('material' in obj) || !(obj as any).material) {
          return false;
        }
      }

      // Filter by geometry
      if (hasGeometry) {
        if (!('geometry' in obj) || !(obj as any).geometry) {
          return false;
        }
      }

      return true;
    });

    // Return result
    if (filtered.length === 0) {
      this.setOutputValue('filtered', undefined);
    } else if (filtered.length === 1) {
      this.setOutputValue('filtered', filtered[0]);
    } else {
      this.setOutputValue('filtered', filtered);
    }
  }

  private checkType(obj: THREE.Object3D, typeFilter: string): boolean {
    switch (typeFilter) {
      case 'Mesh':
        return obj instanceof THREE.Mesh;
      case 'Light':
        return obj instanceof THREE.Light;
      case 'Camera':
        return obj instanceof THREE.Camera;
      case 'Group':
        return obj instanceof THREE.Group;
      case 'Scene':
        return obj instanceof THREE.Scene;
      case 'Points':
        return obj instanceof THREE.Points;
      case 'Line':
        return obj instanceof THREE.Line;
      case 'Sprite':
        return obj instanceof THREE.Sprite;
      case 'Bone':
        return obj instanceof THREE.Bone;
      case 'SkinnedMesh':
        return obj instanceof THREE.SkinnedMesh;
      case 'All':
      default:
        return true;
    }
  }

  private checkName(
    objName: string,
    filter: string,
    matchType: string,
    caseSensitive: boolean
  ): boolean {
    if (!objName) return false;

    const name1 = caseSensitive ? objName : objName.toLowerCase();
    const name2 = caseSensitive ? filter : filter.toLowerCase();

    switch (matchType) {
      case 'exact':
        return name1 === name2;
      case 'startsWith':
        return name1.startsWith(name2);
      case 'endsWith':
        return name1.endsWith(name2);
      case 'contains':
      default:
        return name1.includes(name2);
    }
  }
}
