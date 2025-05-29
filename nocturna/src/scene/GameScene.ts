import { Engine, Vector3, FollowCamera, Scene } from "@babylonjs/core";

import { BaseScene } from "./BaseScene";
import { Cube } from "../Cube";
import { ParentNode } from "../ParentNode";
import { InputHandler } from "../InputHandler";
import { Player } from "../GameObjects/Player";
import { GameObject, GameObjectFactory, GameObjectVisitor, GameObjectConfig, AbstractState, CharacterInput, EndConditionObserver, Enemy } from "../types";
import { LevelLoaderObserver, LevelLoader, AbstractFactory } from "../LevelLoader";
import { VictoryCondition } from "../GameObjects/Victory";
<<<<<<< Updated upstream
import { LooseCondition } from "../Loose";
=======
import { Coin } from "../GameObjects/Coin";
import { HpBar } from "../HpBar";
import { NocturnaAudio } from "../NocturnaAudio";
import { createLoseScreenHUD, createWinScreenHUD, IEndScreenHUD, IEndScreenHUDListener } from "../HUD/EndScreenHUD";
import { LevelSelectionObserver, LevelSelectionScene } from "../LevelSelection";
>>>>>>> Stashed changes

const CUBE_SIZE = 3000;

export class GameScene extends BaseScene implements LevelLoaderObserver, GameObjectVisitor, EndConditionObserver {
    protected cube: Cube;
    protected parent: ParentNode;
    protected player: Player;
    protected gameObjects: GameObject[] = [];
    protected levelLoader: LevelLoader;
    protected timer: number = 0;
    protected score: number = 0;
    protected cameras: FollowCamera[] = [];
    protected activeCameraIndex: number = 0;
    protected loseCondition: LooseCondition; // Replace with the actual type if available
    protected state: AbstractGameSceneState;
<<<<<<< Updated upstream
    protected static sceneName: string = "scene.json";
=======
    protected hpBar: HpBar;
    protected multiplicators: number[] = [20, 10, 5];
    protected readonly timeMultiplicator: number = 1000 * 60; // 1 minute in milliseconds

    public static sceneName: string = "level1.json";
    win: boolean = false;
>>>>>>> Stashed changes

    constructor(engine: Engine, inputHandler: InputHandler) {
        super(engine, inputHandler);
        this.levelLoader = new LevelLoader(this.scene, this,
            { create: (factory: GameObjectFactory, config: GameObjectConfig) => factory.create(config) });
    }

    static async createScene(engine: Engine, inputHandler: InputHandler): Promise<BaseScene> {
        const scene = new GameScene(engine, inputHandler);
<<<<<<< Updated upstream

        await scene.addPhysic();

        // // Create the main cube
        // scene.cube = Cube.create(scene.scene);
        // // Create the parent node
        // scene.parent = new ParentNode(Vector3.Zero(), scene.scene);
        // scene.parent.setupKeyActions(scene.inputHandler);

        // scene.enableDebug();
        scene.state = new LoadingState(scene);
        scene.loadLevel(this.sceneName);
        VictoryCondition.mode = "normal";
=======
        scene.state = new SelectionState(scene);
        scene.state.enter();
>>>>>>> Stashed changes
        return scene;
    }

    public async createLevel(level: string): Promise<void> {
        await this.addPhysic();
        this.loadLevel(level);
    }

    protected loadLevel(file: string) {
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
        this.setupKeyActions();
    }

