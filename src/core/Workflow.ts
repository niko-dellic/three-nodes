import '../style.css';
import '@phosphor-icons/web/regular';
import { Graph } from '@/core/Graph';
import { createDefaultRegistry, NodeRegistry } from '@/three';
import { GraphEditor, LiveViewport, ViewModeManager, PreviewManager } from '@/ui';
import { isTouchDevice } from '@/utils/deviceDetection';
import { CustomNodeManager } from '@/three/CustomNodeManager';

export default class Workflow {
  public graph: Graph;
  public registry: NodeRegistry;
  public container: HTMLElement = document.body;
  graphEditor: GraphEditor;
  liveViewport: LiveViewport;
  previewManager: PreviewManager;
  viewModeManager: ViewModeManager;
  constructor(container: HTMLElement) {
    if (isTouchDevice()) document.body.id = 'touch-device';

    this.container = container;
    // Create the node registry
    this.registry = createDefaultRegistry();
    this.loadCustomNodes();

    // Create the graph
    this.graph = new Graph();

    const { viewportContainer, editorContainer } = this.initViewports();

    // Create graph editor (pass registry and app container for UI creation)
    this.graphEditor = new GraphEditor(editorContainer, this.graph, this.registry, this.container);

    // Create live viewport
    this.liveViewport = new LiveViewport(viewportContainer, this.graph);

    // Connect history manager to viewport for undo/redo integration
    this.liveViewport.setHistoryManager(this.graphEditor.getHistoryManager());

    // Connect selection manager and clipboard manager to viewport for copy/paste
    this.liveViewport.setSelectionManager(this.graphEditor.getSelectionManager());
    this.liveViewport.setClipboardManager(this.graphEditor.getClipboardManager());

    // Create preview manager and initialize its UI
    this.previewManager = new PreviewManager(this.graph, this.graphEditor.getSelectionManager());
    this.liveViewport.setPreviewManager(this.previewManager);
    this.graphEditor.setPreviewManager(this.previewManager);
    this.graphEditor.setLiveViewport(this.liveViewport); // Connect preview manager to node renderer

    // Initialize preview controls in toolbar
    const toolbar = this.graphEditor.getToolbar();
    const previewControls = toolbar.querySelector('.preview-controls') as HTMLElement;
    this.previewManager.initializeUI(previewControls);

    // Create view mode manager (it will create its own toggle button)
    this.viewModeManager = new ViewModeManager(
      this.graphEditor,
      this.liveViewport,
      editorContainer,
      this.container
    );
  }

  initViewports(): Record<string, HTMLElement> {
    // Create viewport container (3D view - background layer)
    const viewportContainer = document.createElement('div');
    viewportContainer.id = 'viewport';
    this.container.appendChild(viewportContainer);

    // Create editor container (node editor - overlay layer)
    const editorContainer = document.createElement('div');
    editorContainer.id = 'editor';
    this.container.appendChild(editorContainer);

    return { viewportContainer, editorContainer };
  }

  loadCustomNodes() {
    // Load custom nodes from localStorage
    const customNodeManager = new CustomNodeManager(this.registry);
    const loadResult = customNodeManager.loadFromStorage();
    if (loadResult.success) {
      console.log(loadResult.message);
    } else if (loadResult.error) {
      console.warn('Custom nodes load warning:', loadResult.error);
    }
  }
}
