import { Engine, Vector3, FollowCamera, UniversalCamera, Scene, Camera, PhysicsBody, ExecuteCodeAction, ActionManager, AssetsManager } from "@babylonjs/core";

import { BaseScene } from "./BaseScene";
import { ParentNode } from "../ParentNode";
import { InputHandler } from "../InputHandler";
import { GameObject, GameObjectVisitor, GameObjectConfig, CharacterInput, IRemoteGameObject, Enemy } from "../types";
import { VictoryCondition } from "../GameObjects/Victory";

import { NetworkManager } from "../network/NetworkManager";
import { RemoteGameObject, RemotePlayer } from "../GameObjects/RemoteGameObject";
import { Coin, CoinFactory, SuperCoinFactory } from "../GameObjects/Coin";
import { Platform } from "../GameObjects/Platform";
import { AbstractGameSceneState, ActionSelectionState, InGameState, LobbyState } from "../states/MultiSceneStates";
import { Action } from "../action";
import { Player } from "../GameObjects/Player";
import { CubeCollisionObserver } from "../Cube";
import { createHUDMulti, IHUDMulti } from "../HUD/MultiHUD";

class CoinSpawner {
    private scene: Scene;
    private coinFactory: CoinFactory;
    private superCoinFactory: SuperCoinFactory;
    private assetManager: AssetsManager;

    constructor(scene: Scene) {
        this.scene = scene;
        this.coinFactory = new CoinFactory();
        this.superCoinFactory = new SuperCoinFactory();
        this.assetManager = new AssetsManager(scene);
        this.assetManager.useDefaultLoadingScreen = false;
    }

    public async spawnCoin(position: Vector3): Promise<Coin> {
        let coin: Coin;
        const config: GameObjectConfig = {
            position: position,
            translation: Vector3.Up(),
            rotation: Vector3.Zero(),
            scene: this.scene,
            assetsManager: this.assetManager
        };

        if(Math.random() > 0.1) coin = this.coinFactory.create(config);
        else coin = this.superCoinFactory.create(config);

        let resolve;
        const promise = new Promise<Coin>((r, _) => {
            resolve = r;
        });
        this.assetManager.onFinish = () => {
            resolve(coin);
        };
        this.assetManager.load();

        return promise;
    }
};

export class MultiScene extends BaseScene implements GameObjectVisitor, CubeCollisionObserver {
    public static readonly MaxPlayer: number = 4;

    private readonly coinInterval: number = 5000; // 1 second
    private readonly inventorySize: number = 3;
    private readonly powerupScore: number = 100;

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
    private hud: IHUDMulti;

