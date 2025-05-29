/**
 * Coin.ts defines the Coin and SuperCoin game objects, their factories, and related logic.
 * 
 * Responsibilities:
 * - Implements the Coin and SuperCoin classes, which represent collectible items in the game.
 * - Handles mesh creation, animation, sound effects, and physics for coins.
 * - Provides factories for creating Coin and SuperCoin objects, both for gameplay and editor use.
 * - Integrates with the visitor pattern for game object interactions.
 * 
 * Usage:
 * - Use `CoinFactory` or `SuperCoinFactory` to create coin objects in the game or editor.
 * - Coins can play sounds, animate rotation, and interact with visitors (e.g., for collection).
 * - Factories handle mesh loading, sound loading, and optional physics setup.
 */

import { Mesh, Scene, StaticSound, Vector3, PhysicsAggregate, PhysicsShapeType, Animation } from "@babylonjs/core";
import { App } from "../app";
import { GameObject, GameObjectVisitor, CharacterInput, GameObjectFactory, GameObjectConfig, Utils, EditorObject } from "../types";
import { ObjectEditorImpl } from "./EditorObject";

/**
 * Coin represents a collectible coin in the game.
 * - Can play a sound when collected.
 * - Supports rotation animation.
 * - Implements the GameObject interface.
 */
export class Coin implements GameObject {
    public mesh: Mesh[] = [];
    private score: number;
    private scene: Scene;
    private sound: Map<string, StaticSound> = new Map();

    public static readonly Type: string = "coin";
    private static nextId: number = 0;

    private id: string;

    /**
     * Constructs a new Coin.
     * @param scene The Babylon.js scene.
     * @param mesh The mesh for the coin (can be null, will be loaded by factory).
     * @param score The score value for collecting the coin.
     */
    constructor(scene: Scene, mesh: Mesh, score: number = 10) {
        this.score = score;
        this.scene = scene;
        this.id = `${Coin.Type}_${Coin.nextId++}`;
        if(mesh) {
            this.mesh.push(mesh);
        }
    }

    /**
     * Adds a sound effect to the coin.
     * @param name The sound name.
     * @param sound The StaticSound instance.
     */
    public addSound(name: string, sound: StaticSound): void {
        this.sound.set(name, sound);
    }

    /**
     * Plays a sound effect by name.
     * @param name The sound name.
     */
    public playSound(name: string): void {
        const sound = this.sound.get(name);
        if (sound) {
            sound.play();
        } else {
            console.warn(`Sound "${name}" not found for coin.`);
        }
    }

    /**
     * Returns the unique ID of the coin.
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Starts the coin's rotation animation.
     */
    public startAnimation(): void {
        this.addRotationAnimation(this.scene);
    }

    /**
     * Adds a rotation animation to the coin's mesh.
     * @param scene The Babylon.js scene.
     */
    private addRotationAnimation(scene: Scene): void {
        const animation = new Animation(
            "coinRotation",
            "rotation.y",
            30, // Framerate
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const keyFrames = [
            { frame: 0, value: 0 },
            { frame: 30, value: Math.PI },
            { frame: 60, value: 2 * Math.PI },
        ];

        animation.setKeys(keyFrames);
        this.getMesh().animations.push(animation);

        scene.beginAnimation(this.mesh, 0, 60, true); // Infinite loop
    }

    /**
     * Returns the main mesh of the coin.
     */
    public getMesh(): Mesh {
        return this.mesh[0];
    }

    /**
     * Returns all meshes associated with the coin.
     */
    public getMeshes(): Mesh[] {
        return this.mesh;
    }

    /**
     * Returns the type of the object ("coin").
     */
    public getType(): string {
        return Coin.Type;
    }

    /**
     * Accepts a visitor (for the visitor pattern).
     * Plays the collect sound and calls the visitor's visitCoin method.
     * @param visitor The GameObjectVisitor.
     */
    public accept(visitor: GameObjectVisitor): void {
        this.playSound("collect");
        visitor.visitCoin(this);
    }

    /**
     * Called on contact; returns false (no special contact logic).
     */
    public onContact(): boolean {
        return false;
    }

    /**
     * Returns the score value of the coin.
     */
    public getScore(): number {
        return this.score;
    }

    /**
     * Updates the coin (no-op for coins).
     */
    public update(_: number, __: CharacterInput): void {}

    /**
     * Called when the game is paused (no-op for coins).
     */
    public onPause(): void {}

    /**
     * Called when the game is resumed (no-op for coins).
     */
    public onResume(): void {}

    /**
     * Adds an observer (not used for coins).
     */
    public addObserver(_: any): void {}
}

/**
 * SuperCoin represents a special, higher-value coin.
 * Inherits from Coin and overrides the type and score.
 */
export class SuperCoin extends Coin {
    public static readonly Type: string = "super_coin";

