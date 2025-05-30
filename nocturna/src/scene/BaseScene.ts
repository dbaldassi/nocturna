import { Engine, Scene, HavokPlugin, Vector3 } from "@babylonjs/core";
import { InputHandler } from "../InputHandler";
import HavokPhysics from "@babylonjs/havok";
import { App } from "../app";

/**
 * Abstract base class for all game scenes in Nocturna.
 * 
 * Handles Babylon.js scene creation, rendering, physics initialization (Havok), 
 * and input management. Provides utility methods for restarting the scene, 
 * enabling the debug layer, and rendering.
 * 
 * Subclasses must implement the `update` method for per-frame logic.
 */
export abstract class BaseScene {
    /** The Babylon.js scene instance. */
    protected scene: Scene;
    /** The Babylon.js engine instance. */
    protected engine: Engine;
    /** Handles user input for the scene. */
    protected inputHandler: InputHandler;
    /** Havok physics instance (internal use). */
    private havokInstance: any;
    /** Havok physics plugin for Babylon.js (internal use). */
    private hk: HavokPlugin;

    /**
     * Constructs a new BaseScene.
     * @param engine - The Babylon.js engine.
     * @param inputHandler - The input handler for this scene.
     */
    constructor(engine: any, inputHandler: InputHandler) {
        this.inputHandler = inputHandler;
        this.scene = new Scene(engine);
        this.engine = engine;
    }

    /**
     * Abstract update method to be implemented by subclasses.
     * Called every frame with the time delta.
     * @param dt - Time delta since last frame (in seconds).
     */
    public abstract update(dt: number): void;

    /**
     * Renders the current scene.
     */
    public render() {
        this.scene.render();
    }

    /**
     * Enables the Babylon.js debug layer for scene inspection.
     */
    public enableDebug() {
        this.scene.debugLayer.show({
            overlay: true,
            embedMode: true,
            showExplorer: true,
            showInspector: true,
            enablePopup: true,
        })
    }

    /**
     * Restarts the scene by disposing and recreating it.
     */
    public restart() {
        this.scene.dispose();
        this.scene = new Scene(this.scene.getEngine());
    }

    /**
     * Initializes Havok physics for the scene with high gravity and a fixed timestep.
     * Should be called asynchronously.
     */
    protected async addPhysic() {
        console.log("Adding physics to the scene");
        this.havokInstance = await this.getInitializedHavok();
        if (!this.havokInstance) {
            console.error("Failed to initialize Havok Physics");
            return;
        }
        // Initialize the physics plugin with higher gravity
        this.hk = new HavokPlugin(true, this.havokInstance);
        this.scene.enablePhysics(new Vector3(0, -1000, 0), this.hk);
        this.scene.getPhysicsEngine().setTimeStep(1 / App.FPS_LIMIT);

        console.log("Physics added to the scene");
    }

    /**
     * Loads and initializes the Havok WASM module.
     * @returns The initialized Havok instance.
     * @internal
     */
    private async getInitializedHavok() {
        // locates the wasm file copied during build process
        const havok = await HavokPhysics({
            locateFile: (_) => {
                return "assets/HavokPhysics.wasm"
            }
        });
        return havok;
    }
}