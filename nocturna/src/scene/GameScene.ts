import { Engine, FollowCamera, Scene, PhysicsBody } from "@babylonjs/core";

import { BaseScene } from "./BaseScene";
import { Cube, CubeCollisionObserver } from "../Cube";
import { ParentNode } from "../ParentNode";
import { InputHandler } from "../InputHandler";
import { Player } from "../GameObjects/Player";
import { GameObject, GameObjectFactory, GameObjectVisitor, GameObjectConfig, CharacterInput, Enemy, GameObjectObserver } from "../types";
import { LevelLoaderObserver, LevelLoader } from "../LevelLoader";
import { VictoryCondition } from "../GameObjects/Victory";
import { Coin } from "../GameObjects/Coin";
import { HpBar } from "../HpBar";
import { NocturnaAudio } from "../NocturnaAudio";
import { createLoseScreenHUD, createWinScreenHUD, IEndScreenHUD, IEndScreenHUDListener } from "../HUD/EndScreenHUD";

export class GameScene extends BaseScene implements LevelLoaderObserver, GameObjectVisitor, IEndScreenHUDListener, CubeCollisionObserver, GameObjectObserver {
    protected cube: Cube;
    protected parent: ParentNode;
    protected player: Player;
    protected gameObjects: GameObject[] = [];
    protected levelLoader: LevelLoader;
    protected timer: number = 0;
    protected score: number = 0;
    protected cameras: FollowCamera[] = [];
    protected activeCameraIndex: number = 0;
    protected state: AbstractGameSceneState;
    protected hpBar: HpBar;

    protected static sceneName: string = "test_level.json";
    win: boolean = false;   

    constructor(engine: Engine, inputHandler: InputHandler) {
        super(engine, inputHandler);
        this.levelLoader = new LevelLoader(this.scene, this,
            { create: (factory: GameObjectFactory, config: GameObjectConfig) => factory.create(config) });
    }

    static async createScene(engine: Engine, inputHandler: InputHandler): Promise<BaseScene> {
        const scene = new GameScene(engine, inputHandler);

        await scene.addPhysic();

        // // Create the main cube
        // scene.cube = Cube.create(scene.scene);
        // // Create the parent node
        // scene.parent = new ParentNode(Vector3.Zero(), scene.scene);
        // scene.parent.setupKeyActions(scene.inputHandler);

        // scene.enableDebug();
        scene.state = new LoadingState(scene);
        scene.loadLevel(this.sceneName);
        return scene;
    }

    protected loadLevel(file: string) {
        // this.currentLevel = new Level(this.scene, this.parent, this.cube, CUBE_SIZE);
        this.levelLoader.loadLevel(file);
    }

    public onCube(cube: Cube): void {
        console.log("Cube created in GameScene");
        this.cube = cube;
        this.cube.setCollisionObserver(this);
    }
    public onPlayer(player: Player): void {
        console.log("Player created in GameScene");
        this.player = player;
    }
    public onParent(parent: ParentNode): void {
        console.log("Parent created in GameScene");
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

        this.hpBar = new HpBar(this.player.getMaxHp());
        this.state.exit();
        this.state = new InGameState(this);
        this.state.enter();

        // Start background music
        NocturnaAudio.getInstance().then(audio => {
            audio.setBackgroundMusic("assets/music/background.mp3");
        });
    }

    protected setupCollisions() {
        this.gameObjects.forEach((object) => {
            this.addCollisions(object);
        });
    }

    private addCollisions(object: GameObject) {
        const mesh = object.getMesh();
        if (object === this.player) return;

        console.log(`Adding collision for object: ${object.getType()} with mesh: ${mesh.name}`);
        if (mesh.physicsBody) {
            console.log(`Setting up collision for ${object.getType()} with mesh: ${mesh.name}`);
            mesh.physicsBody.getCollisionObservable().add((collider) => {
                // console.log(`Collision detected with ??`);
                if (collider.collidedAgainst === this.player.getMesh().physicsBody) {
                    console.log(`Player collision detected with ${mesh.name}`);
                    object.accept(this);
                }

                const should_delete = object.onContact();
                if (should_delete) {
                    this.gameObjects = this.gameObjects.filter(o => o !== object);
                    object.getMeshes().forEach(m => {
                        if (m.physicsBody) {
                            m.physicsBody.dispose();
                        }
                        m.dispose();
                    });
                }
            });
        }
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
        object.addObserver(this);
    }

