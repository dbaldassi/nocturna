import { Engine, Vector3, FollowCamera, UniversalCamera, Scene, Camera } from "@babylonjs/core";


import { BaseScene } from "./BaseScene";
import { Cube } from "../Cube";
import { ParentNode } from "../ParentNode";
import { InputHandler } from "../InputHandler";
import { Player, PlayerFactory } from "../GameObjects/Player";
import { GameObject, GameObjectFactory, GameObjectVisitor, GameObjectConfig, CharacterInput, EndConditionObserver, IRemoteGameObject } from "../types";
import { LevelLoaderObserver, LevelLoader } from "../LevelLoader";
import { VictoryCondition, VictoryConditionFactory } from "../GameObjects/Victory";
import { LooseCondition } from "../Loose";
import { Lobby, LobbyObserver } from "../Lobby";

import { NetworkManager, NetworkObserver } from "../network/NetworkManager";
import { RemoteGameObject } from "../GameObjects/RemoteGameObject";
import { Coin, CoinFactory, SuperCoin, SuperCoinFactory } from "../GameObjects/Coin";
import { FixedPlatform, FixedPlatformFactory, ParentedPlatform, ParentedPlatformFactory, Platform } from "../GameObjects/Platform";
import { FixedRocket, FixedRocketFactory } from "../GameObjects/Rocket";
import { SpikeTrapFactory, SpikeTrapObject } from "../GameObjects/SpikeTrap";

