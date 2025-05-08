
import { Cube } from "./Cube";
import { ParentNode } from "./ParentNode";
import { Player, PlayerEditor, PlayerFactory } from "./GameObjects/Player";
import { AssetsManager, Scene, Vector3 } from "@babylonjs/core";
import { GameObjectFactory, GameObjectConfig, EditorObject, GameObject } from "./types";
import { ParentedPlatform, ParentedPlatformFactory, FixedPlatform, FixedPlatformFactory } from "./GameObjects/Platform";
import { VictoryCondition, VictoryConditionFactory } from "./GameObjects/Victory";
import { FixedRocket, FixedRocketFactory } from "./GameObjects/Rocket";
import { SpikeTrapFactory, SpikeTrapObject } from "./GameObjects/SpikeTrap";

export interface LevelLoaderObserver {
    onCube(cube : Cube): void;
    onPlayer(player: Player): void;
    onParent(parent: ParentNode): void; 
    onLevelLoaded: () => void;
    onObjectCreated: (object: GameObject|EditorObject) => void;
}

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
    public createForEditor(GameObjectConfig: any): PlayerEditor {
        const player = this.factory.createForEditor(GameObjectConfig);
        this.observer.onObjectCreated(player);
        return player;
    }
}

export interface AbstractFactory {
    create(factory: GameObjectFactory, config: GameObjectConfig): GameObject|EditorObject;
}

export class LevelLoader {

    private observer: LevelLoaderObserver;
    private scene: Scene;
    private factories : Map<string, GameObjectFactory>;
    private abstractFactory: AbstractFactory;
    private assetManager: AssetsManager;

    constructor(scene: Scene, observer: LevelLoaderObserver, abstractFactory: AbstractFactory) {
        this.observer = observer;
        this.scene = scene;
        this.abstractFactory = abstractFactory;
        this.assetManager = new AssetsManager(scene);

        this.factories = new Map<string, GameObjectFactory>();
        this.factories.set(ParentedPlatform.Type, new ParentedPlatformFactory());
        this.factories.set(FixedPlatform.Type, new FixedPlatformFactory());
        this.factories.set(VictoryCondition.Type, new VictoryConditionFactory());
        this.factories.set(Player.Type, new PlayerAbstractFactory(observer));
        this.factories.set(FixedRocket.Type, new FixedRocketFactory());
        this.factories.set(SpikeTrapObject.Type, new SpikeTrapFactory());
    }

    public loadLevel(level: string): void {
        // Load the level from the specified path
        const levelPath = `assets/levels/${level}.json`;
        fetch(levelPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load level: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                // console.log('Level data:', data);
                this.createLevel(data);
            })
            .catch(error => {
                console.error('Error loading level:', error);
            });
    }

    private createVector3(data: any): Vector3 {
        return new Vector3(data._x, data._y, data._z);
    }

    private createLevel(data: any): void {
        // Create the cube
        const cube = Cube.create(this.scene, data[Cube.Type].position, data[Cube.Type].size);
        this.observer.onCube(cube);

        // Create the parent node
        const parent = new ParentNode(data[ParentNode.Type].position, this.scene);
        this.observer.onParent(parent);

        const objects = data.objects;
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
                console.log("config", config);
                const gameObject = this.abstractFactory.create(factory, config);
                this.observer.onObjectCreated(gameObject);
            } else {
                console.warn(`No factory found for type: ${object.type}`);
            }
        });

        this.assetManager.load();
        this.assetManager.onFinish = () => {
            // All assets are loaded, you can start the scene or do other things here
            console.log("All assets loaded");
            // Notify that the level has been loaded
            this.observer.onLevelLoaded();
        };
    }

}