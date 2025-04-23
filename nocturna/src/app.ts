import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, Texture, FreeCamera, FollowCamera, StandardMaterial, Color3, HavokPlugin, PhysicsAggregate, PhysicsShapeType, PhysicsMotionType, PBRMaterial, SceneLoader, TransformNode, AbstractMesh, PointLight, Animation } from "@babylonjs/core";
import { GameScene } from "./GameScene";

class App {
    engine: Engine;
    scene: GameScene;
    canvas: HTMLCanvasElement;

    constructor() {
        // create the canvas html element and attach it to the webpage
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.id = "gameCanvas";
        document.body.appendChild(this.canvas);

        // initialize babylon scene and engine
        this.engine = new Engine(this.canvas, true);
    }

    async start() {
        this.scene = new GameScene(this.engine);
        await this.scene.initializeScene();
        this.gameLoop();
    }

    gameLoop() {
        const divFps = document.getElementById("fps");

        // run the main render loop
        this.engine.runRenderLoop(() => {
            this.scene.update(this.engine.getDeltaTime());
            this.scene.render();
            divFps.innerHTML = this.engine.getFps().toFixed() + " fps";
        });
    }


}
const gameEngine = new App();
gameEngine.start();

export {gameEngine as app};