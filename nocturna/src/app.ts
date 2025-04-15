import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, Texture, FreeCamera, FollowCamera, StandardMaterial, Color3, HavokPlugin, PhysicsAggregate, PhysicsShapeType, PhysicsMotionType, PBRMaterial, SceneLoader, TransformNode, AbstractMesh, PointLight, Animation } from "@babylonjs/core";
import { Cube } from "./Cube";

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

        console.log("Scene created");
        window.addEventListener("keydown", (event) => {
            if (isAnimating) return; // Ignore key presses while an animation is running

            const cubeParent = (scene as any).cubeParent;
            console.log(cubeParent);
            if (!cubeParent) return;
            console.log("Key pressed: " + event.key);
            if (event.key === "Z" || event.key === "z") {
                isAnimating = true;
                console.log("Z pressed");
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

        // Initialize the physics plugin with higher gravity
        const hk = new HavokPlugin(true, this.havokInstance);
        scene.enablePhysics(new Vector3(0, -100, 0), hk); // Increased gravity

        // Create a cube using the Cube class
        const parentCube = new Cube(scene, 1000); // Increase the cube size

        parentCube.position.x = 0;
        parentCube.position.y = 500; // Adjust position to match the larger size
        parentCube.position.z = 0;

        // Attach parentCube to the scene for global access
        (scene as any).cubeParent = parentCube;

        // Replace HemisphericLight with PointLight at the center of the cube
        const pointLight = new PointLight("pointLight", parentCube.position, scene);
        pointLight.intensity = 0.5; // Adjust intensity to reduce overexposure

        // Define cameras pointing at each face of the cube
        const cameras = [
        ];

        // Define cameras pointing at each angle of the cube
        cameras.push(
            new FreeCamera("frontCamera", new Vector3(0, 500, -500), scene), // Front
            new FreeCamera("topFrontCamera", new Vector3(0, 750, -250), scene),  // Top Front Right
            new FreeCamera("topCamera", new Vector3(0, 1000, 0), scene),    // Top
            new FreeCamera("topBackRightCamera", new Vector3(0, 750, 250), scene),    // Top Back Right
            new FreeCamera("backCamera", new Vector3(0, 500, 500), scene),  // Back
            new FreeCamera("bottomBackLeftCamera", new Vector3(0, 250, 250), scene),   // Bottom Back Left
            new FreeCamera("bottomCamera", new Vector3(0, 0, 0), scene),     // Bottom
            new FreeCamera("bottomFrontLeftCamera", new Vector3(0, 250, -250), scene), // Bottom Front Left
        );

        // Set all cameras to target the parentCube
        cameras.forEach(camera => {
            camera.setTarget(parentCube.position);
            camera.inputs.clear(); // Disable camera movement
        });

        // Set the default active camera
        let activeCameraIndex = 0;
        scene.activeCamera = cameras[activeCameraIndex];
        scene.activeCamera.attachControl(this.canvas, true);

        // Add camera switching logic
        window.addEventListener("keydown", (event) => {
            if (event.key === "p" || event.key === "P") {
                // Switch to the next camera
                scene.activeCamera.detachControl();
                activeCameraIndex = (activeCameraIndex + 1) % cameras.length;
                scene.activeCamera = cameras[activeCameraIndex];
                scene.activeCamera.attachControl(this.canvas, true);
            } else if (event.key === "o" || event.key === "O") {
                // Switch to the previous camera
                scene.activeCamera.detachControl();
                activeCameraIndex = (activeCameraIndex - 1 + cameras.length) % cameras.length;
                scene.activeCamera = cameras[activeCameraIndex];
                scene.activeCamera.attachControl(this.canvas, true);
            }
        });

        // Create a player represented by a smaller sphere
        const player = MeshBuilder.CreateSphere("player", { diameter: 20 }, this.scene); // Reduced size
        player.position = new Vector3(0, 600, 0); // Position the player above the cube
        player.material = new StandardMaterial("playerMaterial", this.scene);
        (player.material as StandardMaterial).diffuseColor = Color3.Blue()

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

