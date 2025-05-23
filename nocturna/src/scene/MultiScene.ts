import { Engine, Vector3, FollowCamera, UniversalCamera, Scene, Camera } from "@babylonjs/core";

import { BaseScene } from "./BaseScene";
import { ParentNode } from "../ParentNode";
import { InputHandler } from "../InputHandler";
import { GameObject, GameObjectVisitor, GameObjectConfig, CharacterInput, EndConditionObserver, IRemoteGameObject, Enemy } from "../types";
import { VictoryCondition } from "../GameObjects/Victory";
import { LooseCondition } from "../Loose";

import { NetworkManager } from "../network/NetworkManager";
import { RemoteGameObject } from "../GameObjects/RemoteGameObject";
import { Coin, CoinFactory, SuperCoinFactory } from "../GameObjects/Coin";
import { Platform } from "../GameObjects/Platform";
import { AbstractGameSceneState, InGameState, LobbyState } from "../states/MultiSceneStates";
import { AdvancedDynamicTexture, Control, TextBlock } from "@babylonjs/gui";
import { Action } from "../action";

class CoinSpawner {
    private scene: Scene;
    private coinFactory: CoinFactory;
    private superCoinFactory: SuperCoinFactory;

    constructor(scene: Scene) {
        this.scene = scene;
        this.coinFactory = new CoinFactory();
        this.superCoinFactory = new SuperCoinFactory();
    }

    public spawnCoin(position: Vector3): Coin {
        let coin: Coin;
        const config: GameObjectConfig = {
            position: position,
            translation: Vector3.Up(),
            rotation: Vector3.Zero(),
            scene: this.scene,
        };

        if(Math.random() > 0.1) coin = this.coinFactory.create(config);
        else coin = this.superCoinFactory.create(config);

        return coin;
    }
};

export class MultiScene extends BaseScene implements GameObjectVisitor, EndConditionObserver {
    public static readonly MaxPlayer: number = 4;

    private readonly coinInterval: number = 10000; // 1 second
    private readonly inventorySize: number = 3;
    private readonly powerupScore: number = 20;

    private gameObjects: GameObject[] = [];
    private remoteObjects: IRemoteGameObject[] = [];
    private localObjects: GameObject[] = [];
    private loseCondition: LooseCondition; // Replace with the actual type if available
    private state : AbstractGameSceneState;
    private timestamp: number = 0;
    private score: number = 0;
    private coinSpawner: CoinSpawner;
    private playerId: string;
    private coinTimer: number = 0;
    private cameras: Camera[];
    private subcube: number;
    private parent: ParentNode = null;
    private scoreText: any;
    private inventory: Action.ActionBase[] = [];

    public activeCameraIndex: number = 0;
    inventoryTextBlocks: any[];

    constructor(engine: Engine, inputHandler: InputHandler) {
        super(engine, inputHandler);
    }

    static async createScene(engine: Engine, inputHandler: InputHandler): Promise<BaseScene> {
        const scene = new MultiScene(engine, inputHandler);

        const camera = new UniversalCamera("camera1", Vector3.Zero(), scene.scene);
        scene.scene.activeCamera = camera;

        scene.state = new LobbyState(scene);
        scene.state.enter();

        return scene;
    }
    
    public async createGameScene() {
        this.scene = new Scene(this.engine);
        this.coinSpawner = new CoinSpawner(this.scene);
        
        for(let i = 0; i < this.inventorySize; i++) {
            this.inventory.push(null);
            // bind key to action
            this.inputHandler.addAction(`action_${i+1}`, () => {
                if(this.inventory[i]) {
                    this.inventory[i].execute();
                    this.inventory[i] = null;
                }
            });
        }

        await this.addPhysic();
    }

    public setupCamera() {
        this.cameras = [
            new UniversalCamera("wide", Vector3.Zero(), this.scene),
            new FollowCamera("player", Vector3.Zero(), this.scene, this.localObjects[0].getMesh()),
        ];
        
        this.activeCameraIndex = 1;

        this.cameras[0].fov = Math.PI / 2;
        (this.cameras[1] as FollowCamera).radius = 500;
        (this.cameras[1] as FollowCamera).rotationOffset = 180;

        this.scene.activeCamera = this.cameras[this.activeCameraIndex];

        this.inputHandler.addAction("pov", () => this.switchCamera());
    }

    public setupUI() {
        const gui = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);
        
        this.scoreText = new TextBlock();
        this.scoreText.text = `Score : ${this.score}`;
        this.scoreText.color = "white";
        this.scoreText.fontSize = 32;
        this.scoreText.width = "300px";
        this.scoreText.height = "60px";
        this.scoreText.horizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
        this.scoreText.verticalAlignment = TextBlock.VERTICAL_ALIGNMENT_BOTTOM;
        this.scoreText.left = "20px";    // 20px depuis la gauche
        this.scoreText.top = "-20px";  

        gui.addControl(this.scoreText);

