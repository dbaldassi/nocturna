
import { Engine, Vector3, HavokPlugin, FollowCamera } from "@babylonjs/core";

import { Level } from "../Level";
import HavokPhysics from "@babylonjs/havok";
import { BaseScene } from "./BaseScene";
import { Cube } from "../Cube";
import { ParentNode } from "../ParentNode";
import { InputHandler } from "../InputHandler";
import { Player } from "../Player";
import { GameObject, GameObjectVisitor } from "../types";
import { LevelLoaderObserver, LevelLoader } from "../LevelLoader";
import { VictoryCondition } from "../victory";
import { LooseCondition } from "../loose";

const CUBE_SIZE = 3000;

export class GameScene extends BaseScene implements LevelLoaderObserver, GameObjectVisitor {

    private havokInstance: any;
    private hk: HavokPlugin;
    private currentLevel: Level;
    private cube: Cube;
    private parent: ParentNode;
    private player: Player;
    private gameObjects: GameObject[] = [];
    private levelLoader: LevelLoader;
    private timer: number = 0;
    private score: number = 0;
    private cameras: FollowCamera[] = [];
    private activeCameraIndex: number = 0;
    private loseCondition: LooseCondition; // Replace with the actual type if available
    private started: boolean = false;

    constructor(engine: Engine, inputHandler: InputHandler) {
        super(engine, inputHandler);
        this.levelLoader = new LevelLoader(this.scene, this);
    }

    static async createScene(engine: Engine, inputHandler: InputHandler): Promise<BaseScene> {
        const scene = new GameScene(engine, inputHandler);

        await scene.addPhysic();

        // // Create the main cube
        // scene.cube = Cube.create(scene.scene);
        // // Create the parent node
        // scene.parent = new ParentNode(Vector3.Zero(), scene.scene);
        // scene.parent.setupKeyActions(scene.inputHandler);

        scene.loadLevel("scene");

        return scene;
    }

    private async addPhysic() {
        this.havokInstance = await this.getInitializedHavok();

        // Initialize the physics plugin with higher gravity
        this.hk = new HavokPlugin(true, this.havokInstance);
        this.scene.enablePhysics(new Vector3(0, -1000, 0), this.hk);
        this.scene.getPhysicsEngine().setTimeStep(1 / 120);
    }

    private loadLevel(file: string) {
        // this.currentLevel = new Level(this.scene, this.parent, this.cube, CUBE_SIZE);
        this.levelLoader.loadLevel(file);
    }

    public onCube(cube: Cube): void {
        this.cube = cube;
    }
    public onPlayer(player: Player): void {
        this.player = player;
        // Create cameras
        this.cameras = [
            new FollowCamera("rightCamera", this.player.mesh.position, this.scene, this.player.mesh),
            new FollowCamera("topRightCamera", this.player.mesh.position, this.scene, this.player.mesh),
        ];

        this.cameras[0].radius = -500;
        // this.cameras[0].position = Vector3.Zero();
        // this.cameras[0].lockedTarget = undefined;
        this.cameras[1].radius = 50;
        this.cameras[1].fov = 5;
        
        this.scene.activeCamera = this.cameras[this.activeCameraIndex];
        this.scene.activeCamera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
    }
    public onParent(parent: ParentNode): void {
        this.parent = parent;
        this.parent.setupKeyActions(this.inputHandler);
    }
    public onLevelLoaded(): void {
        // start a timer from 0 to infinity
        this.startTimer();
        this.loseCondition = new LooseCondition(this.player, this.scene); // Initialize the lose condition

        this.started = true;
    }

    private startTimer() {
        this.timer = 0; // Reset the timer to 0 at the start
        const timerElement = document.getElementById("game-timer"); // Get the timer element
        timerElement.classList.remove("hidden");
        
        setInterval(() => {
            if (!this.player || !this.player.hasWon() || !this.player.hasLost()) { 
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

    public onObjectCreated(object: GameObject): void {
        this.gameObjects.push(object);
        const mesh = object.getMesh();

        // if (mesh.physicsBody) {
            mesh.onCollideObservable.add((collider) => {
                if (collider === this.player.getMesh()) {
                    console.log(`Collision detected with ${mesh.name}`);
                    object.accept(this);
                }
            });
        // }
    }

    public visitVictory(portal: VictoryCondition): void {
        portal.displayWin(this.score, this.timer);
    }

    public update(dt: number) {
        if (!this.started) {
            return; // Prevent further updates if the game is not started
        }

        const input = this.inputHandler.getInput();
        // this.currentLevel.update(dt, input);
        this.gameObjects.forEach((object) => {
            object.update(dt, input);
        });
        this.player.update(dt, input);
        this.loseCondition.checkLoose(this.timer); // Check if the player has lost
    }

    public render(): void {
        if(this.started) super.render();
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