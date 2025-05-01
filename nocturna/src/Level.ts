import { Scene, Vector3, Color3, TransformNode, FollowCamera, Animation } from "@babylonjs/core";
import { Cube } from "./Cube";
import { ParentedPlatformFactory, Platform } from "./Platform";
import { Player } from "./Player";

import { CharacterInput } from "./types";
import { VictoryCondition } from "./victory";
import { ParentNode } from "./ParentNode";

export class Level {
    private scene: Scene;
    private player: Player;
    private activeCameraIndex: number = 0;
    private cameras: FollowCamera[] = [];
    private victoryCondition: VictoryCondition;
    private timer: number = 0;
    private score: number = 0;
    private parent: ParentNode;
    private cubeSize: number;
    private cube: Cube;

    constructor(scene: Scene, parent: ParentNode, cube: Cube, cubeSize: number) {
        this.cubeSize = cubeSize;
        this.cube = cube;
        this.scene = scene;
        this.parent = parent;
        this.initializeLevel();
    }

    private initializeLevel() {
        
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

        const factory = new ParentedPlatformFactory();
        platformConfigs.forEach(config => {
            const platformConfig = {
                ...config,
                scene: this.scene,
                parent: this.parent
            }
            factory.create(platformConfig)
        });

        // Initialize the player on top of the first platform
        const firstPlatformPosition = platformConfigs[0].position.clone();
       
        this.player = new Player(this.scene, firstPlatformPosition);

        // Create cameras
        this.cameras = [
            new FollowCamera("rightCamera", new Vector3(this.cube.mesh.position.x + this.cubeSize / 3, this.cube.mesh.position.y, this.cube.mesh.position.z), this.scene, this.player.mesh),
            new FollowCamera("topRightCamera", new Vector3(this.cube.mesh.position.x + this.cubeSize / 3, this.cube.mesh.position.y + this.cubeSize / 6, this.cube.mesh.position.z), this.scene, this.player.mesh),
        ];

        this.cameras[0].radius = 500;
        this.cameras[1].radius = 50;
        this.cameras[1].fov = 5;

        this.scene.activeCamera = this.cameras[this.activeCameraIndex];

        // ne victory condition
        this.victoryCondition = new VictoryCondition(this.scene, new Vector3(-100, 25, 0), this.parent); // Set the position of the coin to the first platform
        // this.victoryCondition.setCoinPosition(new Vector3(0, 100, 0)); // Set the coin position to the first platform
        // start a timer from 0 to infinity
        this.startTimer();
    }

    public changePov() {
        this.scene.activeCamera.detachControl();
        this.activeCameraIndex = (this.activeCameraIndex + 1) % this.cameras.length;
        this.scene.activeCamera = this.cameras[this.activeCameraIndex];
    }
    public update(dt: number, input: CharacterInput) {
        if (this.player.hasWon()) {
            return; // Prevent further updates if the game is won
        }
        /*if (input.pov) {
            this.changePov();
        }*/

        this.player.update(dt, input);
        this.parent.update();

        this.victoryCondition.checkWin(this.player, this.timer); // Check if the player has won
    }

    private startTimer() {
        this.timer = 0; // Reset the timer to 0 at the start
        const timerElement = document.getElementById("game-timer"); // Get the timer element
        timerElement.classList.remove("hidden");
        
        setInterval(() => {
            if (!this.player || !this.player.hasWon()) { 
                this.timer += 1000; // Increment the timer by 1 second
                if (timerElement) {
                    const minutes = Math.floor(this.timer / 1000 / 60);
                    const seconds = this.timer / 1000 % 60;
                    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`; // Format as MM:SS
                    timerElement.textContent = `Time: ${formattedTime}`; // Update the timer element
                }
            }
        }, 1000); // Update every second
    }
}
