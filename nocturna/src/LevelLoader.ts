import { Cube } from "./Cube";
import { ParentNode } from "./ParentNode";
import { Player, PlayerFactory } from "./GameObjects/Player";
import { AssetsManager, Scene, Vector3 } from "@babylonjs/core";
import { GameObjectFactory, GameObjectConfig, EditorObject, GameObject } from "./types";
import { ParentedPlatform, ParentedPlatformFactory, FixedPlatform, FixedPlatformFactory, ParentedRocketActivationPlatform, ParentedRocketActivationPlatformFactory, FixedRocketActivationPlatform, FixedRocketActivationPlatformFactory } from "./GameObjects/Platform";
import { VictoryCondition, VictoryConditionFactory } from "./GameObjects/Victory";
import { FixedRocket, FixedRocketFactory } from "./GameObjects/Rocket";
import { SpikeTrapFactory, SpikeTrapObject } from "./GameObjects/SpikeTrap";
import { Coin, CoinFactory } from "./GameObjects/Coin";

/**
 * LevelLoader.ts defines the LevelLoader class and related interfaces for loading and instantiating
 * game levels in Nocturna.
 * 
 * Responsibilities:
 * - Loads level data from JSON files or in-memory data.
 * - Instantiates all game objects (platforms, player, victory condition, enemies, etc.) using factories.
 * - Manages asset loading via Babylon.js AssetsManager.
 * - Notifies observers about key events (cube, parent node, player, object creation, level loaded).
 * - Supports both gameplay and editor instantiation via an abstract factory.
 * 
 * Usage:
 * - Create a LevelLoader with a Babylon.js Scene, a LevelLoaderObserver, and an AbstractFactory.
 * - Call `loadLevel(levelFile)` to load a level from a file, or `loadLevelFromData(data)` to load from JSON data.
 * - The observer receives callbacks for cube, parent node, player, each object created, and when the level is fully loaded.
 * - Factories for all supported object types are registered automatically.
 */

/**
 * LevelLoaderObserver defines the interface for objects that want to be notified
 * of key events during level loading (cube, player, parent node, object creation, level loaded).
 */
export interface LevelLoaderObserver {
    onCube(cube: Cube): void;
    onPlayer(player: Player): void;
    onParent(parent: ParentNode): void;
    onLevelLoaded: () => void;
    onObjectCreated: (object: GameObject | EditorObject) => void;
}

/**
 * PlayerAbstractFactory wraps the PlayerFactory to notify the observer when a player is created.
 */
class PlayerAbstractFactory implements GameObjectFactory {
    private observer: LevelLoaderObserver;
    private factory: PlayerFactory;

    constructor(observer: LevelLoaderObserver) {
        this.observer = observer;
        this.factory = new PlayerFactory();
    }
    public create(config: GameObjectConfig): Player {
        const player = this.factory.create(config);
        this.observer.onPlayer(player);
        return player;
    }
    public createForEditor(GameObjectConfig: any): EditorObject {
        const player = this.factory.createForEditor(GameObjectConfig);
        return player;
    }
}

/**
 * AbstractFactory defines the interface for creating game objects or editor objects
 * using a specific GameObjectFactory and configuration.
 */
export interface AbstractFactory {
    create(factory: GameObjectFactory, config: GameObjectConfig): GameObject | EditorObject;
}

/**
 * LevelLoader is responsible for loading level data, instantiating all game objects,
 * and managing asset loading and observer notifications.
 */
export class LevelLoader {

    private observer: LevelLoaderObserver;
    private scene: Scene;
    private factories: Map<string, GameObjectFactory>;
    private abstractFactory: AbstractFactory;
    private assetManager: AssetsManager;

    /**
     * Constructs a new LevelLoader.
     * @param scene The Babylon.js scene.
     * @param observer The observer to notify of loading events.
     * @param abstractFactory The factory to use for creating game/editor objects.
     */
    constructor(scene: Scene, observer: LevelLoaderObserver, abstractFactory: AbstractFactory) {
        this.observer = observer;
        this.scene = scene;
        this.abstractFactory = abstractFactory;

        // Register all supported object factories
        this.factories = new Map<string, GameObjectFactory>();
        this.factories.set(ParentedPlatform.Type, new ParentedPlatformFactory());
        this.factories.set(FixedPlatform.Type, new FixedPlatformFactory());
        this.factories.set(VictoryCondition.Type, new VictoryConditionFactory());
        this.factories.set(Player.Type, new PlayerAbstractFactory(observer));
        this.factories.set(FixedRocket.Type, new FixedRocketFactory());
        this.factories.set(SpikeTrapObject.Type, new SpikeTrapFactory());
        this.factories.set(ParentedRocketActivationPlatform.Type, new ParentedRocketActivationPlatformFactory());
        this.factories.set(FixedRocketActivationPlatform.Type, new FixedRocketActivationPlatformFactory());
        this.factories.set(Coin.Type, new CoinFactory());
    }

    /**
     * Sets the Babylon.js scene to use for future object creation.
     * @param scene The new scene.
     */
    public setScene(scene: Scene): void {
        this.scene = scene;
    }

    /**
     * Loads a level from a JSON file by filename.
     * Instantiates all objects and notifies the observer.
     * @param level The filename of the level JSON.
     */
    public loadLevel(level: string): void {
        const levelPath = `assets/levels/${level}`;
        fetch(levelPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load level: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                this.createLevel(data);
            })
            .catch(error => {
                console.error('Error loading level:', error);
            });
    }

    /**
     * Loads a level from in-memory JSON data.
     * @param data The JSON data for the level.
     */
    public loadLevelFromData(data: JSON): void {
        this.createLevel(data);
    }

    /**
     * Helper to create a Babylon.js Vector3 from a plain object.
     * @param data The object with _x, _y, _z properties.
     */
    private createVector3(data: any): Vector3 {
        return new Vector3(data._x, data._y, data._z);
    }

    /**
     * Instantiates all objects in the level, sets up asset loading, and notifies the observer.
     * @param data The parsed level JSON data.
     */
    private createLevel(data: any): void {
        // Create the cube
        const cube = Cube.create(this.scene, data[Cube.Type].position, data[Cube.Type].size);
        this.observer.onCube(cube);

        // Create the parent node
        const parent = new ParentNode(data[ParentNode.Type].position, this.scene);
        this.observer.onParent(parent);

        const objects = data.objects;
        if (!objects || objects.length === 0) {
            console.warn("No objects found in the level data.");
            this.observer.onLevelLoaded();
            return;
        }

        this.assetManager = new AssetsManager(this.scene);
        this.assetManager.onTaskError = (task) => {
            console.error(`Error loading asset: ${task.name}`, task.errorObject);
        };
        this.assetManager.onFinish = () => {
            console.log("All assets loaded");
            this.observer.onLevelLoaded();
        };

        objects.forEach((object: any) => {
            const factory = this.factories.get(object.type);
            if (factory) {
                const config: GameObjectConfig = {
                    scene: this.scene,
                    position: this.createVector3(object.position),
                    size: this.createVector3(object.size),
                    rotation: this.createVector3(object.rotation),
                    parent: parent,
                    assetsManager: this.assetManager
                };
                const gameObject = this.abstractFactory.create(factory, config);
                this.observer.onObjectCreated(gameObject);
            } else {
                console.warn(`No factory found for type: ${object.type}`);
            }
        });

        this.assetManager.load();
    }
}