        // Inventaire
        this.inventoryTextBlocks = [];
        const slotWidth = 120;
        for (let i = 0; i < this.inventorySize; i++) {
            const itemText = new TextBlock();
            itemText.text = this.inventory[i]?.getName?.() ?? "";
            itemText.color = "white";
            itemText.fontSize = 28;
            itemText.width = `${slotWidth}px`;
            itemText.height = "60px";
            itemText.horizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
            itemText.verticalAlignment = TextBlock.VERTICAL_ALIGNMENT_BOTTOM;
            itemText.left = `${340 + i * (slotWidth + 10)}px`; // 340px = scoreText.width + padding
            itemText.top = "-20px";
            // itemText.background = "#2228"; // Optionnel : fond semi-transparent
            gui.addControl(itemText);
            this.inventoryTextBlocks.push(itemText);
        }
    }

    public showScore() {
        if (this.scoreText) {
            this.scoreText.text = `Score : ${this.score}`;
        }
    }

    public showActions() {
        this.inventoryTextBlocks.forEach((textBlock, index) => {
            const action = this.inventory[index];

            if (action) {
                textBlock.text = action.getName();
                textBlock.alpha = 1; // Rendre le texte visible
            } else {
                textBlock.text = "";
                textBlock.alpha = 0; // Rendre le texte invisible
            }
        });
    }

    public switchCamera() {
        this.activeCameraIndex = (this.activeCameraIndex + 1) % this.cameras.length;
        this.scene.activeCamera = this.cameras[this.activeCameraIndex];
    }

    public addRemoteObject(object: IRemoteGameObject): void {
        this.remoteObjects.push(object);
    }

    public removeRemoteObject(id: string, owner: string): void {
        const object = this.remoteObjects.find(o => id === o.getId() && owner === o.getOwnerId());

        if(!object) return;

        const body = object.getMesh().physicsBody;
        if(body) {
            body.dispose();
        }
        object.getMesh().dispose();

        this.remoteObjects = this.remoteObjects.filter(o => o !== object);
    }

    public addParent(parent: ParentNode): void {
        this.parent = parent;
    }

    public getParent(): ParentNode {
        return this.parent;
    }

    public addPlayer(object: GameObject, id: string, subcube: number): void {
        this.localObjects.push(object);
        this.subcube = subcube; 
        this.playerId = id;
    }

    public isInSubcube(position: Vector3) {
        switch(this.subcube) {
            case 0:  return position.x < 0 && position.y > 0;
            case 1:  return position.x > 0 && position.y > 0;
            case 2:  return position.x < 0 && position.y < 0;
            case 3:  return position.x > 0 && position.y < 0;
            default: return false;
        }
    }

    private addLocalObject(object: GameObject): void {
        this.localObjects.push(object);
        
        const body = object.getMesh().physicsBody;
        if(body) {
            body.getCollisionObservable().add((collider) => {
                if(collider.collidedAgainst === this.localObjects[0].getMesh().physicsBody) {
                    object.accept(this);
                }
            });
        }

        const networkManager = NetworkManager.getInstance();
        networkManager.sendUpdate("createObject", {
            id: object.getId(),
            owner: this.playerId,
            position: object.getMesh().position,
            type: object.getType(),
        });
    }

    public addNetworkObject(object: GameObject, id: string, ownerId: string): void {
        if(ownerId === this.playerId) {
            this.localObjects.push(object);
        }
        else {
            const remoteObject = new RemoteGameObject(object, id, ownerId);
            this.addRemoteObject(remoteObject);
        }
    }

    private removeLocalObject(object: GameObject): void {
        if(object.getMesh().physicsBody) {
            object.getMesh().physicsBody.dispose();
            object.getMesh().physicsBody = null;
        }
        object.getMesh().dispose();

        this.localObjects = this.localObjects.filter(o => object !== o);
        const networkManager = NetworkManager.getInstance();
        networkManager.sendUpdate("removeObject", {
            id: object.getId(),
            owner: this.playerId
        });
    }

    private updateLocalObject(object: GameObject, dt: number, input: CharacterInput): void {
        // update locally
        object.update(dt, input);
        // Send update to others
        const networkManager = NetworkManager.getInstance();
        networkManager.sendUpdate("updateObject", {
            id: object.getId(),
            owner: this.playerId,
            position: object.getMesh().position,
            timestamp: this.timestamp,
        });
    }

    public onObjectCreated(object: GameObject): void {
        this.gameObjects.push(object);
    }

    public visitVictory(portal: VictoryCondition): void {
        const state = this.state as InGameState;
        state.setCondition(portal);
    }

    public visitCoin(coin: Coin): void {
        this.score += coin.getScore();
        this.removeLocalObject(coin);

        if(this.score >= this.powerupScore) {
            this.addAction();
            this.score = this.score % this.powerupScore;
        }
    };

    public visitEnemy(enemy: Enemy): void {
        
    }

    public addAction() {
        // randomly create an action to add to inventory
        const action = Action.ActionBase.create(Math.floor(Math.random() * 3), this);
        if(action) {
            // add it to first non null slot
            for(let i = 0; i < this.inventory.length; i++) {
                if(this.inventory[i] === null) {
                    this.inventory[i] = action;
                    break;
                }
            }
        }
    }

    public updateObjects(dt: number, input: CharacterInput) {
        this.gameObjects.forEach((object) => {
            object.update(dt, input);
            if(object.getMesh().name === Platform.Type && this.isInSubcube(object.getMesh().position) && this.coinTimer >= this.coinInterval && Math.random() < 1/this.gameObjects.length) {
                const position = object.getMesh().position.clone();

                const coin = this.coinSpawner.spawnCoin(position);;
                this.addLocalObject(coin);
                this.coinTimer = 0;
            }
        });

        this.localObjects.forEach((object) => this.updateLocalObject(object, dt, input));
        this.remoteObjects.forEach((object) => object.update(dt, input));
        this.timestamp += dt;
        this.coinTimer += dt;

        this.showScore();
        this.showActions();
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

    public updateRemoteObject(objectId: string, participantId: string, position: Vector3, timestamp: number) {
        const remoteObject = this.remoteObjects.find(object => object.getId() === objectId && object.getOwnerId() === participantId);
        if(remoteObject) {
            // console.log("Updating remote object", objectId, participantId, position, timestamp);
            remoteObject.updatePosition(position, timestamp);
        }
    }

    public render(): void {
        this.state.render();
    }

    public getScene() : Scene {
        return this.scene;
    }

    public onRetry() {
        
    }

    public onQuit() {
        
    }
}
