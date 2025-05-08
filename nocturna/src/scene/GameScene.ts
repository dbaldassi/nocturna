
import { Engine, Vector3, HavokPlugin, FollowCamera, Scene } from "@babylonjs/core";

import { Level } from "../Level";
import HavokPhysics from "@babylonjs/havok";
import { BaseScene } from "./BaseScene";
import { Cube } from "../Cube";
import { ParentNode } from "../ParentNode";
import { InputHandler } from "../InputHandler";
import { Player } from "../GameObjects/Player";
import { GameObject, GameObjectFactory, GameObjectVisitor, GameObjectConfig, AbstractState, CharacterInput } from "../types";
import { LevelLoaderObserver, LevelLoader, AbstractFactory } from "../LevelLoader";
import { VictoryCondition } from "../GameObjects/Victory";
import { LooseCondition } from "../Loose";

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
    private state : AbstractGameSceneState;

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

        scene.state = new LoadingState(scene);
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
    }
    public onParent(parent: ParentNode): void {
        this.parent = parent;
        this.parent.setupKeyActions(this.inputHandler);
    }
    public onLevelLoaded(): void {
        this.setupCamera();
        this.setupCollisions();
        // start a timer from 0 to infinity
        this.startTimer();
        this.loseCondition = new LooseCondition(this.player, this.scene); // Initialize the lose condition

        this.state.exit();
        this.state = new InGameState(this);
        this.state.enter();
    }

    private setupCollisions() {
        this.gameObjects.forEach((object) => {
            const mesh = object.getMesh();

            if (mesh.physicsBody) {
                mesh.physicsBody.getCollisionObservable().add((collider) => {
                    console.log(`Collision detected with ??`);
                    if (collider.collidedAgainst === this.player.mesh.physicsBody) {
                        console.log(`Collision detected with ${mesh.name}`);
                        object.accept(this);
                    }
                });
            }
        });
    }

    private setupCamera() {
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

    private startTimer() {
        this.timer = 0; // Reset the timer to 0 at the start
        const timerElement = document.getElementById("game-timer"); // Get the timer element
        timerElement.classList.remove("hidden");
    }

    public onObjectCreated(object: GameObject): void {
        this.gameObjects.push(object);
    }

    public visitVictory(portal: VictoryCondition): void {
        this.setEndState(portal);
    }

    public checkLoose() {
        if(this.loseCondition.checkLoose(this.timer)) {
            this.setEndState(this.loseCondition);
        }
    }

    private setEndState(condition: VictoryCondition | LooseCondition) {
        this.state.exit();
        this.state = new EndState(this, condition, this.score, this.timer);
        this.state.enter();
    }

    public updateObjects(dt: number, input: CharacterInput) {
        this.gameObjects.forEach((object) => {
            object.update(dt, input);
        });
        this.player.update(dt, input);
    }

    public updateTimer(dt: number) {
        const timerElement = document.getElementById("game-timer");
        this.timer += dt; // Increment the timer by delta time
        if (timerElement) {
            const minutes = Math.floor(this.timer / 1000 / 60);
            const seconds = this.timer / 1000 % 60;
            const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`; // Format as MM:SS
            timerElement.textContent = `Time: ${formattedTime}`; // Update the timer element
        }
    }

    public update(dt: number) {
        const input = this.inputHandler.getInput();
        // this.currentLevel.update(dt, input);
        const newState = this.state.update(dt, input);
        if(newState) {
            this.state.exit();
            this.state = newState;
            this.state.enter();
        }
    }

    public render(): void {
        this.state.render();
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

    public getScene() : Scene {
        return this.scene;
    }
}

// ------------------------------------------------
// -------------------- STATES --------------------
// ------------------------------------------------

abstract class AbstractGameSceneState {
    protected gameScene: GameScene;

    constructor(gameScene: GameScene) {
        this.gameScene = gameScene;
    }

    public enter(): void {
        
    }
    public exit(): void {
       
    }

    public render() : void {}
    public update(dt: number, input: CharacterInput): AbstractGameSceneState|null {
        return null;
    }
}

class InGameState extends AbstractGameSceneState {

    constructor(gameScene: GameScene) {
        super(gameScene);
    }

    public update(dt: number, input: CharacterInput): AbstractGameSceneState|null {
        this.gameScene.updateObjects(dt, input);
        this.gameScene.checkLoose();
        this.gameScene.updateTimer(dt);

        return null;
    }

    public render(): void {
        this.gameScene.getScene().render();
    }
}

class LoadingState extends AbstractGameSceneState {

    constructor(gameScene: GameScene) {
        super(gameScene);
    }

}

class EndState extends AbstractGameSceneState {
    private endObject : VictoryCondition | LooseCondition;
    private score: number;
    private timer : number;

    constructor(scene: GameScene, object: VictoryCondition | LooseCondition, score: number, timer: number) {
        super(scene);

        this.endObject = object;
        this.score = score;
        this.timer = timer;
    }

    render(): void {
        this.gameScene.render();
    }
    enter(): void {
        this.gameScene.getScene().getPhysicsEngine().dispose();
        this.endObject.display(this.score, this.timer);
    }

    update(dt: number, input: CharacterInput): AbstractGameSceneState | null {
        this.endObject.update(dt, input);

        return null;
    }    
}