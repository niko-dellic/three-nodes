import './style.css';
import '@phosphor-icons/web/regular';
import { buildBasicGraph } from './examples/basic-graph';
import Workflow from './core/Workflow';

function init() {
  const container = document.getElementById('app') || document.body;
  const workflow = new Workflow(container);
  buildBasicGraph(workflow);
}

init();
