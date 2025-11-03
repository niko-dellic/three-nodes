import './style.css';
import '@phosphor-icons/web/regular';
import { Graph } from '@/core/Graph';
import { createDefaultRegistry } from '@/three';
import { GraphEditor, LiveViewport, ViewModeManager, PreviewManager } from '@/ui';
import { isTouchDevice } from '@/utils/deviceDetection';
import { CustomNodeManager } from '@/three/CustomNodeManager';
import { buildBasicGraph } from './examples/basic-graph';

function init() {
  // Detect touch device and add ID to body for styling
  if (isTouchDevice()) document.body.id = 'touch-device';

  // Create the node registry
  const registry = createDefaultRegistry();

  // Load custom nodes from localStorage
  const customNodeManager = new CustomNodeManager(registry);
  const loadResult = customNodeManager.loadFromStorage();
  if (loadResult.success) {
    console.log(loadResult.message);
  } else if (loadResult.error) {
    console.warn('Custom nodes load warning:', loadResult.error);
  }

  // Create the graph
  const graph = new Graph();

  // Initialize UI - Create containers programmatically
  const appContainer = document.getElementById('app');
  if (!appContainer) throw new Error('App container not found');

  // Create viewport container (3D view - background layer)
  const viewportContainer = document.createElement('div');
  viewportContainer.id = 'viewport';
  appContainer.appendChild(viewportContainer);

  // Create editor container (node editor - overlay layer)
  const editorContainer = document.createElement('div');
  editorContainer.id = 'editor';
  appContainer.appendChild(editorContainer);

  // Create graph editor (pass registry and app container for UI creation)
  const graphEditor = new GraphEditor(editorContainer, graph, registry, appContainer);

  // Create live viewport
  const liveViewport = new LiveViewport(viewportContainer, graph);

  // Connect history manager to viewport for undo/redo integration
  liveViewport.setHistoryManager(graphEditor.getHistoryManager());

  // Connect selection manager and clipboard manager to viewport for copy/paste
  liveViewport.setSelectionManager(graphEditor.getSelectionManager());
  liveViewport.setClipboardManager(graphEditor.getClipboardManager());

  // Create preview manager and initialize its UI
  const previewManager = new PreviewManager(graph, graphEditor.getSelectionManager());
  liveViewport.setPreviewManager(previewManager);
  graphEditor.setPreviewManager(previewManager);
  graphEditor.setLiveViewport(liveViewport); // Connect preview manager to node renderer

  // Initialize preview controls in toolbar
  const toolbar = graphEditor.getToolbar();
  const previewControls = toolbar.querySelector('.preview-controls') as HTMLElement;
  previewManager.initializeUI(previewControls);

  // Create view mode manager (it will create its own toggle button)
  new ViewModeManager(graphEditor, liveViewport, editorContainer, appContainer);
  return { graph, registry };
}

const { graph, registry } = init();
buildBasicGraph(graph, registry);
