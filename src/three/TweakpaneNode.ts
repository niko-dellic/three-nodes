import { BaseThreeNode } from './BaseThreeNode';
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

/**
 * Base class for nodes that use Tweakpane controls
 * Manages Pane instance lifecycle and provides common functionality
 */
export abstract class TweakpaneNode<
  TInputs extends string = string,
  TOutputs extends string = string,
> extends BaseThreeNode<TInputs, TOutputs> {
  protected pane: Pane | null = null;
  protected container: HTMLElement | null = null;

  /**
   * Initialize the Tweakpane instance with a container element
   * This should be called by the NodeRenderer when creating controls
   */
  initializeTweakpane(container: HTMLElement): void {
    this.container = container;
    this.pane = new Pane({ container });
    // Register Essentials plugin for fpsgraph and other components
    this.pane.registerPlugin(EssentialsPlugin);
    this.setupTweakpaneControls();
  }

  /**
   * Override this method to set up Tweakpane controls
   * Called after the pane is created
   */
  protected abstract setupTweakpaneControls(): void;

  /**
   * Helper to wire up change events to mark the node dirty
   * and trigger graph evaluation
   * This method can be overridden by NodeRenderer to add graph update logic
   */
  public onTweakpaneChange(callback?: () => void): void {
    this.markDirty();
    if (callback) {
      callback();
    }
  }

  /**
   * Get the Tweakpane instance
   */
  getPaneInstance(): Pane | null {
    return this.pane;
  }

  /**
   * Cleanup Tweakpane resources
   */
  dispose(): void {
    if (this.pane) {
      this.pane.dispose();
      this.pane = null;
    }
    this.container = null;
    super.dispose();
  }

  /**
   * Check if Tweakpane is initialized
   */
  isTweakpaneInitialized(): boolean {
    return this.pane !== null;
  }

  /**
   * Get the required height for this control
   * Override in subclasses if needed for larger controls
   */
  getControlHeight(): number {
    return 30; // Default height for simple controls
  }
}
