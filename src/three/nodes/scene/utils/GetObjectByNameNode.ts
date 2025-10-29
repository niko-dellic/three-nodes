import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Get Object By Name Node
 * Searches for objects by name in the Object3D hierarchy
 * Supports both single objects and arrays
 * Can search recursively through children
 */
export class GetObjectByNameNode extends BaseThreeNode<'object' | 'name', 'found'> {
  constructor(id: string) {
    super(id, 'GetObjectByNameNode', 'Get Object By Name');

    // Input: Object3D or array of Object3Ds to search in
    this.addInput({ name: 'object', type: PortType.Object3D });

    // Input: Name to search for
    this.addInput({ name: 'name', type: PortType.String, defaultValue: '' });

    // Output: Found object(s)
    this.addOutput({ name: 'found', type: PortType.Object3D });

    // Properties
    this.addProperty({ name: 'recursive', type: 'boolean', value: true, label: 'Recursive' });
    this.addProperty({ name: 'exactMatch', type: 'boolean', value: true, label: 'Exact Match' });
    this.addProperty({
      name: 'caseSensitive',
      type: 'boolean',
      value: true,
      label: 'Case Sensitive',
    });
    this.addProperty({
      name: 'returnFirst',
      type: 'boolean',
      value: false,
      label: 'Return First Only',
    });
  }

  evaluate(_context: EvaluationContext): void {
    const inputObjects = this.getInputValues<THREE.Object3D>('object');
    const searchName = this.getInputValue<string>('name');

    if (!searchName || searchName.trim() === '') {
      this.setOutputValue('found', undefined);
      return;
    }

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
      this.setOutputValue('found', undefined);
      return;
    }

    // Get properties
    const recursive = this.getProperty('recursive') ?? true;
    const exactMatch = this.getProperty('exactMatch') ?? true;
    const caseSensitive = this.getProperty('caseSensitive') ?? true;
    const returnFirst = this.getProperty('returnFirst') ?? false;

    // Search for matching objects
    const found: THREE.Object3D[] = [];

    for (const obj of objects) {
      if (recursive) {
        // Recursive search using getObjectByName or traverse
        const matches = this.findObjectsByName(obj, searchName, exactMatch, caseSensitive);
        found.push(...matches);

        if (returnFirst && found.length > 0) {
          break;
        }
      } else {
        // Non-recursive: only check direct children
        const matches = this.searchDirectChildren(obj, searchName, exactMatch, caseSensitive);
        found.push(...matches);

        if (returnFirst && found.length > 0) {
          break;
        }
      }
    }

    // Return result
    if (found.length === 0) {
      this.setOutputValue('found', undefined);
    } else if (returnFirst || found.length === 1) {
      this.setOutputValue('found', found[0]);
    } else {
      this.setOutputValue('found', found);
    }
  }

  private findObjectsByName(
    root: THREE.Object3D,
    name: string,
    exactMatch: boolean,
    caseSensitive: boolean
  ): THREE.Object3D[] {
    const found: THREE.Object3D[] = [];

    root.traverse((obj) => {
      if (this.nameMatches(obj.name, name, exactMatch, caseSensitive)) {
        found.push(obj);
      }
    });

    return found;
  }

  private searchDirectChildren(
    parent: THREE.Object3D,
    name: string,
    exactMatch: boolean,
    caseSensitive: boolean
  ): THREE.Object3D[] {
    const found: THREE.Object3D[] = [];

    // Check the parent itself
    if (this.nameMatches(parent.name, name, exactMatch, caseSensitive)) {
      found.push(parent);
    }

    // Check direct children only
    for (const child of parent.children) {
      if (this.nameMatches(child.name, name, exactMatch, caseSensitive)) {
        found.push(child);
      }
    }

    return found;
  }

  private nameMatches(
    objName: string,
    searchName: string,
    exactMatch: boolean,
    caseSensitive: boolean
  ): boolean {
    if (!objName) return false;

    const name1 = caseSensitive ? objName : objName.toLowerCase();
    const name2 = caseSensitive ? searchName : searchName.toLowerCase();

    if (exactMatch) {
      return name1 === name2;
    } else {
      return name1.includes(name2);
    }
  }
}
