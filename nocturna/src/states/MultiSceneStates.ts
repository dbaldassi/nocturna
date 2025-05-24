import { Vector3 } from "@babylonjs/core";
import { Coin, CoinFactory, SuperCoin, SuperCoinFactory } from "../GameObjects/Coin";
import { FixedPlatform, FixedPlatformFactory, ParentedPlatform, ParentedPlatformFactory } from "../GameObjects/Platform";
import { Player, PlayerFactory } from "../GameObjects/Player";
import { FixedRocket, FixedRocketFactory } from "../GameObjects/Rocket";
import { SpikeTrapFactory, SpikeTrapObject } from "../GameObjects/SpikeTrap";
import { VictoryCondition, VictoryConditionFactory } from "../GameObjects/Victory";
import { LooseCondition } from "../Loose";
import { NetworkManager, NetworkObserver } from "../network/NetworkManager";
import { MultiScene } from "../scene/MultiScene";
import { CharacterInput, GameObject, GameObjectConfig, GameObjectFactory } from "../types";
import { LevelLoader, LevelLoaderObserver } from "../LevelLoader";
import { Cube } from "../Cube";
import { RemoteGameObject } from "../GameObjects/RemoteGameObject";
import { Lobby, LobbyObserver } from "../Lobby";
import { ParentNode } from "../ParentNode";

type Participant = {
    id: string;
    ready: boolean;
    num: number;
}

export abstract class AbstractGameSceneState implements NetworkObserver {
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

export class InGameState extends AbstractGameSceneState {
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

    public enter(): void {
        this.gameScene.setupUI();
        this.gameScene.setupCamera();
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

export class LoadingState extends AbstractGameSceneState implements LevelLoaderObserver {
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
        this.localPlayer.ready = false;
        this.remoteParticipant.forEach(p => p.ready = false);

        const networkManager = NetworkManager.getInstance();
        networkManager.setObserver(this);

        this.gameScene.createGameScene().then(() => {
            this.levelLoader = new LevelLoader(this.gameScene.getScene(), this, 
            { create: (factory: GameObjectFactory, config: GameObjectConfig) => factory.create(config) } );
            this.levelLoader.loadLevel("multi.json");
        });
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
        cube.setCollisionObserver(this.gameScene);
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

export class EndState extends AbstractGameSceneState {
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

export class LobbyState extends AbstractGameSceneState implements LobbyObserver {
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
        this.lobby.eraseMenu();
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