    constructor(scene: Scene, mesh: Mesh, score: number = 100) {
        super(scene, mesh, score);
    }

    public getType(): string {
        return SuperCoin.Type;
    }
}

/**
 * Factory for creating Coin objects.
 * - Handles mesh and sound loading, and optional physics setup.
 * - Can create coins for both gameplay and editor use.
 * @implements {GameObjectFactory}
 */
export class CoinFactory implements GameObjectFactory {

    /**
     * Creates a Coin object (without mesh).
     * @param config The configuration for the Coin object.
     */
    protected createCoinObject(config: GameObjectConfig) {
        return new Coin(config.scene, null, 10);
    }

    /**
     * Creates a Coin object, loads its mesh and sound, and sets up physics if requested.
     * @param config The configuration for the Coin object.
     * @param physics Whether to enable physics.
     * @param path The mesh file path.
     */
    protected createCoin(config: GameObjectConfig, physics: boolean, path: string): Coin {
        const coin = this.createCoinObject(config);
        if(!config.size) {
            config.size = new Vector3(15, 15, 5);
        }
    
        Utils.createMeshTask(config, Coin.Type, path, (task) => {
            const meshes = task.loadedMeshes;

            if(config.translation) {
               config.position.addInPlace(config.translation.scale(config.size.x / 2));
            }

            Utils.configureMesh(meshes, config);
            meshes.forEach((m) => coin.mesh.push(m as Mesh));

            if(physics) {
                const aggregate = new PhysicsAggregate(meshes[0], PhysicsShapeType.SPHERE, { mass: 0, friction: 0, restitution: 0 }, config.scene);
                aggregate.body.setCollisionCallbackEnabled(true);
                coin.startAnimation();
            }
        });

        Utils.loadSound(config.assetsManager, "collect", "/assets/sounds/coins.ogg", (sound) => {
            coin.addSound("collect", sound);
        });

        return coin;
    }

    /**
     * Creates a Coin object, loads its mesh and sound, and sets up physics if requested.
     * @param config The configuration for the Coin object.
     * @param physics Whether to enable physics.
     */
    protected createImpl(config: GameObjectConfig, physics: boolean) {
        const path = App.selectedGraphics + "/" + Coin.Type + ".glb";
        return this.createCoin(config, physics, path);
    }

    /**
     * Creates a Coin object for the game, with a physics body.
     * @param config The configuration for the Coin object.
     * @returns The created Coin object.
     */
    public create(config: GameObjectConfig): Coin {
        const coin = this.createImpl(config, true);
        return coin;
    }

    /**
     * Creates a Coin object for the editor, without a physics body.
     * @param config The configuration for the Coin object.
     * @returns The created Coin object for the editor.
     */
    public createForEditor(config: GameObjectConfig): EditorObject {
        const coin = this.createImpl(config, false);
        return new ObjectEditorImpl(coin);
    }
}

/**
 * SuperCoinFactory creates SuperCoin objects.
 * Inherits from CoinFactory and overrides the type and score.
 */
export class SuperCoinFactory extends CoinFactory {

    /**
     * Creates a SuperCoin object (without mesh).
     * @param config The configuration for the SuperCoin object.
     */
    protected createCoinObject(config: GameObjectConfig) {
        return new SuperCoin(config.scene, null, 100);
    }

    /**
     * Creates a SuperCoin object, loads its mesh and sound, and sets up physics if requested.
     * @param config The configuration for the SuperCoin object.
     * @param physics Whether to enable physics.
     */
    protected createImpl(config: GameObjectConfig, physics: boolean) : SuperCoin {
        const path = App.selectedGraphics + "/" + SuperCoin.Type + ".glb";
        return this.createCoin(config, physics, path);
    }
}