type Participant = {
    id: string;
    ready: boolean;
    num: number;
}

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
    private readonly coinInterval: number = 10000; // 1 second
    private cameras: Camera[];
    private subcube: number;   
    private parent: ParentNode = null;
    public activeCameraIndex: number = 0;

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
        await this.addPhysic();
    }

    public setupCamera() {
        this.cameras = [
            new UniversalCamera("wide", Vector3.Zero(), this.scene),
            new FollowCamera("player", Vector3.Zero(), this.scene, this.localObjects[0].getMesh()),
        ];
        

        this.cameras[0].fov = Math.PI / 2;
        // (this.cameras[1] as FollowCamera).radius = -500;

        this.scene.activeCamera = this.cameras[this.activeCameraIndex];

        this.inputHandler.addAction("pov", () => this.switchCamera());
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
        console.log("Score: ", this.score);
        this.removeLocalObject(coin);
        
    };

    public updateObjects(dt: number, input: CharacterInput) {
        this.gameObjects.forEach((object) => {
            object.update(dt, input);
            if(object.getMesh().name === Platform.Type && this.isInSubcube(object.getMesh().position) && this.coinTimer >= this.coinInterval && Math.random() < 1/this.gameObjects.length) {
                console.log("Spawning coin");
                const position = object.getMesh().position;
                const coin = this.coinSpawner.spawnCoin(position);;
                this.addLocalObject(coin);
                this.coinTimer = 0;
            }
        });

        this.localObjects.forEach((object) => this.updateLocalObject(object, dt, input));
        this.remoteObjects.forEach((object) => object.update(dt, input));
        this.timestamp += dt;
        this.coinTimer += dt;
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

// ------------------------------------------------
// -------------------- STATES --------------------
// ------------------------------------------------

abstract class AbstractGameSceneState implements NetworkObserver {
    protected gameScene: MultiScene;

    constructor(gameScene: MultiScene) {
        this.gameScene = gameScene;
    }

    public enter(): void {
        // console.log(`Entering state: ${this.constructor.name}`);
    }
    public exit(): void {
       
    }

    public render() : void {}
    public update(_: number, __: CharacterInput): AbstractGameSceneState|null {
        return null;
    }

    public onRoomCreated(_: string): void {}
    public onRoomCreationFailed(_: string): void {}
    public onRoomJoined(_: string, __: string, ___: string[]): void {}
    public onRoomJoinFailed(_: string): void {}
    public onParticipantJoined(_: string): void {}
    public onParticipantLeft(_: string): void {}
    public onConnectionEstablished(_: string): void {}
    public onPeerMessage(participantId: string, action: string, data: any): void {
        console.log("Update received from participant:", participantId, action, data);
    }
}

class InGameState extends AbstractGameSceneState {
    private condition: VictoryCondition | LooseCondition;
    private factories : Map<string, GameObjectFactory>;

    constructor(gameScene: MultiScene, playerId: string) {
        super(gameScene);
        this.condition = null;

        this.factories = new Map<string, GameObjectFactory>();
        this.factories.set(ParentedPlatform.Type, new ParentedPlatformFactory());
        this.factories.set(FixedPlatform.Type, new FixedPlatformFactory());
        this.factories.set(VictoryCondition.Type, new VictoryConditionFactory());
        this.factories.set(Player.Type, new PlayerFactory());
        this.factories.set(FixedRocket.Type, new FixedRocketFactory());
        this.factories.set(SpikeTrapObject.Type, new SpikeTrapFactory());
        this.factories.set(Coin.Type, new CoinFactory());
        this.factories.set(SuperCoin.Type, new SuperCoinFactory());

        const networkManager = NetworkManager.getInstance();
        networkManager.setObserver(this);
    }

    public setCondition(condition: VictoryCondition | LooseCondition) {
        this.condition = condition;
    }

    public update(dt: number, input: CharacterInput): AbstractGameSceneState|null {
        if(this.condition) {
            return new EndState(this.gameScene, this.condition);
        }

        this.gameScene.updateObjects(dt, input);

        return null;
    }

    public render(): void {
        this.gameScene.getScene().render();
    }
    
    public onPeerMessage(participantId: string, action: string, data: any): void {
        if(action === "updateObject") {
            this.gameScene.updateRemoteObject(data.id, participantId, data.position, data.timestamp);
        }
        else if(action === "createObject") {
            const factory = this.factories.get(data.type);
            if(!factory) return;

            const config: GameObjectConfig = {
                position: data.position,
                rotation: Vector3.Zero(),
                scene: this.gameScene.getScene(),
            };
            
            const object = factory.create(config);

            if(object) this.gameScene.addNetworkObject(object, data.id, data.owner);
        }
        else if(action === "removeObject") {
            this.gameScene.removeRemoteObject(data.id, data.owner);
        }
    }
}

class LoadingState extends AbstractGameSceneState implements LevelLoaderObserver {
    private levelLoader: LevelLoader;
    private ready : boolean = false;
    private localPlayer: Participant;
    private remoteParticipant: Participant[];

    private players: Player[] = [];

    constructor(gameScene: MultiScene, localPlayer: Participant, remoteParticipant: Participant[]) {
        super(gameScene);
        this.localPlayer = localPlayer;
        this.remoteParticipant = remoteParticipant;
    }

    public enter(): void {
        this.gameScene.createGameScene();

        this.localPlayer.ready = false;
        this.remoteParticipant.forEach(p => p.ready = false);

        const networkManager = NetworkManager.getInstance();
        networkManager.setObserver(this);

        this.levelLoader = new LevelLoader(this.gameScene.getScene(), this, 
            { create: (factory: GameObjectFactory, config: GameObjectConfig) => factory.create(config) } );

        this.levelLoader.loadLevel("multi.json");
    }

    private findSubcube(player: Player) : number {
        const position = player.getMesh().position;

        if(position.x < 0 && position.y > 0) return 0;
        else if(position.x > 0 && position.y > 0) return 1;
        else if(position.x < 0 && position.y < 0) return 2;
        else if(position.x > 0 && position.y < 0) return 3;

        return -1;
    }

    public onCube(cube: Cube): void {
        // this.cube = cube;
        cube.setupMulti();
    }
    public onPlayer(player: Player): void {
        this.players.push(player);
    }
    public onParent(parent: ParentNode): void {
        this.gameScene.addParent(parent);
    }
    public onLevelLoaded(): void {
        this.players.forEach(player => {
            const subcube = this.findSubcube(player);
            if(subcube === this.localPlayer.num) {
                this.gameScene.addPlayer(player, this.localPlayer.id, this.localPlayer.num);
                this.gameScene.setupCamera();
            }
            else {
                const participant = this.remoteParticipant.find(p => p.num === subcube);
                if(participant) {
                    // create remote object
                    const remotePlayer = new RemoteGameObject(player, player.getId(), participant.id);
                    // add remote object
                    this.gameScene.addRemoteObject(remotePlayer);
                }
                else {
                    player.getMesh().physicsBody.dispose();
                    player.getMesh().dispose();
                }
            }
        });

        const networkManager = NetworkManager.getInstance();
        networkManager.sendUpdate("ready", {});
        this.localPlayer.ready = true;
    }
    public onObjectCreated(object: GameObject): void {
        if(!(object instanceof Player)) {
            this.gameScene.onObjectCreated(object);
        }
    }

    public onPeerMessage(participantId: string, action: string, _: any): void {
        if(action === "ready") {
            const participant = this.remoteParticipant.find(p => p.id === participantId);
            if(participant) participant.ready = true;
        }
    }

    public update(_: number, __: CharacterInput): AbstractGameSceneState|null {
        if(this.localPlayer.ready && this.remoteParticipant.every(p => p.ready)) {
            return new InGameState(this.gameScene, this.localPlayer.id);
        }

        return null;
    }
}

class EndState extends AbstractGameSceneState {
    private endObject : VictoryCondition | LooseCondition;

    constructor(scene: MultiScene, object: VictoryCondition | LooseCondition) {
        super(scene);

        this.endObject = object;
    }

    render(): void {
        // this.gameScene.getScene().render();
    }
    enter(): void {

    }
    exit() {
 
    }

    update(dt: number, input: CharacterInput): AbstractGameSceneState | null {
        this.endObject.update(dt, input);

        return null;
    }    
}

class LobbyState extends AbstractGameSceneState implements LobbyObserver {
    private networkManager: NetworkManager;
    private lobby: Lobby;
    private localPlayer: Participant = { id: null, ready: false, num : null };
    private remoteParticipant: Participant[] = [];

    constructor(gameScene: MultiScene) {
        super(gameScene);
        this.networkManager = NetworkManager.getInstance();
        this.networkManager.setObserver(this);
        this.lobby = new Lobby(gameScene.getScene(), this);
    }

    public enter(): void {
        console.log("Entering Lobby State");
        this.lobby.showStartMenu();
    }
    public exit(): void {
        console.log("Exiting Lobby State");
        this.gameScene.getScene().dispose();
    }
    public onRoomCreated(roomId: string): void {
        console.log("Room created:", roomId);
        this.networkManager.joinRoom(roomId, this.localPlayer.id);
    }
    public onRoomCreationFailed(reason: string): void {
        console.error("Room creation failed:", reason);
        this.lobby.eraseMenu();
        this.lobby.showError(reason);
    }
    public onRoomJoined(roomId: string, playerId: string, participants: string[]): void {
        console.log("Room joined:", roomId, playerId, participants);
        this.localPlayer.id = playerId;
        participants.forEach(p => {
            this.remoteParticipant.push({id: p, ready: false, num: null });
        });
        this.lobby.eraseMenu();
        this.lobby.showPlayerList(roomId, playerId, participants);
    }
    public onRoomJoinFailed(reason: string): void {
        console.error("Room join failed:", reason);
        this.lobby.eraseMenu();
        this.lobby.showError(reason);
    }
    public onParticipantJoined(participantId: string): void {
        console.log("Participant joined:", participantId);
        this.lobby.addPlayer(participantId);
        this.remoteParticipant.push({id: participantId, ready: false, num: null });
    }
    public onParticipantLeft(participantId: string): void { 
        console.log("Participant left:", participantId);
        this.lobby.removePlayer(participantId);
        this.remoteParticipant = this.remoteParticipant.filter(p => p.id !== participantId);
    }
    public onPeerMessage(participantId: string, action: string, data: any): void {
        console.log("Update received from participant:", participantId, action, data);

        if(action === "ready") {
            this.lobby.setPlayerReady(participantId);
            const participant = this.remoteParticipant.find(p => p.id === participantId);
            if(participant) {
                participant.ready = true;
                participant.num = data.num;
            }
        }
    }

    public onConnectionEstablished(_: string): void {
        if(this.localPlayer.ready) {
            this.networkManager.sendUpdate("ready", { num : this.localPlayer.num });
        }
    }

    public onRoomCreation(playerId: string) : void {
        this.localPlayer.id = playerId;
        this.networkManager.createRoom();
    }

    public onRoomJoin(roomId: string, playerId) : void {
        this.networkManager.joinRoom(roomId, playerId);
    }

    public onReady() : void {
        this.localPlayer.num = this.findAvailableNum();
        this.localPlayer.ready = true;
        this.networkManager.sendUpdate("ready", { num : this.localPlayer.num });
        console.log("Ready", this.remoteParticipant);
    }

    public update(_: number, __: CharacterInput): AbstractGameSceneState | null {
        if(this.localPlayer.ready && this.remoteParticipant.every(p => p.ready)) {
            console.log("All players are ready", this.remoteParticipant);
            return new LoadingState(this.gameScene, this.localPlayer, this.remoteParticipant);
        }

        return null;
    }

    public render(): void {
        this.gameScene.getScene().render();
    }

    private findAvailableNum() : number {
        const all = this.remoteParticipant.map(p => p.num);
        for(let i = 0; i < MultiScene.MaxPlayer; i++) {
            if(!all.includes(i)) return i;
        }
        return undefined;
    }
}