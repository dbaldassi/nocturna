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
import { IEndScreenHUDListener } from "../HUD/EndScreenHUD";
import { AbstractGameSceneState, InGameState, LoadingState, SelectionState } from "../states/GameStates";

/**
 * GameScene manages the main singleplayer gameplay loop in Nocturna.
 * 
 * Responsibilities:
 * - Loads and initializes the level, cube, parent node, and player.
 * - Handles the main game loop, including state transitions (loading, selection, in-game).
 * - Manages all game objects, their updates, and collisions.
 * - Sets up cameras (multiple FollowCameras) and allows switching between them.
 * - Handles score calculation with time-based multipliers.
 * - Manages the HUD (health bar, timer, etc.) and background music.
 * - Observes and reacts to collisions (coins, enemies, victory, etc.).
 * - Supports restarting, retrying, and quitting the level.
 * - Implements interfaces for level loading, object observation, collision, and HUD events.
 */
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
    protected multiplicators: number[] = [20, 10, 5];
    protected readonly timeMultiplicator: number = 1000 * 60; // 1 minute in milliseconds

    protected static sceneName: string = "level2.json";
    win: boolean = false;   

    /**
     * Constructs a new GameScene.
     * @param engine - The Babylon.js engine.
     * @param inputHandler - The input handler for this scene.
     */
    constructor(engine: Engine, inputHandler: InputHandler) {
        super(engine, inputHandler);
        this.levelLoader = new LevelLoader(this.scene, this,
            { create: (factory: GameObjectFactory, config: GameObjectConfig) => factory.create(config) });
    }

    /**
     * Static factory to create and initialize a new GameScene.
     * @param engine - The Babylon.js engine.
     * @param inputHandler - The input handler.
     * @returns The created and initialized GameScene.
     */
    static async createScene(engine: Engine, inputHandler: InputHandler): Promise<BaseScene> {
        const scene = new GameScene(engine, inputHandler);
        await scene.addPhysic();
        scene.state = new SelectionState(scene);
        scene.state.enter();
        return scene;
    }
    
    /**
     * Loads a level from a file.
     * @param file - The level file to load.
     */
    public createLevel(file: string) {
        this.loadLevel(file);
    }

    /**
     * Loads the level using the LevelLoader.
     * @param file - The level file to load.
     */
    protected loadLevel(file: string) {
        this.levelLoader.loadLevel(file);
    }

    /**
     * Callback when the cube is created.
     * @param cube - The created Cube.
     */
    public onCube(cube: Cube): void {
        console.log("Cube created in GameScene");
        this.cube = cube;
        this.cube.setCollisionObserver(this);
    }

    /**
     * Callback when the player is created.
     * @param player - The created Player.
     */
    public onPlayer(player: Player): void {
        console.log("Player created in GameScene");
        this.player = player;
    }

    /**
     * Callback when the parent node is created.
     * @param parent - The created ParentNode.
     */
    public onParent(parent: ParentNode): void {
        console.log("Parent created in GameScene");
        this.parent = parent;
        this.parent.setupKeyActions(this.inputHandler);
        this.setupKeyActions();
    }

    /**
     * Sets up custom key actions for the scene.
     */
    public setupKeyActions() {
        this.inputHandler.addAction("pov", () => this.changeCamera());
    }

    /**
     * Callback when the level is fully loaded.
     * Sets up cameras, collisions, timer, HUD, and background music.
     */
    public onLevelLoaded(): void {
        this.setupCamera();
        this.setupCollisions();
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

    /**
     * Sets up collision callbacks for all game objects.
     */
    protected setupCollisions() {
        this.gameObjects.forEach((object) => {
            this.addCollisions(object);
        });
    }

    /**
     * Adds collision handling to a specific game object.
     * @param object - The GameObject to add collisions for.
     */
    private addCollisions(object: GameObject) {
        const mesh = object.getMesh();
        if (object === this.player) return;

        console.log(`Adding collision for object: ${object.getType()} with mesh: ${mesh.name}`);
        if (mesh.physicsBody) {
            console.log(`Setting up collision for ${object.getType()} with mesh: ${mesh.name}`);
            mesh.physicsBody.getCollisionObservable().add((collider) => {
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

    /**
     * Sets up the available cameras for the scene.
     */
    protected setupCamera() {
        // Create cameras
        this.cameras = [
            new FollowCamera("rightCamera", this.player.getMesh().position.clone(), this.scene, this.player.getMesh()),
            new FollowCamera("topRightCamera", this.player.getMesh().position.clone(), this.scene, this.player.getMesh()),
        ];

        this.cameras[0].radius = -300;
        this.cameras[1].heightOffset = 300;

        this.scene.activeCamera = this.cameras[this.activeCameraIndex];
    }

    /**
     * Starts the in-game timer and displays the timer UI.
     */
    protected startTimer() {
        this.timer = 0;
        const timerElement = document.getElementById("game-timer");
        timerElement.classList.remove("hidden");
    }

    /**
     * Callback when a new game object is created.
     * @param object - The created GameObject.
     */
    public onObjectCreated(object: GameObject): void {
        this.gameObjects.push(object);
        object.addObserver(this);
    }

    /**
     * Callback when a new object is spawned (e.g., by an enemy).
     * @param gameObject - The spawned GameObject.
     */
    public onSpawnObject(gameObject: GameObject): void {
        this.gameObjects.push(gameObject);
        gameObject.addObserver(this);
        this.addCollisions(gameObject);
    }

    /**
     * Visitor pattern: called when the player reaches the victory condition.
     * @param _ - The VictoryCondition object.
     */
    public visitVictory(_: VictoryCondition): void {
        this.win = true;
    }

    /**
     * Visitor pattern: called when the player collides with an enemy.
     * @param enemy - The Enemy object.
     */
    public visitEnemy(enemy: Enemy): void {
        this.player.takeDamage(enemy.getDamage());
    }

    /**
     * Visitor pattern: called when the player collects a coin.
     * @param coin - The Coin object.
     */
    public visitCoin(coin: Coin): void {
        const index = Math.floor(this.timer / this.timeMultiplicator);
        const multiplicator = this.multiplicators[index] || 1;
        this.score += coin.getScore() * multiplicator;

        this.gameObjects = this.gameObjects.filter(o => o !== coin);
        coin.getMeshes().forEach(m => {
            if (m.physicsBody) {
                m.physicsBody.dispose();
            }
            m.dispose();
        });
    }
    
    /**
     * Hides the UI elements (e.g., health bar).
     */
    public hideUI() {
        this.hpBar.dispose();
    }

    /**
     * Checks if the player has won the level.
     * @returns True if the player has won, false otherwise.
     */
    public checkWin() : boolean {
        return this.win;
    }

    /**
     * Checks if the player has lost (is dead).
     * @returns True if the player is dead, false otherwise.
     */
    public checkLoose() : boolean {
        return this.player && !this.player.isAlive();
    }

    /**
     * Updates all game objects and the HUD.
     * @param dt - Delta time since last update.
     * @param input - The current input state.
     */
    public updateObjects(dt: number, input: CharacterInput) {
        this.gameObjects.forEach((object) => {
            object.update(dt, input);
        });
        this.hpBar.update(this.player.getHp());
    }

    /**
     * Updates the in-game timer and its display.
     * @param dt - Delta time since last update.
     */
    public updateTimer(dt: number) {
        const timerElement = document.getElementById("game-timer");
        this.timer += dt;
        if (timerElement) {
            const minutes = Math.floor(this.timer / 1000 / 60);
            const seconds = (this.timer / 1000 % 60).toFixed(2);
            const formattedTime = `${minutes}:${seconds.toString().padStart(5, '0')}`;
            timerElement.textContent = `${formattedTime}`;
        }
    }

    /**
     * Main update loop for the scene. Handles state transitions.
     * @param dt - Delta time since last update.
     */
    public update(dt: number) {
        const input = this.inputHandler.getInput();
        const newState = this.state.update(dt, input);
        if (newState) {
            this.state.exit();
            this.state = newState;
            this.state.enter();
        }
    }

    /**
     * Renders the current state of the scene.
     */
    public render(): void {
        this.state.render();
    }

    /**
     * Returns the current Babylon.js scene.
     */
    public getScene(): Scene {
        return this.scene;
    }

    /**
     * Returns the current score.
     */
    public getScore(): number {
        return this.score;
    }

    /**
     * Returns the current timer value.
     */
    public getTimer(): number {
        return this.timer;
    }

    /**
     * Fully resets and reloads the scene (for retry/continue).
     */
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
        this.loadLevel(GameScene.sceneName);
    }

    /**
     * Removes physics bodies from all objects and disables the physics engine.
     */
    public removePhysics() {
        this.gameObjects.forEach(o => {
            if (o.getMesh().physicsBody) {
                o.getMesh().physicsBody.dispose();
            }
        })

        this.cube.removePhysics();

        this.scene.disablePhysicsEngine();
    }

    /**
     * Callback for the "continue" action on the end screen HUD.
     */
    public onContinue() {
        console.log("Continuing to the next level...");
        this.recreateScene();
    }

    /**
     * Callback for the "retry" action on the end screen HUD.
     */
    public onRetry() {
        console.log("Retrying the level...");
        this.recreateScene();
    }

    /**
     * Callback for the "quit" action on the end screen HUD.
     */
    public onQuit() {
        window.location.reload();
    }

    /**
     * Switches to the next available camera.
     */
    public changeCamera() {
        this.activeCameraIndex = (this.activeCameraIndex + 1) % this.cameras.length;
        this.scene.activeCamera = this.cameras[this.activeCameraIndex];
        this.scene.activeCamera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
    }

    /**
     * Handles collision with the bottom of the cube (player death).
     * @param collider - The PhysicsBody that collided.
     */
    public onBottomCollision(collider: PhysicsBody) {
        if (this.player.getMesh().physicsBody === collider) {
            this.player.kill();
        }
    }

    /**
     * Indicates if there is a next level (always false in this scene).
     * @returns False.
     */
    public hasNextLevel(): boolean {
        return false;
    }
}