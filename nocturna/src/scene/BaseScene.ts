
import { Engine, Scene, HavokPlugin, Vector3 } from "@babylonjs/core";

import { InputHandler } from "../InputHandler";
import HavokPhysics from "@babylonjs/havok";

export abstract class BaseScene {
    protected scene: Scene;
    protected engine: Engine;
    protected inputHandler: InputHandler;
    private havokInstance: any;
    private hk: HavokPlugin;

    constructor(engine: any, inputHandler: InputHandler) {
        this.inputHandler = inputHandler;
        this.scene = new Scene(engine);
        this.engine = engine;
    }

    public abstract update(dt: number) : void;

    public render() {
        this.scene.render();
    }

    public enableDebug() {
        this.scene.debugLayer.show({
            overlay: true,
            embedMode: true,
            showExplorer: true,
            showInspector: true,
            enablePopup: true,
        })
    }

    public restart() {
        this.scene.dispose();
        this.scene = new Scene(this.scene.getEngine());
    }

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
            this.scene.getPhysicsEngine().setTimeStep(1 / 120);
    
            console.log("Physics added to the scene");
    }

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