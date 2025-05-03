
import { Engine, Vector3, HavokPlugin } from "@babylonjs/core";

import { Level } from "../Level";
import HavokPhysics from "@babylonjs/havok";
import { BaseScene } from "./BaseScene";
import { Cube } from "../Cube";
import { ParentNode } from "../ParentNode";
import { InputHandler } from "../InputHandler";

const CUBE_SIZE = 3000;

export class GameScene extends BaseScene {

    private havokInstance: any;
    private hk: HavokPlugin;
    private currentLevel: Level;
    private cube: Cube;
    private parent: ParentNode;

    constructor(engine: Engine, inputHandler: InputHandler) {
        super(engine, inputHandler);
    }

    static async createScene(engine: Engine, inputHandler: InputHandler): Promise<BaseScene> {
        const scene = new GameScene(engine, inputHandler);

        await scene.addPhysic();

        // Create the main cube
        scene.cube = Cube.create(scene.scene);
        // Create the parent node
        scene.parent = new ParentNode(Vector3.Zero(), scene.scene);
        scene.parent.setupKeyActions(scene.inputHandler);

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
        this.currentLevel = new Level(this.scene, this.parent, this.cube, CUBE_SIZE);
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