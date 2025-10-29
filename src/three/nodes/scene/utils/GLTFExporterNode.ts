import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

/**
 * GLTF Exporter Node
 * Exports a Three.js object or scene to GLTF format
 * Reference: https://threejs.org/docs/#examples/en/exporters/GLTFExporter
 */
export class GLTFExporterNode extends BaseThreeNode<'object', 'data'> {
  private exporter: GLTFExporter;

  constructor(id: string) {
    super(id, 'GLTFExporterNode', 'GLTF Exporter');

    this.exporter = new GLTFExporter();

    // Input: Object3D or Scene to export
    this.addInput({ name: 'object', type: PortType.Object3D });

    // Output: Exported GLTF data (as object or ArrayBuffer)
    this.addOutput({ name: 'data', type: PortType.Any });

    // Properties
    this.addProperty({ name: 'binary', type: 'boolean', value: false, label: 'Binary (GLB)' });
    this.addProperty({ name: 'onlyVisible', type: 'boolean', value: true, label: 'Only Visible' });
    this.addProperty({ name: 'embedImages', type: 'boolean', value: true, label: 'Embed Images' });
    this.addProperty({
      name: 'maxTextureSize',
      type: 'number',
      value: 4096,
      label: 'Max Texture Size',
    });
    this.addProperty({
      name: 'animations',
      type: 'boolean',
      value: true,
      label: 'Include Animations',
    });
    this.addProperty({
      name: 'autoDownload',
      type: 'boolean',
      value: false,
      label: 'Auto Download',
    });
    this.addProperty({ name: 'filename', type: 'string', value: 'scene', label: 'Filename' });
  }

  evaluate(_context: EvaluationContext): void {
    const inputObjects = this.getInputValues<THREE.Object3D>('object');

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
      this.setOutputValue('data', undefined);
      return;
    }

    // If multiple objects, create a group to hold them
    const exportObject =
      objects.length === 1
        ? objects[0]
        : (() => {
            const group = new THREE.Group();
            objects.forEach((obj) => group.add(obj.clone()));
            return group;
          })();

    // Build options
    const options = {
      binary: this.getProperty('binary') ?? false,
      onlyVisible: this.getProperty('onlyVisible') ?? true,
      embedImages: this.getProperty('embedImages') ?? true,
      maxTextureSize: this.getProperty('maxTextureSize') ?? 4096,
      animations: this.getProperty('animations') ? exportObject.animations : undefined,
    };

    try {
      // Export the object (this is async but we're not waiting for it)
      // The result will be available in the next evaluation cycle
      this.exporter.parse(
        exportObject,
        (result) => {
          // Cast result to any to satisfy PortValue type constraint
          this.setOutputValue('data', result as any);

          // Auto download if enabled
          const autoDownload = this.getProperty('autoDownload');
          if (autoDownload) {
            this.downloadExport(result, options.binary);
          }

          // Trigger re-evaluation to propagate the result
          if (this.graph) {
            this.graph.triggerChange();
          }
        },
        (error) => {
          console.error('GLTF Export Error:', error);
          this.setOutputValue('data', undefined);
        },
        options
      );
    } catch (error) {
      console.error('GLTF Export Failed:', error);
      this.setOutputValue('data', undefined);
    }
  }

  private downloadExport(result: any, binary: boolean): void {
    const filename = this.getProperty('filename') || 'scene';

    if (binary) {
      // GLB format (binary)
      const blob = new Blob([result], { type: 'application/octet-stream' });
      this.downloadBlob(blob, `${filename}.glb`);
    } else {
      // GLTF format (JSON)
      const output = JSON.stringify(result, null, 2);
      const blob = new Blob([output], { type: 'text/plain' });
      this.downloadBlob(blob, `${filename}.gltf`);
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  dispose(): void {
    // Cleanup if needed
    super.dispose();
  }
}
