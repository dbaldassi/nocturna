import { Engine, Vector3, FollowCamera, UniversalCamera, Scene, Camera, WebGPUEngine, PhysicsBody } from "@babylonjs/core";

import { BaseScene } from "./BaseScene";
import { ParentNode } from "../ParentNode";
import { InputHandler } from "../InputHandler";
import { GameObject, GameObjectVisitor, GameObjectConfig, CharacterInput, EndConditionObserver, IRemoteGameObject, Enemy } from "../types";
import { VictoryCondition } from "../GameObjects/Victory";
import { LooseCondition } from "../Loose";

import { NetworkManager } from "../network/NetworkManager";
import { RemoteGameObject, RemotePlayer } from "../GameObjects/RemoteGameObject";
import { Coin, CoinFactory, SuperCoinFactory } from "../GameObjects/Coin";
import { Platform } from "../GameObjects/Platform";
import { AbstractGameSceneState, InGameState, LobbyState } from "../states/MultiSceneStates";
import { AdvancedDynamicTexture, Control, TextBlock } from "@babylonjs/gui";
import { Action } from "../action";
import { HpBar } from "../HpBar";
import { Player } from "../GameObjects/Player";
import { CubeCollisionObserver } from "../Cube";

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

export class MultiScene extends BaseScene implements GameObjectVisitor, CubeCollisionObserver {
    public static readonly MaxPlayer: number = 4;

    private readonly coinInterval: number = 10000; // 1 second
    private readonly inventorySize: number = 3;
    private readonly powerupScore: number = 20;

    private gameObjects: GameObject[] = [];
    private remoteObjects: IRemoteGameObject[] = [];
    private localObjects: GameObject[] = [];
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
    private hpBar: HpBar;
    private gui: AdvancedDynamicTexture;

    public activeCameraIndex: number = 0;
    private inventoryTextBlocks: any[];
    private remotePlayers: RemotePlayer[] = [];

    constructor(engine: Engine, inputHandler: InputHandler) {
        super(engine, inputHandler);
    }

