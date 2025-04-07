import { Engine, Scene, Vector3, FollowCamera } from "@babylonjs/core";
import { MainScene } from "./MainScene";

class App {
    engine: Engine;
    scene: MainScene;
    canvas: HTMLCanvasElement;

    constructor() {
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "80%";
        this.canvas.style.height = "80%";
        this.canvas.style.display = "block";
        this.canvas.id = "gameCanvas";
        document.body.appendChild(this.canvas);

        this.engine = new Engine(this.canvas, true);
    }

    async start() {
        this.scene = new MainScene(this.engine);
        this.gameLoop();
    }

    gameLoop() {
        this.engine.runRenderLoop(() => {
            let deltaTime = this.engine.getDeltaTime();
            // console.log("Delta Time: ", deltaTime);
            this.scene.update(deltaTime);
            this.scene.render();
        });
    }
}

const gameEngine = new App();
gameEngine.start();