
import { Engine, Vector3, HavokPlugin, FollowCamera, MergeMeshesOptimization } from "@babylonjs/core";

import { Level } from "../Level";
import HavokPhysics from "@babylonjs/havok";
import { BaseScene } from "./BaseScene";
import { Cube } from "../Cube";
import { ParentNode } from "../ParentNode";
import { InputHandler } from "../InputHandler";
import { Player } from "../GameObjects/Player";
import { GameObject, GameObjectFactory, GameObjectVisitor, GameObjectConfig } from "../types";
import { LevelLoaderObserver, LevelLoader, AbstractFactory } from "../LevelLoader";
import { VictoryCondition } from "../GameObjects/victory";
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
    private won: boolean = false;
    private lost: boolean = false;

    constructor(engine: Engine, inputHandler: InputHandler) {
        super(engine, inputHandler);
        this.levelLoader = new LevelLoader(this.scene, this, 
            { create: (factory: GameObjectFactory, config: GameObjectConfig) => factory.create(config) } );
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
        scene.scene.debugLayer.show({
            overlay: true,
            embedMode: true,
            showExplorer: true,
            showInspector: true,
            enablePopup: true,
        })


        return scene;
    }

    private async addPhysic() {
        this.havokInstance = await this.getInitializedHavok();

        // Initialize the physics plugin with higher gravity
        this.hk = new HavokPlugin(true, this.havokInstance);
        this.scene.enablePhysics(new Vector3(0, -1000, 0), this.hk);
        this.scene.getPhysicsEngine().setTimeStep(1 / 120);
        // this.hk.setDebugMode(true);
        // this.hk.setCollisionCallbackEnabled(true);

        /*const observable = this.hk.onCollisionObservable;
        observable.add((collision) => {
            const { bodyA, bodyB } = collision;
            console.log(`Collision detected between ${bodyA.name} and ${bodyB.name}`);
        });*/
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
    }
    public onParent(parent: ParentNode): void {
        this.parent = parent;
        this.parent.setupKeyActions(this.inputHandler);
    }
    public onLevelLoaded(): void {
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
        // this.scene.activeCamera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);

        this.gameObjects.forEach((object) => {
            const mesh = object.getMesh();
            
            if (mesh.physicsBody) {
                mesh.physicsBody.setCollisionCallbackEnabled(true);
                mesh.physicsBody.getCollisionObservable().add((collider) => {
                    // console.log(`Collision detected with ??`);
                    if (collider.collidedAgainst === this.player.mesh.physicsBody) {
                        // console.log(`Collision detected with ${mesh.name}`);
                        object.accept(this);
                    }
                });

            }
        });
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
            console.log(this.won, this.lost);
            if (!this.won && !this.lost) { 
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
    }

    public visitVictory(portal: VictoryCondition): void {
        this.won = true;
        portal.displayWin(this.score, this.timer);
        this.scene.getPhysicsEngine().dispose();
    }

    public update(dt: number) {
        if (!this.started || this.won || this.lost) {
            return; // Prevent further updates if the game is not started
        }

        const input = this.inputHandler.getInput();
        // this.currentLevel.update(dt, input);
        this.gameObjects.forEach((object) => {
            object.update(dt, input);
        });
        this.player.update(dt, input);
        if(this.loseCondition.checkLoose(this.timer)) {
            this.lost = true;
            this.scene.getPhysicsEngine().dispose();
            this.loseCondition.triggerLose(this.score, this.timer);
        }
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