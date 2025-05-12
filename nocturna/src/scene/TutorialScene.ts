import { Engine, Vector3, FreeCamera, MeshBuilder, StandardMaterial, Color3, DirectionalLight, FollowCamera } from "@babylonjs/core";
import { BaseScene } from "./BaseScene";
import { InputHandler } from "../InputHandler";
import { LevelLoader, LevelLoaderObserver } from "../LevelLoader";
import { ParentNode } from "../ParentNode"; // Ensure correct ParentNode type is imported
import { GameObject, GameObjectConfig, GameObjectFactory, GameObjectVisitor } from "../types";
import { Player } from "../GameObjects/Player";
import { Cube } from "../Cube";
import { VictoryCondition } from "../GameObjects/Victory";

export class TutorialScene extends BaseScene implements LevelLoaderObserver, GameObjectVisitor {
    private stepIndex: number = 0;
    private steps: (() => void)[] = [];
    private levelLoader: LevelLoader;
    private player: Player;
    private camera: FollowCamera;
    private cube: Cube;
    private gameObjects: GameObject[] = [];
    private started: boolean = false;
    private parent: ParentNode;

    constructor(engine: Engine, inputHandler: InputHandler) {
        super(engine, inputHandler);
        this.levelLoader = new LevelLoader(this.scene, this,
            { create: (factory: GameObjectFactory, config: GameObjectConfig) => factory.create(config) });


        // Define tutorial steps
        // this.steps = [
        //     this.showMovementInstructions.bind(this),
        //     this.showJumpInstructions.bind(this),
        //     this.showObjectiveInstructions.bind(this),
        // ];
    }

    public visitVictory(_: VictoryCondition): void {
        console.log("Victory condition reached!");
        this.endTutorial();
    }

    public static async createScene(engine: Engine, inputHandler: InputHandler): Promise<TutorialScene> {
        const scene = new TutorialScene(engine, inputHandler);
        await scene.addPhysic();
        scene.loadLevel("tutorial.json");
        return scene;
    }

    private loadLevel(file: string) {
        this.levelLoader.loadLevel(file);
    }

    public startTutorial(): void {
        this.stepIndex = 0;
        this.steps[this.stepIndex]();
    }

    private showMovementInstructions(): void {
        console.log("Step 1: Use arrow keys or WASD to move.");
        // Add visual indicators or text on the screen
        this.inputHandler.addAction("next", () => this.nextStep());
    }

    private showJumpInstructions(): void {
        console.log("Step 2: Press Space to jump.");
        this.inputHandler.addAction("next", () => this.nextStep());
    }

    private showObjectiveInstructions(): void {
        console.log("Step 3: Reach the victory condition to complete the level.");
        this.inputHandler.addAction("next", () => this.endTutorial());
    }

    private nextStep(): void {
        this.stepIndex++;
        if (this.stepIndex < this.steps.length) {
            this.steps[this.stepIndex]();
        }
    }

    private endTutorial(): void {
        console.log("Tutorial completed!");
        // Transition to the main game scene
    }

    public onCube(cube: Cube): void {
        this.cube = cube;
    }

    public onPlayer(player: Player): void {
        this.player = player;
        this.camera = new FollowCamera("Camera", this.player.getMesh().position, this.scene, this.player.getMesh());
        this.camera.radius = -500;
        this.scene.activeCamera = this.camera;
    }
    public onParent(parent: ParentNode): void {
        this.parent = parent;
        this.parent.setupKeyActions(this.inputHandler);
    }

    public onLevelLoaded(): void {
        // start a timer from 0 to infinity
        // this.startTimer();
        // this.loseCondition = new LooseCondition(this.player, this.scene); // Initialize the lose condition

        this.started = true;
    }

    public onObjectCreated(object: GameObject): void {
        this.gameObjects.push(object);
        const mesh = object.getMesh();

        if (mesh.physicsBody) {
            mesh.physicsBody.getCollisionObservable().add((collider) => {
                console.log(`Collision detected with ??`);
                if (collider.collidedAgainst === this.player.getMesh().physicsBody) {
                    console.log(`Collision detected with ${mesh.name}`);
                    object.accept(this);
                }
            });

        }
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
        // this.loseCondition.checkLoose(this.timer); // Check if the player has lost
    }

    public render(): void {
        if (this.started) super.render();
    }
}