    public activeCameraIndex: number = 0;
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
        // this.enableDebug();
        this.coinSpawner = new CoinSpawner(this.scene);
        for(let i = 0; i < this.inventorySize; i++) {
            this.inventory.push(null);
            this.inputHandler.addAction(`action_${i+1}`, () => {
                if(this.inventory[i]) {
                    this.inventory[i].execute();
                    this.inventory[i] = null;
                    this.hud.removeAction(i);
                }
            });
        }
        await this.addPhysic();
    }

    public setupCollisions() {
        this.gameObjects.forEach((object) => {
            if(object.getMesh().physicsBody) {
                object.getMesh().physicsBody.getCollisionObservable().add((collider) => {
                    const player = this.localObjects[0].getMesh().physicsBody;
                    if(collider.collidedAgainst === player) {
                        object.accept(this);
                    }
                });
            }
        });
    }

    public setupUI() {
        const player = this.localObjects[0] as Player;
        this.hud = createHUDMulti(this.scene, this, player.getMaxHp(), this.powerupScore);
        this.remotePlayers.forEach(player => {
            this.hud.addRemotePlayer(player.getId());
        });
    }

    public clearUI() {
        this.hud.dispose();
        this.hud = null;
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
        
    }

    public updateUI() {
        this.hud.updateScore(this.score);
        this.hud.updateHp((this.localObjects[0] as Player).getHp());
    }

    // =========================
    // === LOCAL OBJECTS     ===
    // =========================

    private doAddLocalObject(object: GameObject): void {
        this.localObjects.push(object);
        const body = object.getMesh().physicsBody;
        if(body) {
            body.getCollisionObservable().add((collider) => {
                if(collider.collidedAgainst === this.localObjects[0].getMesh().physicsBody) {
                    object.accept(this);
                }
                const should_destroy = object.onContact();
                const networkManager = NetworkManager.getInstance();
                networkManager.sendUpdate("objectContact", {
                    id: object.getId(),
                    owner: this.playerId,
                });

                if(should_destroy) {
                    this.disposeObject(object, this.localObjects);
                }
            });
        }
    }

    private addLocalObject(object: GameObject): void {
        this.doAddLocalObject(object);

        const networkManager = NetworkManager.getInstance();
        networkManager.sendUpdate("createObject", {
            id: object.getId(),
            owner: this.playerId,
            position: object.getMesh().position,
            type: object.getType(),
        });
    }

    private removeLocalObject(object: GameObject): void {
        this.disposeObject(object, this.localObjects);
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
        this.disposeObject(player, this.localObjects);
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

        if(remotePlayer) {
            remotePlayer.score = report.score;
            remotePlayer.hp = report.hp;
            remotePlayer.inventory = [...report.inventory];

            this.hud.updateRemotePlayer(remotePlayer.getId(), remotePlayer.hp, remotePlayer.score);

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

    public onRemoteObjectContact(objectId: string, ownerId: string): void {
        const object = this.remoteObjects.find(o => o.getId() === objectId && o.getOwnerId() === ownerId);
        if(object && object.onContact()) {
            this.disposeObject(object, this.remoteObjects);
        }
    }

    public removeRemoteObject(id: string, owner: string): void {
        const object = this.remoteObjects.find(o => id === o.getId() && owner === o.getOwnerId());
        this.disposeObject(object, this.remoteObjects);
    }

    public removeRemotePlayer(id: string): void {
        const player = this.remotePlayers.find(p => p.getId() === id);
        console.log(player, this.remotePlayers);
        this.disposeObject(player, this.remotePlayers);
        console.log(this.remotePlayers);

        const todelete = this.remoteObjects.filter(o => o.getOwnerId() === id);
        todelete.forEach(o => this.disposeObject(o, this.remoteObjects));

        this.hud.removeRemotePlayer(id);
    }

    public disposeObject(object: GameObject, container: Array<GameObject>) {
        if(!object) return;

        if(object.getMesh().physicsBody) {
            object.getMesh().physicsBody.dispose();
            object.getMesh().physicsBody = null;
        }
        object.getMeshes().forEach(mesh => mesh.dispose());
        const index = container.indexOf(object);
        if (index !== -1) {
            container.splice(index, 1);
        }
    }

    // =========================
    // === NETWORK OBJECTS   ===
    // =========================

    public addNetworkObject(object: GameObject, id: string, ownerId: string): void {
        if(ownerId === this.playerId) {
            this.doAddLocalObject(object);
        }
        else {
            const remoteObject = new RemoteGameObject(object, id, ownerId);
            this.addRemoteObject(remoteObject);
        }
    }

    // =========================
    // === GAME LOGIC        ===
    // =========================

    public rotate(axis: "x" | "y" | "z"): void {
        this.parent.rotate(axis);
    }

    public onObjectCreated(object: GameObject): void {
        this.gameObjects.push(object);
    }

    public visitVictory(_: VictoryCondition): void {
        const state = this.state as InGameState;
        
        // kill other players
        const networkManager = NetworkManager.getInstance();
        networkManager.sendUpdate("win", {
            id: this.playerId,
        });
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
        const player = this.localObjects[0] as Player;
        player.takeDamage(enemy.getDamage());
    }

    public addAction() {
        const type = Math.floor(Math.random() * Action.Type.LENGTH);
        const action = Action.ActionBase.create(type, this);
        // const action = Action.ActionBase.create(Action.Type.ROCKET, this);
        if(action) {
            for(let i = 0; i < this.inventory.length; i++) {
                if(this.inventory[i] === null) {
                    this.inventory[i] = action;
                    this.hud.addAction(i, type);
                    break;
                }
            }
        }
    }

    public updatePlayer() : boolean {
        const player = this.localObjects[0] as Player;
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
                this.coinSpawner.spawnCoin(position).then((coin: Coin) => {
                    this.addLocalObject(coin);
                });
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

    public updateSelectCamera(dt: number, input: CharacterInput): void {
        // move the camera based on input
        const camera = this.scene.activeCamera as UniversalCamera;
        camera.position.x += (input.right ? 1 : (input.left ? -1 : 0)) * dt;
        camera.position.y += (input.up ? 1 : (input.down ? -1 : 0)) * dt;
    }

    public render(): void {
        this.state.render();
    }

    public selectObjectDrop(callback: Action.SelectObjectCallback): void {
        const camera = new UniversalCamera("selectCamera", Vector3.Zero(), this.scene);
        this.scene.activeCamera = camera;
        // attach to canvas
        this.scene.activeCamera.attachControl(this.engine.getRenderingCanvas(), true);

        this.inputHandler.removeAction("pov");

        this.gameObjects.forEach(obj => {
            const meshes = obj.getMeshes();
            meshes.forEach(mesh => {
                mesh.isPickable = true;
                mesh.actionManager = new ActionManager(this.scene);
                mesh.actionManager.registerAction(
                    new ExecuteCodeAction({ trigger : ActionManager.OnPickTrigger }, () => {
                        // find in which subcube the object is
                        const subcube = this.getSubcube(obj.getMesh().position);
                        const target = this.remotePlayers.find(player => player.getSubcube() === subcube);

                        console.log(target, subcube, obj.getMesh().position);
                        if(target) callback.onSelect(obj, target.getId());
                }));
            });
        });

        this.state = new ActionSelectionState(this);
    }

    public doneSelectingObjectDrop(): void {
        console.log("Done selecting object drop");

        this.gameObjects.forEach(obj => {
            const mesh = obj.getMesh();
            if(mesh.actionManager) {
                mesh.actionManager.dispose();
                mesh.actionManager = null;
            }
        });

        this.inputHandler.addAction("pov", () => this.switchCamera());

        this.scene.activeCamera.detachControl(this.engine.getRenderingCanvas());
        this.scene.activeCamera.dispose();
        this.scene.activeCamera = this.cameras[this.activeCameraIndex];

        this.state = new InGameState(this);
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

    public getSubcube(position: Vector3): number {
        if(position.x < 0 && position.y > 0) return 0;
        if(position.x > 0 && position.y > 0) return 1;
        if(position.x < 0 && position.y < 0) return 2;
        if(position.x > 0 && position.y < 0) return 3;
        return -1;
    }

    public onBottomCollision(collider: PhysicsBody) {
        const player = this.localObjects[0] as Player;
        if(player.getMesh().physicsBody === collider) {
            player.kill();
        }
    }

    public killPlayer() {
        const player = this.localObjects[0] as Player;
        if(player instanceof Player) {
            player.kill();
        }
    }
}