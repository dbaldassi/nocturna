import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, Texture, FreeCamera, FollowCamera, StandardMaterial, Color3, HavokPlugin, PhysicsAggregate, PhysicsShapeType, PhysicsMotionType, PBRMaterial, SceneLoader, TransformNode, AbstractMesh } from "@babylonjs/core";
import { Cube } from "./Cube";
import { Animation } from "@babylonjs/core";

import HavokPhysics from "@babylonjs/havok";

class App {
    engine: Engine;
    scene: Scene;
    canvas: HTMLCanvasElement;
    inputStates: {};
    freeCamera: FreeCamera;
    followCamera: FollowCamera;
    // Physics engine
    havokInstance;


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

        this.modifySettings(this.scene, this.inputStates);
    }

    modifySettings(scene: Scene, inputStates: {}) {
        let isAnimating = false; // Flag to track if an animation is running

        window.addEventListener("keydown", (event) => {
            if (isAnimating) return; // Ignore key presses while an animation is running

            const cubeParent = (scene as any).cubeParent;
            if (!cubeParent) return;

            if (event.key === "Z" || event.key === "z") {
                isAnimating = true;
                this.animateRotation(cubeParent, "rotation.x", cubeParent.rotation.x, cubeParent.rotation.x + Math.PI / 2, 1000, () => {
                    isAnimating = false;
                });
            } else if (event.key === "S" || event.key === "s") {
                isAnimating = true;
                this.animateRotation(cubeParent, "rotation.x", cubeParent.rotation.x, cubeParent.rotation.x - Math.PI / 2, 1000, () => {
                    isAnimating = false; // Re-enable keybindings after animation
                });
            } else if (event.key === "Q" || event.key === "q") {
                isAnimating = true;
                this.animateRotation(cubeParent, "rotation.y", cubeParent.rotation.y, cubeParent.rotation.y + Math.PI / 2, 1000, () => {
                    isAnimating = false;
                });
            } else if (event.key === "D" || event.key === "d") {
                isAnimating = true;
                this.animateRotation(cubeParent, "rotation.y", cubeParent.rotation.y, cubeParent.rotation.y - Math.PI / 2, 1000, () => {
                    isAnimating = false;
                });
            }
        });
    }

    animateRotation(target: TransformNode, property: string, from: number, to: number, duration: number, onComplete: () => void) {
        const animation = new Animation(
            "cubeRotationAnimation",
            property,
            60, // Frames per second
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        const keys = [
            { frame: 0, value: from },
            { frame: 60, value: to }, // 60 frames for the animation
        ];

        animation.setKeys(keys);

        // Attach the animation to the target
        target.animations = [];
        target.animations.push(animation);

        // Start the animation and call `onComplete` when it finishes
        this.scene.beginAnimation(target, 0, 60, false, duration / 1000, onComplete);
    }

    endGame() {

    }

    createScene() {
        const scene = new Scene(this.engine);

        // Initialize the physics plugin
        const hk = new HavokPlugin(true, this.havokInstance);
        scene.enablePhysics(new Vector3(0, -9.81, 0), hk);

        // Create a cube using the Cube class
        const parentCube = new TransformNode("parentCube", scene);
        const cube = new Cube(scene, 20, parentCube);

        parentCube.position.y = 10;
        parentCube.position.x = 0;
        parentCube.position.z = 0;

        const light = new HemisphericLight("light", new Vector3(0, 10, 0), scene);

        // Place the camera inside the parentCube and aim at its center
        const fixedCamera = new FreeCamera("FixedCamera", new Vector3(0, 10, 10), scene);
        fixedCamera.setTarget(parentCube.position);

        // Disable user controls to make the camera fixed
        fixedCamera.detachControl();

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

