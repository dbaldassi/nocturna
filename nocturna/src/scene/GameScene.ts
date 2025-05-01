
import { Engine, Vector3, HavokPlugin } from "@babylonjs/core";

import { Level } from "../Level";
import HavokPhysics from "@babylonjs/havok";
import { BaseScene } from "./BaseScene";

export class GameScene extends BaseScene {

    private havokInstance: any;
    private hk: HavokPlugin;
    private currentLevel: Level;

    constructor(engine: Engine) {
        super(engine);
    }

    static async createScene(engine: Engine) {
        const scene = new GameScene(engine);

        await scene.addPhysic();
        scene.loadLevel();

        return scene;
    }

    private async addPhysic() {
        this.havokInstance = await this.getInitializedHavok();

        // Initialize the physics plugin with higher gravity
        this.hk = new HavokPlugin(true, this.havokInstance);
        this.scene.enablePhysics(new Vector3(0, -1000, 0), this.hk);
        this.scene.getPhysicsEngine().setTimeStep(1 / 120);
    }

    private loadLevel() {
        this.currentLevel = new Level(this.scene);
    }

    public update(dt: number) {
        const input = this.inputHandler.getInput();
        this.currentLevel.update(dt, input);
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