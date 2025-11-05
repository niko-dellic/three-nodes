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
    // Create graph editor (pass registry and app container for UI creation)
    this.graphEditor = new GraphEditor(this.graph, this.registry, this.container);
    // Create live viewport
    this.liveViewport = new LiveViewport(this.graph, this.registry, this.container);
    // Create preview manager and initialize its UI
    this.previewManager = new PreviewManager(
      this.graph,
      this.graphEditor.getSelectionManager(),
      this.liveViewport
    );
    this.liveViewport.setPreviewManager(this.previewManager);
    this.graphEditor.setPreviewManager(this.previewManager);
    this.graphEditor.setLiveViewport(this.liveViewport);

    // Initialize preview controls in toolbar
    const toolbar = this.graphEditor.getToolbar();
    const previewControls = toolbar.querySelector('.preview-controls') as HTMLElement;
    this.previewManager.initializeUI(previewControls);

    // Create view mode manager (it will create its own toggle button)
    this.viewModeManager = new ViewModeManager(
      this.graphEditor,
      this.liveViewport,
      this.graphEditor.getContainer(),
      this.container
    );

    // Connect view mode manager to LiveViewport for mode-aware copy/paste
    this.liveViewport.setViewModeManager(this.viewModeManager);

    // Connect graph selection manager to LiveViewport for node selection
    this.liveViewport.setGraphSelectionManager(this.graphEditor.getSelectionManager());
  }

  loadCustomNodes() {
    // Load custom nodes from localStorage
    const customNodeManager = new CustomNodeManager(this.registry);
    const loadResult = customNodeManager.loadFromStorage();
    if (loadResult.success) console.log(loadResult.message);
    else if (loadResult.error) console.warn('Custom nodes load warning:', loadResult.error);
  }
}
