import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../Graph';
import { Node } from '../Node';
import { Evaluator } from '../Evaluator';
import { PortType } from '@/types';
import { EvaluationContext } from '../types';

class AddNode extends Node {
  constructor(id: string) {
    super(id, 'AddNode', 'Add');
    this.addInput({ name: 'a', type: PortType.Number, defaultValue: 0 });
    this.addInput({ name: 'b', type: PortType.Number, defaultValue: 0 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const a = this.getInputValue<number>('a') ?? 0;
    const b = this.getInputValue<number>('b') ?? 0;
    this.setOutputValue('result', a + b);
  }
}

class MultiplyNode extends Node {
  constructor(id: string) {
    super(id, 'MultiplyNode', 'Multiply');
    this.addInput({ name: 'a', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'b', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'result', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const a = this.getInputValue<number>('a') ?? 1;
    const b = this.getInputValue<number>('b') ?? 1;
    this.setOutputValue('result', a * b);
  }
}

describe('Evaluator', () => {
  let graph: Graph;
  let evaluator: Evaluator;

  beforeEach(() => {
    graph = new Graph();
    evaluator = new Evaluator(graph);
  });

  it('should evaluate a simple graph', () => {
    const add = new AddNode('add');
    add.inputs.get('a')!.value = 2;
    add.inputs.get('b')!.value = 3;
    graph.addNode(add);

    evaluator.evaluate();

    expect(add.outputs.get('result')!.value).toBe(5);
  });

  it('should evaluate connected nodes in order', () => {
    const add = new AddNode('add');
    add.inputs.get('a')!.value = 2;
    add.inputs.get('b')!.value = 3;

    const multiply = new MultiplyNode('multiply');
    multiply.inputs.get('b')!.value = 10;

    graph.addNode(add);
    graph.addNode(multiply);
    graph.connect(add.outputs.get('result')!, multiply.inputs.get('a')!);

    evaluator.evaluate();

    expect(add.outputs.get('result')!.value).toBe(5);
    expect(multiply.outputs.get('result')!.value).toBe(50);
  });

  it('should handle dirty flags', () => {
    const add = new AddNode('add');
    add.inputs.get('a')!.value = 2;
    add.inputs.get('b')!.value = 3;
    graph.addNode(add);

    evaluator.evaluate();
    expect(add.outputs.get('result')!.value).toBe(5);
    expect(add.isDirty).toBe(false);

    // Change input
    add.inputs.get('a')!.value = 5;
    add.markDirty();

    evaluator.evaluate();
    expect(add.outputs.get('result')!.value).toBe(8);
  });
});
