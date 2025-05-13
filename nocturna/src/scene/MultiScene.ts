import { Engine, Vector3, FollowCamera, UniversalCamera, Scene } from "@babylonjs/core";


import { BaseScene } from "./BaseScene";
import { Cube } from "../Cube";
import { ParentNode } from "../ParentNode";
import { InputHandler } from "../InputHandler";
import { Player } from "../GameObjects/Player";
import { GameObject, GameObjectFactory, GameObjectVisitor, GameObjectConfig, CharacterInput, EndConditionObserver } from "../types";
import { LevelLoaderObserver, LevelLoader } from "../LevelLoader";
import { VictoryCondition } from "../GameObjects/Victory";
import { LooseCondition } from "../Loose";
import { Lobby, LobbyObserver } from "../Lobby";

import { NetworkManager, NetworkObserver } from "../network/NetworkManager";

export class MultiScene extends BaseScene implements LevelLoaderObserver, GameObjectVisitor, EndConditionObserver, NetworkObserver {
    
    private networkManager: NetworkManager;
    private cube: Cube;
    private parent: ParentNode;
    private player: Player;
    private gameObjects: GameObject[] = [];
    private levelLoader: LevelLoader;
    private loseCondition: LooseCondition; // Replace with the actual type if available
    private state : AbstractGameSceneState;

    constructor(engine: Engine, inputHandler: InputHandler) {
        super(engine, inputHandler);
        this.levelLoader = new LevelLoader(this.scene, this, 
            { create: (factory: GameObjectFactory, config: GameObjectConfig) => factory.create(config) } );
    }

    static async createScene(engine: Engine, inputHandler: InputHandler): Promise<BaseScene> {
        const scene = new MultiScene(engine, inputHandler);
        scene.networkManager = NetworkManager.getInstance();
        // scene.enableDebug();

        const camera = new UniversalCamera("camera1", Vector3.Zero(), scene.scene);
        scene.scene.activeCamera = camera;

        scene.state = new LobbyState(scene);
        scene.state.enter();

        return scene;
    }
    
    private async loadLevel(file: string) {
        await this.addPhysic();
        // this.currentLevel = new Level(this.scene, this.parent, this.cube, CUBE_SIZE);
        this.levelLoader.loadLevel(file);
    }

    public onCube(cube: Cube): void {
        this.cube = cube;
    }
    public onPlayer(player: Player): void {
        this.player = player;
    }
    public onParent(parent: ParentNode): void {
        this.parent = parent;
    }
    public onLevelLoaded(): void {
        
        this.state.exit();
        this.state = new InGameState(this);
        this.state.enter();
    }

    private setupCollisions() {

    }

    private setupCamera() {

    }

    public onObjectCreated(object: GameObject): void {
        this.gameObjects.push(object);
    }

    public visitVictory(portal: VictoryCondition): void {
        const state = this.state as InGameState;
        state.setCondition(portal);
    }

    public updateObjects(dt: number, input: CharacterInput) {
        this.gameObjects.forEach((object) => {
            object.update(dt, input);
        });
        // this.player.update(dt, input);
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

    // ------------------------------------------------
    // -------------------- NETWORK --------------------
    // ------------------------------------------------
    public onRoomCreated(_: string): void {}
    public onRoomCreationFailed(_: string): void {}
    public onRoomJoined(_: string): void {}
    public onRoomJoinFailed(_: string): void {}
    public onParticipantJoined(_: string): void {}
    public onParticipantLeft(_: string): void {}
    public onConnectionEstablished(_: string): void {}

    public onUpdate(participantId: string, action: string, data: any): void {
        console.log("Update received from participant:", participantId, action, data);
    }
}

// ------------------------------------------------
// -------------------- STATES --------------------
// ------------------------------------------------

abstract class AbstractGameSceneState {
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
}

class InGameState extends AbstractGameSceneState {
    private condition: VictoryCondition | LooseCondition;

    constructor(gameScene: MultiScene) {
        super(gameScene);
        this.condition = null;
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
}

class LoadingState extends AbstractGameSceneState {

    constructor(gameScene: MultiScene) {
        super(gameScene);
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

class LobbyState extends AbstractGameSceneState implements NetworkObserver, LobbyObserver {
    private networkManager: NetworkManager;
    private lobby: Lobby;
    private playerId: string;
    private ready: boolean = false;
    private remoteParticipant: {id: string, ready: boolean}[] = [];

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
    }
    public onRoomCreated(roomId: string): void {
        console.log("Room created:", roomId);
        this.networkManager.joinRoom(roomId, this.playerId);
    }
    public onRoomCreationFailed(reason: string): void {
        console.error("Room creation failed:", reason);
        this.lobby.eraseMenu();
        this.lobby.showError(reason);
    }
    public onRoomJoined(roomId: string, playerId: string, participants: string[]): void {
        console.log("Room joined:", roomId, playerId, participants);
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
        this.remoteParticipant.push({id: participantId, ready: false});
    }
    public onParticipantLeft(participantId: string): void { 
        console.log("Participant left:", participantId);
        this.lobby.removePlayer(participantId);
    }
    public onUpdate(participantId: string, action: string, data: any): void {
        console.log("Update received from participant:", participantId, action, data);

        if(action === "ready") {
            this.lobby.setPlayerReady(participantId);
            const participant = this.remoteParticipant.find(p => p.id === participantId);
            if(participant) {
                participant.ready = true;
            }
        }
    }

    public onConnectionEstablished(_: string): void {
        if(this.ready) {
            this.networkManager.sendUpdate("ready", {});
        }
    }

    public onRoomCreation(playerId: string) : void {
        this.playerId = playerId;
        this.networkManager.createRoom();
    }

    public onRoomJoin(roomId: string, playerId) : void {
        this.networkManager.joinRoom(roomId, playerId);
    }

    public onReady() : void {
        this.networkManager.sendUpdate("ready", {});
        this.ready = true;
    }

    public update(_: number, __: CharacterInput): AbstractGameSceneState | null {
        return null;
    }

    public render(): void {
        this.gameScene.getScene().render();
    }
}