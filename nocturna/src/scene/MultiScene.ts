import { Engine, Vector3, FollowCamera, UniversalCamera, Scene } from "@babylonjs/core";


import { BaseScene } from "./BaseScene";
import { Cube } from "../Cube";
import { ParentNode } from "../ParentNode";
import { InputHandler } from "../InputHandler";
import { Player } from "../GameObjects/Player";
import { GameObject, GameObjectFactory, GameObjectVisitor, GameObjectConfig, CharacterInput, EndConditionObserver, IRemoteGameObject } from "../types";
import { LevelLoaderObserver, LevelLoader } from "../LevelLoader";
import { VictoryCondition } from "../GameObjects/Victory";
import { LooseCondition } from "../Loose";
import { Lobby, LobbyObserver } from "../Lobby";

import { NetworkManager, NetworkObserver } from "../network/NetworkManager";
import { RemoteGameObject } from "../GameObjects/RemoteGameObject";

type Participant = {
    id: string;
    ready: boolean;
    num: number;
}

export class MultiScene extends BaseScene implements GameObjectVisitor, EndConditionObserver {
    public static readonly MaxPlayer: number = 4;

    private gameObjects: GameObject[] = [];
    private remoteObjects: IRemoteGameObject[] = [];
    private localObjects: GameObject[] = [];
    private loseCondition: LooseCondition; // Replace with the actual type if available
    private state : AbstractGameSceneState;
    private timestamp: number = 0; 

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
        await this.addPhysic();
        this.setupCamera();        
    }

    private setupCollisions() {

    }

    private setupCamera() {
        const camera = new UniversalCamera("camera1", Vector3.Zero(), this.scene);
        this.scene.activeCamera = camera;
    }

    public addRemoteObject(object: IRemoteGameObject): void {
        this.remoteObjects.push(object);
    }

    public addLocalObject(object: GameObject): void {
        this.localObjects.push(object);
    }

    public onObjectCreated(object: GameObject): void {
        this.gameObjects.push(object);
    }

    public visitVictory(portal: VictoryCondition): void {
        const state = this.state as InGameState;
        state.setCondition(portal);
    }

    public updateObjects(dt: number, input: CharacterInput, playerId: string) {
        this.gameObjects.forEach((object) => {
            object.update(dt, input);
        });
        this.localObjects.forEach((object) => {
            object.update(dt, input);
            const networkManager = NetworkManager.getInstance();
            networkManager.sendUpdate("updateObject", {
                id: /*object.getId()*/ playerId,
                owner: playerId,
                position: object.getMesh().position,
                timestamp: this.timestamp,
            });
        });
        this.remoteObjects.forEach((object) => {
            object.update(dt, input);
        });
        this.timestamp += dt;
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
    private playerId: string;

    constructor(gameScene: MultiScene, playerId: string) {
        super(gameScene);
        this.condition = null;
        this.playerId = playerId;
    }

    public setCondition(condition: VictoryCondition | LooseCondition) {
        this.condition = condition;
    }

    public update(dt: number, input: CharacterInput): AbstractGameSceneState|null {
        if(this.condition) {
            return new EndState(this.gameScene, this.condition);
        }

        this.gameScene.updateObjects(dt, input, this.playerId);

        return null;
    }

    public render(): void {
        this.gameScene.getScene().render();
    }
    
    public onPeerMessage(participantId: string, action: string, data: any): void {
        if(action === "updateObject") {
            this.gameScene.updateRemoteObject(data.id, participantId, data.position, data.timestamp);
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
        console.log("Entering Loading State");

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
        // this.parent = parent;
    }
    public onLevelLoaded(): void {
        this.players.forEach(player => {
            const subcube = this.findSubcube(player);
            if(subcube === this.localPlayer.num) {
                this.gameScene.addLocalObject(player);
            }
            else {
                player.getMesh().physicsBody.dispose();
                player.getMesh().dispose();

                const participant = this.remoteParticipant.find(p => p.num === subcube);
                if(participant) {
                    // create remote object
                    const remotePlayer = new RemoteGameObject(player, participant.id, participant.id);
                    // add remote object
                    this.gameScene.addRemoteObject(remotePlayer);
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
            return new InGameState(this.gameScene);
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