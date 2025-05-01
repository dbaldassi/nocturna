
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, Texture, FreeCamera, FollowCamera, StandardMaterial, Color3, HavokPlugin, PhysicsAggregate, PhysicsShapeType, PhysicsMotionType, PBRMaterial, SceneLoader, TransformNode, AbstractMesh, PointLight, Animation } from "@babylonjs/core";

import { InputHandler } from "./InputHandler";
import { CharacterInput } from "./types";
import { Level } from "./Level";
import HavokPhysics from "@babylonjs/havok";

export class GameScene {
    private scene: Scene;
    private inputHandler: InputHandler;
    private havokInstance: any;
    private hk: HavokPlugin;
    private currentLevel: Level;

    constructor(engine: any, inputHandler: InputHandler) {
        this.inputHandler = inputHandler;
        this.scene = new Scene(engine);
        
    }

    public async initializeScene() {
        this.havokInstance = await this.getInitializedHavok();

        // Initialize the physics plugin with higher gravity
        this.hk = new HavokPlugin(true, this.havokInstance);
        this.scene.enablePhysics(new Vector3(0, -1000, 0), this.hk);
        this.scene.getPhysicsEngine().setTimeStep(1 / 120);

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

    public render() {
        this.scene.render();
    }
}