    public setupKeyActions() {
        this.inputHandler.addAction("pov", () => this.changeCamera());
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

    protected setupCollisions() {
        this.gameObjects.forEach((object) => {
            const mesh = object.getMesh();
            if (object === this.player) return;

            if (mesh.physicsBody) {
                mesh.physicsBody.getCollisionObservable().add((collider) => {
                    // console.log(`Collision detected with ??`);
                    if (collider.collidedAgainst === this.player.getMesh().physicsBody) {
                        console.log(`Player collision detected with ${mesh.name}`);
                        object.accept(this);
                    }
                });
            }
        });
    }

    protected setupCamera() {
        // Create cameras
        this.cameras = [
            new FollowCamera("rightCamera", this.player.getMesh().position.clone(), this.scene, this.player.getMesh()),
            new FollowCamera("topRightCamera", this.player.getMesh().position.clone(), this.scene, this.player.getMesh()),
        ];

        this.cameras[0].radius = -300;
        this.cameras[1].heightOffset = 300;

        this.scene.activeCamera = this.cameras[this.activeCameraIndex];
        // this.scene.activeCamera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
    }

    protected startTimer() {
        this.timer = 0; // Reset the timer to 0 at the start
        const timerElement = document.getElementById("game-timer"); // Get the timer element
        timerElement.classList.remove("hidden");
    }

    public onObjectCreated(object: GameObject): void {
        this.gameObjects.push(object);
    }

    public visitVictory(portal: VictoryCondition): void {
        const state = this.state as InGameState;
        state.setCondition(portal);
    }

    public visitEnemy(enemy: Enemy): void {
        this.player.visitEnemy(enemy);
    }

<<<<<<< Updated upstream
    public checkLoose() {
        if (this.loseCondition.checkLoose(this.timer)) {
            console.log("Loose condition met");
            const state = this.state as InGameState;
            state.setCondition(this.loseCondition);
        }
=======
    public visitCoin(coin: Coin): void {
        const index = Math.floor(this.timer / this.timeMultiplicator);
        const multiplicator = this.multiplicators[index] || 1; // Default to 1 if index is out of bounds
        this.score += coin.getScore() * multiplicator;

        // remove the coin from the gameObjects array
        this.gameObjects = this.gameObjects.filter(o => o !== coin);
        coin.getMeshes().forEach(m => {
            if (m.physicsBody) {
                m.physicsBody.dispose();
            }
            m.dispose();
        });
    }

    public hideUI() {
        this.hpBar.dispose();
    }

    public checkWin(): boolean {
        return this.win;
    }

    public checkLoose(): boolean {
        return this.player && !this.player.isAlive();
>>>>>>> Stashed changes
    }

    public updateObjects(dt: number, input: CharacterInput) {
        this.gameObjects.forEach((object) => {
            object.update(dt, input);
        });
        // this.player.update(dt, input);
    }

    public updateTimer(dt: number) {
        const timerElement = document.getElementById("game-timer");
        this.timer += dt; // Increment the timer by delta time
        if (timerElement) {
            const minutes = Math.floor(this.timer / 1000 / 60);
            const seconds = (this.timer / 1000 % 60).toFixed(2); // Limiter à 2 chiffres après la virgule
            const formattedTime = `${minutes}:${seconds.toString().padStart(5, '0')}`; // Format as MM:SS.ss
            timerElement.textContent = `${formattedTime}`; // Update the timer element
        }
    }

    public update(dt: number) {
        const input = this.inputHandler.getInput();
        // this.currentLevel.update(dt, input);
        const newState = this.state.update(dt, input);
        console.log(`Current state: ${this.state.constructor.name}`, `New state: ${newState ? newState.constructor.name : 'null'}`);
        if (newState) {
            this.state.exit();
            this.state = newState;
            this.state.enter();
        }
    }

    public render(): void {
        this.state.render();
    }

    public getScene(): Scene {
        return this.scene;
    }
    public getScore(): number {
        return this.score;
    }
    public getTimer(): number {
        return this.timer;
    }

    public async recreateScene() {
        this.state.exit();
        this.state = new LoadingState(this);
        this.state.enter();

        this.gameObjects = []
        this.player = null;
        this.parent = null;

        this.cube = null;

        this.scene.dispose();
        this.scene = new Scene(this.engine);
        this.levelLoader.setScene(this.scene);

        await this.addPhysic();
        // this.scene.enablePhysics(new Vector3(0, -1000, 0), this.hk);
        this.loadLevel("scene.json");
    }

    public removePhysics() {
        this.gameObjects.forEach(o => {
            if (o.getMesh().physicsBody) {
                o.getMesh().physicsBody.dispose();
            }
        })

        this.scene.disablePhysicsEngine();
    }

    public onRetry() {
        this.recreateScene();
    }

    public onQuit() {
        window.location.reload();
    }

    public changeCamera() {
        this.activeCameraIndex = (this.activeCameraIndex + 1) % this.cameras.length;
        this.scene.activeCamera = this.cameras[this.activeCameraIndex];
        this.scene.activeCamera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
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
        console.log(`Entering state: ${this.constructor.name}`);
    }
    public exit(): void {

    }

    public render(): void { }
    public update(_: number, __: CharacterInput): AbstractGameSceneState | null {
        return null;
    }
}

class InGameState extends AbstractGameSceneState {
    protected condition: VictoryCondition | LooseCondition;

    constructor(gameScene: GameScene) {
        super(gameScene);
        this.condition = null;
    }

    public setCondition(condition: VictoryCondition | LooseCondition) {
        this.condition = condition;
    }

    public update(dt: number, input: CharacterInput): AbstractGameSceneState | null {
        if (this.condition) {
            return new EndState(this.gameScene, this.condition);
        }

        this.gameScene.updateObjects(dt, input);
        this.gameScene.checkLoose();
        this.gameScene.updateTimer(dt);

<<<<<<< Updated upstream
=======
        if (this.gameScene.checkWin()) {
            return new EndState(this.gameScene,
                createWinScreenHUD(this.gameScene,
                    this.gameScene.hasNextLevel() ? "continue" : "normal",
                    this.gameScene.getScore(),
                    this.gameScene.getTimer()));
        }

        if (this.gameScene.checkLoose()) {
            return new EndState(this.gameScene, createLoseScreenHUD(this.gameScene, this.gameScene.getScore(), this.gameScene.getTimer()));
        }

>>>>>>> Stashed changes
        return null;
    }

    public render(): void {
        this.gameScene.getScene().render();
    }
}

export class LoadingState extends AbstractGameSceneState {

    constructor(gameScene: GameScene) {
        super(gameScene);
    }

}

class EndState extends AbstractGameSceneState {
    protected endObject: VictoryCondition | LooseCondition;

    constructor(scene: GameScene, object: VictoryCondition | LooseCondition) {
        super(scene);
<<<<<<< Updated upstream

        this.endObject = object;
    }

    render(): void {
        // this.gameScene.getScene().render();
    }
=======
        this.hud = hud;
    }

    render(): void { }
>>>>>>> Stashed changes
    enter(): void {
        console.log(`Entering state: ${this.constructor.name}`);
        this.gameScene.removePhysics();

        this.endObject.addObserver(this.gameScene);
        this.endObject.display(this.gameScene.getScore(), this.gameScene.getTimer());
    }
    exit() {
        this.endObject.hide();
        this.endObject.removeObserver(this.gameScene);
    }

    update(dt: number, input: CharacterInput): AbstractGameSceneState | null {
        this.endObject.update(dt, input);

        return null;
    }
}

class SelectionState extends AbstractGameSceneState implements LevelSelectionObserver {
    private level: string = null;
    private levelSelector: LevelSelectionScene | null = null;
    private file: string;

    constructor(gameScene: GameScene, file: string = "levels.json") {
        super(gameScene);
        this.file = file;
    }

    public render(): void {
    }

    public name(): string {
        return "Selection state";
    }

    enter() {
        this.levelSelector = new LevelSelectionScene(this.gameScene.getScene(), this, this.file);
    }
    exit() {
        this.gameScene.getScene().dispose();
        this.gameScene.createLevel(this.level);
    }

    update(_: number, __: CharacterInput): AbstractGameSceneState | null {
        return this.level ? new LoadingState(this.gameScene) : null;
    }

    onLevelSelected(level: string): void {
        this.level = level;
    }
}