import { Scene, Vector3, Color3, PointLight, FreeCamera, MeshBuilder, StandardMaterial } from "@babylonjs/core";
import { Cube } from "./Cube";
import { Platform } from "./Platform";
import { Player } from "./Player";

export class Level {
    private scene: Scene;
    private cube: Cube;
    private cubeSize: number;
    private canvas: HTMLCanvasElement;
    private player: Player;
    private engine: any;
    private platforms: Platform[] = [];

    constructor(scene: Scene, canvas: HTMLCanvasElement, engine: any, cubeSize: number = 3000) {
        this.scene = scene;
        this.canvas = canvas;
        this.cubeSize = cubeSize;
        this.engine = engine;
        this.initializeLevel();
    }

    private initializeLevel() {

        // Create the main cube
        this.cube = new Cube(this.scene, this.cubeSize, this.engine);
        this.cube.mesh.position = new Vector3(0, this.cubeSize / 2, 0);

        // Create cameras
        const cameras = [
            new FreeCamera("rightCamera", new Vector3(this.cube.mesh.position.x + this.cubeSize / 3, this.cube.mesh.position.y, this.cube.mesh.position.z), this.scene),
            new FreeCamera("topRightCamera", new Vector3(this.cube.mesh.position.x + this.cubeSize / 3, this.cube.mesh.position.y + this.cubeSize / 6, this.cube.mesh.position.z), this.scene),
        ];

        cameras.forEach(camera => {
            camera.setTarget(this.cube.mesh.position);
            camera.inputs.clear(); // Disable camera movement
        });

        // Set the default active camera
        let activeCameraIndex = 0;
        this.scene.activeCamera = cameras[activeCameraIndex];
        this.scene.activeCamera.attachControl(this.canvas, true);

        window.addEventListener("keydown", (event) => {
            if (event.key === "p" || event.key === "P") {
                // Switch to the next camera
                this.scene.activeCamera.detachControl();
                activeCameraIndex = (activeCameraIndex + 1) % cameras.length;
                this.scene.activeCamera = cameras[activeCameraIndex];
                this.scene.activeCamera.attachControl(this.canvas, true);
            }
        });

        const platformConfigs = [
            { size: new Vector3(50, 5, 50), position: new Vector3(0, 10, 0), color: new Color3(0.5, 0.5, 0.5), rotation: new Vector3(0, 0, 0)},
            // { size: new Vector3(50, 5, 50), position: new Vector3(0, 20, 30), color: new Color3(0.3, 0.7, 0.3), rotation: new Vector3(Math.PI / 2, 0, 0) },
            { size: new Vector3(50, 5, 50), position: new Vector3(0, 30, -50), color: new Color3(0.7, 0.3, 0.3), rotation: new Vector3(0, 0, 0) },
            { size: new Vector3(50, 5, 50), position: new Vector3(0, 40, 100), color: new Color3(0.3, 0.3, 0.7), rotation: new Vector3(Math.PI / 2, 0, 0) },
            { size: new Vector3(50, 5, 50), position: new Vector3(0, 50, -100), color: new Color3(0.7, 0.7, 0.3), rotation: new Vector3(0, 0, 0) },
            { size: new Vector3(50, 5, 50), position: new Vector3(0, 60, 150), color: new Color3(0.3, 0.7, 0.7), rotation: new Vector3(Math.PI / 2, 0, 0) },
            { size: new Vector3(50, 5, 50), position: new Vector3(0, 70, -150), color: new Color3(0.7, 0.3, 0.7), rotation: new Vector3(0, 0, 0) },
            { size: new Vector3(50, 5, 50), position: new Vector3(0, 80, 200), color: new Color3(0.5, 0.5, 0.5), rotation: new Vector3(Math.PI / 2, 0, 0) },
            { size: new Vector3(50, 5, 50), position: new Vector3(0, 90, -200), color: new Color3(0.3, 0.7, 0.3), rotation: new Vector3(0, 0, 0) },
            { size: new Vector3(50, 5, 50), position: new Vector3(0, 200, 250), color: new Color3(0.7, 0.3, 0.3), rotation: new Vector3(Math.PI / 2, 0, 0) },
        ];

        platformConfigs.forEach(config => {
            this.createPlatform(config.size, config.position, config.color, config.rotation);
        });

        // Initialize the player on top of the first platform
        const firstPlatformPosition = platformConfigs[0].position.clone();
        // const cubePosition = this.cube.position.clone();
        // const playerPosition = new Vector3(cubePosition.x + firstPlatformPosition.x, cubePosition.y + firstPlatformPosition.y, cubePosition.z + firstPlatformPosition.z);
        this.player = new Player(this.scene, firstPlatformPosition, this.cube);
    }

    private createPlatform(size: Vector3, position: Vector3, color: Color3, rotation: Vector3) {
        const platform = new Platform(this.scene, size, position, rotation, color, this.cube);
        this.platforms.push(platform);
    }

    public getCube(): Cube {
        return this.cube;
    }
}
