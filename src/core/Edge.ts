import type { Port } from './Port';

export class Edge {
  public id: string;
  public source: Port;
  public target: Port;

  constructor(source: Port, target: Port) {
    if (!source.canConnectTo(target)) {
      throw new Error(
        `Cannot connect ${source.type} to ${target.type}: incompatible types or directions`
      );
    }
    this.id = `${source.id}_to_${target.id}`;
    this.source = source;
    this.target = target;
  }

  // Transfer value from source to target
  propagate(): void {
    this.target.value = this.source.value;
  }
}
