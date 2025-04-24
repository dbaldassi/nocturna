import { Scene, Vector3, Color3, TransformNode, FollowCamera, Animation } from "@babylonjs/core";
import { Cube } from "./Cube";
import { Platform } from "./Platform";
import { Player } from "./Player";

import { app } from "./app";
import { CharacterInput } from "./types";

export class Level {
    private scene: Scene;
    private cube: Cube;
    private cubeSize: number;
    private player: Player;
    private platforms: Platform[] = [];
    private activeCameraIndex: number = 0;
    private cameras: FollowCamera[] = [];
    private parent: TransformNode;
    private isAnimating: boolean = false;

    constructor(scene: Scene, cubeSize: number = 3000) {
        this.scene = scene;
        this.cubeSize = cubeSize;
        this.initializeLevel();
    }

    private initializeLevel() {

        // Create the main cube
        this.cube = new Cube(this.scene, this.cubeSize);
        this.cube.mesh.position = new Vector3(0, this.cubeSize / 2, 0);

        // Create a parent transform node for the cube
        this.parent = new TransformNode("parent", this.scene);
        this.parent.position = new Vector3(0, 0, 0);

        const platformConfigs = [
            { size: new Vector3(50, 5, 50), position: new Vector3(0, 100, 0), color: new Color3(0.5, 0.5, 0.5), rotation: new Vector3(0, 0, 0) },
            // { size: new Vector3(50, 5, 50), position: new Vector3(0, 20, 30), color: new Color3(0.3, 0.7, 0.3), rotation: new Vector3(Math.PI / 2, 0, 0) },
            { size: new Vector3(50, 5, 50), position: new Vector3(-50, 25, 0), color: new Color3(0.7, 0.3, 0.3), rotation: new Vector3(0, 0, 0) },
            { size: new Vector3(50, 5, 50), position: new Vector3(110, 20, 0), color: new Color3(0.3, 0.3, 0.7), rotation: new Vector3(0, 0, Math.PI / 2) },
            { size: new Vector3(50, 5, 50), position: new Vector3(-100, 30, 0), color: new Color3(0.7, 0.7, 0.3), rotation: new Vector3(0, 0, 0) },
            { size: new Vector3(50, 5, 50), position: new Vector3(150, 60, 0), color: new Color3(0.3, 0.7, 0.7), rotation: new Vector3(0, 0, Math.PI / 2) },
            { size: new Vector3(50, 5, 50), position: new Vector3(-150, 35, 0), color: new Color3(0.7, 0.3, 0.7), rotation: new Vector3(0, 0, 0) },
            { size: new Vector3(50, 5, 50), position: new Vector3(200, 80, 0), color: new Color3(0.5, 0.5, 0.5), rotation: new Vector3(0, 0, Math.PI / 2) },
            { size: new Vector3(50, 5, 50), position: new Vector3(-200, 40, 0), color: new Color3(0.3, 0.7, 0.3), rotation: new Vector3(0, 0, 0) },
            { size: new Vector3(50, 5, 50), position: new Vector3(250, 100, 0), color: new Color3(0.7, 0.3, 0.3), rotation: new Vector3(0, 0, Math.PI / 2) },
        ];

        platformConfigs.forEach(config => {
            this.createPlatform(config.size, config.position, config.color, config.rotation);
        });

        // Initialize the player on top of the first platform
        const firstPlatformPosition = platformConfigs[0].position.clone();
        // const cubePosition = this.cube.position.clone();
        // const playerPosition = new Vector3(cubePosition.x + firstPlatformPosition.x, cubePosition.y + firstPlatformPosition.y, cubePosition.z + firstPlatformPosition.z);
        this.player = new Player(this.scene, firstPlatformPosition);

        // Create cameras
        this.cameras = [
            new FollowCamera("rightCamera", new Vector3(this.cube.mesh.position.x + this.cubeSize / 3, this.cube.mesh.position.y, this.cube.mesh.position.z), this.scene, this.player.mesh),
            new FollowCamera("topRightCamera", new Vector3(this.cube.mesh.position.x + this.cubeSize / 3, this.cube.mesh.position.y + this.cubeSize / 6, this.cube.mesh.position.z), this.scene, this.player.mesh),
        ];

        /*this.cameras.forEach(camera => {
            camera.radius = 500;
        });*/
        this.cameras[0].radius = 500;
        this.cameras[1].radius = 50;
        this.cameras[1].fov = 5;

        this.scene.activeCamera = this.cameras[this.activeCameraIndex];
        this.scene.activeCamera.attachControl(app.canvas, true);

    }

    private createPlatform(size: Vector3, position: Vector3, color: Color3, rotation: Vector3) {
        const platform = new Platform(this.scene, size, position, rotation, color, this.parent);
        this.platforms.push(platform);
    }

    public getCube(): Cube {
        return this.cube;
    }

    public changePov() {
        this.scene.activeCamera.detachControl();
        this.activeCameraIndex = (this.activeCameraIndex + 1) % this.cameras.length;
        this.scene.activeCamera = this.cameras[this.activeCameraIndex];
        this.scene.activeCamera.attachControl(app.canvas, true);
    }



    private updatePlatformPhysics() {
        this.platforms.forEach(platform => {
            // platform.getMesh().physicsBody.setTargetTransform(platform.mesh.getAbsolutePosition(), platform.mesh.rotationQuaternion);
            platform.recreatePhysicsBody();
        });
    }


    private animateRotation(axis: "x" | "y" | "z", angle: number, duration: number = 500) {
        if (this.isAnimating) {
            return; // Prevent starting a new animation while one is already running
        }
    
        this.isAnimating = true; // Set isAnimating to true when animation starts
    
        const fps = this.scene.getEngine().getFps(); // Get the current FPS
    
        const animation = new Animation(
            `rotate_${axis}`,
            `rotation.${axis}`,
            fps, // Frames per second
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
    
        const currentRotation = this.parent.rotation[axis];
        const keys = [
            { frame: 0, value: currentRotation },
            { frame: duration / 16.67, value: currentRotation + angle }, // Convert duration to frames
        ];
    
        animation.setKeys(keys);
        this.parent.animations = [animation];
    
        this.scene.beginAnimation(this.parent, 0, duration / 16.67, false, 1, () => {
            this.isAnimating = false; // Set isAnimating to false when animation completes
            this.updatePlatformPhysics(); // Update physics after animation completes
        });
    }
    
    public update(dt: number, input: CharacterInput) {
        if (input.pov) {
            this.changePov();
        }
    
        this.player.update(dt, input);
    
        // Animate transform node rotation
        if (input.rotate_left_y) {
            this.animateRotation("y", Math.PI / 2);
        } else if (input.rotate_right_y) {
            this.animateRotation("y", -Math.PI / 2);
        } else if (input.rotate_left_x) {
            this.animateRotation("x", Math.PI / 2);
        } else if (input.rotate_right_x) {
            this.animateRotation("x", -Math.PI / 2);
        } else if (input.rotate_left_z) {
            this.animateRotation("z", Math.PI / 2);
        } else if (input.rotate_right_z) {
            this.animateRotation("z", -Math.PI / 2);
        }
    }
}
