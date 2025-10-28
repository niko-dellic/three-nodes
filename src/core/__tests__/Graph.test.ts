import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../Graph';
import { Node } from '../Node';
import { PortType } from '@/types';
import { EvaluationContext } from '../types';

class TestNode extends Node {
  constructor(id: string) {
    super(id, 'TestNode', 'Test');
    this.addInput({ name: 'input', type: PortType.Number, defaultValue: 0 });
    this.addOutput({ name: 'output', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const input = this.getInputValue<number>('input') ?? 0;
    this.setOutputValue('output', input * 2);
  }
}

describe('Graph', () => {
  let graph: Graph;

  beforeEach(() => {
    graph = new Graph();
  });

  it('should create an empty graph', () => {
    expect(graph.nodes.size).toBe(0);
    expect(graph.edges.size).toBe(0);
  });

  it('should add nodes', () => {
    const node = new TestNode('test-1');
    graph.addNode(node);
    expect(graph.nodes.size).toBe(1);
    expect(graph.getNode('test-1')).toBe(node);
  });

  it('should remove nodes', () => {
    const node = new TestNode('test-1');
    graph.addNode(node);
    graph.removeNode('test-1');
    expect(graph.nodes.size).toBe(0);
  });

  it('should connect nodes', () => {
    const node1 = new TestNode('test-1');
    const node2 = new TestNode('test-2');
    graph.addNode(node1);
    graph.addNode(node2);

    const output = node1.outputs.get('output')!;
    const input = node2.inputs.get('input')!;

    const edge = graph.connect(output, input);
    expect(edge).not.toBeNull();
    expect(graph.edges.size).toBe(1);
  });

  it('should not create duplicate connections', () => {
    const node1 = new TestNode('test-1');
    const node2 = new TestNode('test-2');
    graph.addNode(node1);
    graph.addNode(node2);

    const output = node1.outputs.get('output')!;
    const input = node2.inputs.get('input')!;

    graph.connect(output, input);
    const edge2 = graph.connect(output, input);

    expect(edge2).toBeNull();
    expect(graph.edges.size).toBe(1);
  });

  it('should remove edges when removing nodes', () => {
    const node1 = new TestNode('test-1');
    const node2 = new TestNode('test-2');
    graph.addNode(node1);
    graph.addNode(node2);

    graph.connect(node1.outputs.get('output')!, node2.inputs.get('input')!);
    expect(graph.edges.size).toBe(1);

    graph.removeNode('test-1');
    expect(graph.edges.size).toBe(0);
  });
});
