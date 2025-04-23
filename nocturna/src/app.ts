import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, Texture, FreeCamera, FollowCamera, StandardMaterial, Color3, HavokPlugin, PhysicsAggregate, PhysicsShapeType, PhysicsMotionType, PBRMaterial, SceneLoader, TransformNode, AbstractMesh, PointLight, Animation } from "@babylonjs/core";
import { Cube } from "./Cube";

import HavokPhysics from "@babylonjs/havok";
import { Level } from "./Level";

class App {
    engine: Engine;
    scene: Scene;
    canvas: HTMLCanvasElement;
    inputStates: {};
    freeCamera: FreeCamera;
    followCamera: FollowCamera;
    // Physics engine
    havokInstance;
    hk: HavokPlugin;


    constructor() {
        // create the canvas html element and attach it to the webpage
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.id = "gameCanvas";
        document.body.appendChild(this.canvas);

        this.inputStates = {};

        // initialize babylon scene and engine
        this.engine = new Engine(this.canvas, true);
    }

    async start() {
        await this.initGame()
        this.gameLoop();
        this.endGame();
    }

    //async getInitializedHavok() {
    //return await HavokPhysics();
    //}

    private async getInitializedHavok() {
        // locates the wasm file copied during build process
        const havok = await HavokPhysics({
            locateFile: (_) => {
                return "assets/HavokPhysics.wasm"
            }
        });
        return havok;
    }

    async initGame() {
        this.havokInstance = await this.getInitializedHavok();

        this.scene = this.createScene();
    }

    endGame() {

    }

    createScene() {
        const scene = new Scene(this.engine);

        // Initialize the physics plugin with higher gravity
        this.hk = new HavokPlugin(true, this.havokInstance);
        scene.enablePhysics(new Vector3(0, -9.81, 0), this.hk);

        new Level(scene, this.canvas, this.engine);
        
        return scene;
    }

    gameLoop() {
        const divFps = document.getElementById("fps");

        // run the main render loop
        this.engine.runRenderLoop(() => {
            this.scene.render();

            divFps.innerHTML = this.engine.getFps().toFixed() + " fps";
        });

    }


}
const gameEngine = new App();
gameEngine.start();