    // =========================
    // === INITIALISATION/UI ===
    // =========================

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
            this.inputHandler.addAction(`action_${i+1}`, () => {
                if(this.inventory[i]) {
                    this.inventory[i].execute();
                    this.inventory[i] = null;
                }
            });
        }
        await this.addPhysic();
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
        this.scoreText.left = "20px";
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
            itemText.left = `${340 + i * (slotWidth + 10)}px`;
            itemText.top = "-20px";
            gui.addControl(itemText);
            this.inventoryTextBlocks.push(itemText);
        }
        this.gui = gui;
        const player = this.localObjects[0] as Player;
        this.hpBar = new HpBar(player.getMaxHp());
    }

    public clearUI() {
        this.gui.dispose();
        this.gui = null;
    }

    // =========================
    // === CAMERA            ===
    // =========================

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

    public setupDeadCamera() {
        this.cameras.forEach(camera => camera.dispose());
        this.cameras = [new UniversalCamera("wide", Vector3.Zero(), this.scene)];
        this.cameras[0].fov = Math.PI / 2;
        this.activeCameraIndex = 0;
        this.remotePlayers.forEach(player => {
            if(player.isAlive()) {
                const camera = new FollowCamera(`dead_camera_${player.getId()}`, Vector3.Zero(), this.scene, player.getMesh());
                camera.radius = 500;
                camera.rotationOffset = 180;
                this.cameras.push(camera);
            }
        });
        this.inputHandler.addAction("pov", () => this.switchDeadCamera());
        this.scene.activeCamera = this.cameras[this.activeCameraIndex];
    }

    public switchCamera() {
        this.activeCameraIndex = (this.activeCameraIndex + 1) % this.cameras.length;
        this.scene.activeCamera = this.cameras[this.activeCameraIndex];
    }

    public switchDeadCamera() {
        let checked = 0;
        let found = false;

        while (checked < this.cameras.length) {
            this.activeCameraIndex = (this.activeCameraIndex + 1) % this.cameras.length;

            // On considère que la première caméra (index 0) est la vue large (pas liée à un joueur)
            if (this.activeCameraIndex === 0) {
                this.scene.activeCamera = this.cameras[this.activeCameraIndex];
                found = true;
                break;
            }

            const camera = this.cameras[this.activeCameraIndex] as FollowCamera;
            // Pour les FollowCamera, on vérifie que le joueur est en vie
            const player = this.remotePlayers.find(
                p => camera.lockedTarget && p.getMesh() === camera.lockedTarget && p.isAlive()
            );

            if (player) {
                this.scene.activeCamera = camera;
                found = true;
                break;
            } else {
                // Supprime la caméra qui ne filme plus un joueur vivant
                camera.dispose();
                this.cameras.splice(this.activeCameraIndex, 1);
                // On ne fait pas avancer activeCameraIndex car on vient de supprimer l'élément courant
                if (this.activeCameraIndex >= this.cameras.length) {
                    this.activeCameraIndex = 0;
                }
            }
            checked++;
        }

        // Si aucune caméra valide trouvée, repasse sur la vue large
        if (!found && this.cameras.length > 0) {
            this.activeCameraIndex = 0;
            this.scene.activeCamera = this.cameras[0];
        }
    }

    // =========================
    // === GETTERS/SETTERS   ===
    // =========================

    public getScene() : Scene {
        return this.scene;
    }

    public getParent(): ParentNode {
        return this.parent;
    }

    public getLeftRemotePlayer(): number {
        return this.remotePlayers.filter(player => player.isAlive()).length;
    }

    // =========================
    // === SHOW / UPDATE UI  ===
    // =========================

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
                textBlock.alpha = 1;
            } else {
                textBlock.text = "";
                textBlock.alpha = 0;
            }
        });
    }

    public updateUI() {
        this.showScore();
        this.showActions();
    }

    // =========================
    // === LOCAL OBJECTS     ===
    // =========================

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
        object.update(dt, input);
        const networkManager = NetworkManager.getInstance();
        networkManager.sendUpdate("updateObject", {
            id: object.getId(),
            owner: this.playerId,
            position: object.getMesh().position,
            timestamp: this.timestamp,
        });
    }

    public addPlayer(player: Player, id: string, subcube: number): void {
        player.setId(id);
        this.localObjects.push(player);
        this.subcube = subcube; 
        this.playerId = id;
    }

    public removePlayer(): void {
        const player = this.localObjects[0] as Player;
        this.inventory.fill(null);
        this.score = 0;
        player.getMesh().physicsBody?.dispose();
        player.getMesh().dispose();
        this.localObjects = this.localObjects.filter(o => o !== player);
    }

    // =========================
    // === REMOTE OBJECTS    ===
    // =========================

    public addRemoteObject(object: IRemoteGameObject): void {
        this.remoteObjects.push(object);
    }

    public addRemotePlayer(player: RemotePlayer): void {
        this.remotePlayers.push(player);
    }

    public updateRemotePlayer(id: string, report: any): void {
        const remotePlayer = this.remotePlayers.find(p => p.getId() === id);
        console.log(`Updating remote player with id ${id}`, report, this.remotePlayers);
        if(remotePlayer) {
            remotePlayer.score = report.score;
            remotePlayer.hp = report.hp;
            remotePlayer.inventory = [...report.inventory];

            // if the remote player is dead, we remove the dead camera
            if(!remotePlayer.isAlive()) {
                const cameraIndex = this.cameras.findIndex(camera => camera.name === `dead_camera_${id}`);
                if(cameraIndex !== -1) {
                    this.cameras[cameraIndex].dispose();
                    this.cameras.splice(cameraIndex, 1);
                }
            }
        } else {
            console.warn(`Remote player with id ${id} not found.`);
        }
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

    // =========================
    // === NETWORK OBJECTS   ===
    // =========================

    public addNetworkObject(object: GameObject, id: string, ownerId: string): void {
        if(ownerId === this.playerId) {
            this.localObjects.push(object);
        }
        else {
            const remoteObject = new RemoteGameObject(object, id, ownerId);
            this.addRemoteObject(remoteObject);
        }
    }

    // =========================
    // === GAME LOGIC        ===
    // =========================

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
        // ...
    }

    public addAction() {
        const action = Action.ActionBase.create(Math.floor(Math.random() * 3), this);
        if(action) {
            for(let i = 0; i < this.inventory.length; i++) {
                if(this.inventory[i] === null) {
                    this.inventory[i] = action;
                    break;
                }
            }
        }
    }

    public updatePlayer() : boolean {
        const player = this.localObjects[0] as Player;
        this.hpBar.update(player.getHp());
        const networkManager = NetworkManager.getInstance();
        networkManager.sendUpdate("playerReport", {
            id: this.playerId,
            score: this.score,
            hp: player.getHp(),
            inventory: this.inventory.map(action => action ? action.getName() : null),
        });
        return player.isAlive();
    }

    public spawnObject(dt: number): void {
        this.gameObjects.forEach((object) => {
            if(object.getMesh().name === Platform.Type && this.isInSubcube(object.getMesh().position) && this.coinTimer >= this.coinInterval && Math.random() < 1/this.gameObjects.length) {
                const position = object.getMesh().position.clone();
                const coin = this.coinSpawner.spawnCoin(position);
                this.addLocalObject(coin);
                this.coinTimer = 0;
            }
        });
        this.coinTimer += dt;
    }

    public updateObjects(dt: number, input: CharacterInput) {
        this.gameObjects.forEach((object) => object.update(dt, input));
        this.localObjects.forEach((object) => this.updateLocalObject(object, dt, input));
        this.remoteObjects.forEach((object) => object.update(dt, input));
        this.remotePlayers.forEach((player) => player.update(dt, input));
        this.timestamp += dt;
    }

    public update(dt: number) {
        const input = this.inputHandler.getInput();
        const newState = this.state.update(dt, input);
        if(newState) {
            this.state.exit();
            this.state = newState;
            this.state.enter();
        }
    }

    public updateRemoteObject(objectId: string, participantId: string, position: Vector3, timestamp: number) {
        let remoteObject = this.remoteObjects.find(object => object.getId() === objectId && object.getOwnerId() === participantId) ||
            this.remotePlayers.find(player => player.getId() === objectId && player.getOwnerId() === participantId);
        if(remoteObject) remoteObject.updatePosition(position, timestamp);
    }

    public render(): void {
        this.state.render();
    }

    // =========================
    // === UTILS / MISC      ===
    // =========================

    public addParent(parent: ParentNode): void {
        this.parent = parent;
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

    public onBottomCollision(collider: PhysicsBody) {
        const player = this.localObjects[0] as Player;
        if(player.getMesh().physicsBody === collider) {
            player.kill();
        }
    }
}