    public onSpawnObject(gameObject: GameObject): void {
        this.gameObjects.push(gameObject);
        gameObject.addObserver(this);
        this.addCollisions(gameObject);
    }

    public visitVictory(_: VictoryCondition): void {
        this.win = true;
    }

    public visitEnemy(enemy: Enemy): void {
        this.player.takeDamage(enemy.getDamage());
    }

    public visitCoin(_: Coin): void {

    }

    public hideUI() {
        this.hpBar.dispose();
    }

    public checkWin() : boolean {
        return this.win;
    }

    public checkLoose() : boolean {
        return this.player && !this.player.isAlive();
    }

    public updateObjects(dt: number, input: CharacterInput) {
        this.gameObjects.forEach((object) => {
            object.update(dt, input);
        });
        // this.player.update(dt, input);
        this.hpBar.update(this.player.getHp());
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
        console.log("Recreating GameScene...");

        this.state.exit();
        this.state = new LoadingState(this);
        this.state.enter();

        this.cube.dispose();
        this.parent.dispose();

        this.gameObjects = []
        this.player = null;
        this.parent = null;

        this.cube = null;
        this.win = false;

        this.scene.meshes.forEach(mesh => mesh.dispose());
        this.scene.materials.forEach(mat => mat.dispose());
        this.scene.textures.forEach(tex => tex.dispose());

        this.scene.dispose();
        this.scene = new Scene(this.engine);
        this.levelLoader.setScene(this.scene);

        this.hpBar = null;

        await this.addPhysic();
        // this.scene.enablePhysics(new Vector3(0, -1000, 0), this.hk);
        this.loadLevel(GameScene.sceneName);
    }

    public removePhysics() {
        this.gameObjects.forEach(o => {
            if (o.getMesh().physicsBody) {
                o.getMesh().physicsBody.dispose();
            }
        })

        this.cube.removePhysics();

        this.scene.disablePhysicsEngine();
    }

    public onContinue() {
        console.log("Continuing to the next level...");
        this.recreateScene();
    }

    public onRetry() {
        console.log("Retrying the level...");
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

    public onBottomCollision(collider: PhysicsBody) {
        if (this.player.getMesh().physicsBody === collider) {
            this.player.kill();
        }
    }

    public hasNextLevel(): boolean {
        return false; // This scene does not have a next level
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

export class InGameState extends AbstractGameSceneState {
    constructor(gameScene: GameScene) {
        super(gameScene);
    }

    public exit(): void {
        this.gameScene.hideUI();
    }

    public update(dt: number, input: CharacterInput): AbstractGameSceneState | null {
        this.gameScene.updateObjects(dt, input);
        this.gameScene.updateTimer(dt);

        if(this.gameScene.checkWin()) {
            return new EndState(this.gameScene, 
                createWinScreenHUD(this.gameScene,
                    this.gameScene.hasNextLevel() ? "continue" : "normal",
                    this.gameScene.getScore(), 
                    this.gameScene.getTimer()));
        }

        if(this.gameScene.checkLoose()) {
            return new EndState(this.gameScene, createLoseScreenHUD(this.gameScene, this.gameScene.getScore(), this.gameScene.getTimer()));
        }

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
    protected hud: IEndScreenHUD;

    constructor(scene: GameScene, hud: IEndScreenHUD) {
        super(scene);
        this.hud = hud;   
    }

    render(): void {}
    enter(): void {
        this.gameScene.removePhysics()
    }
    exit() {
        this.hud.dispose();
        this.hud = null;
    }

    update(dt: number, input: CharacterInput): AbstractGameSceneState | null {
        this.hud.update(dt, input);
        return null;
    }
}