import { AssetsManager, Vector3 } from "@babylonjs/core";
import { Coin, CoinFactory, SuperCoin, SuperCoinFactory } from "../GameObjects/Coin";
import { FixedPlatform, FixedPlatformFactory, ParentedPlatform, ParentedPlatformFactory } from "../GameObjects/Platform";
import { Player, PlayerFactory } from "../GameObjects/Player";
import { FixedRocket, FixedRocketFactory } from "../GameObjects/Rocket";
import { SpikeTrapFactory, SpikeTrapObject } from "../GameObjects/SpikeTrap";
import { VictoryCondition, VictoryConditionFactory } from "../GameObjects/Victory";
import { NetworkManager, NetworkObserver } from "../network/NetworkManager";
import { MultiScene } from "../scene/MultiScene";
import { CharacterInput, GameObject, GameObjectConfig, GameObjectFactory, Utils } from "../types";
import { LevelLoader, LevelLoaderObserver } from "../LevelLoader";
import { Cube } from "../Cube";
import { RemotePlayer } from "../GameObjects/RemoteGameObject";
import { Lobby, LobbyObserver } from "../Lobby";
import { ParentNode } from "../ParentNode";
import { createMultiLoseScreenHUD, createMultiWinScreenHUD, IEndScreenHUD, IEndScreenHUDListener } from "../HUD/EndScreenHUD";
import { NocturnaAudio } from "../NocturnaAudio";

type Participant = {
    id: string;
    ready: boolean;
    num: number;
}

/**
 * AbstractGameSceneState is the abstract base class for all multiplayer scene states.
 * 
 * - Provides a common interface for state transitions, rendering, and network events.
 * - Stores a reference to the associated MultiScene.
 * - Implements NetworkObserver for multiplayer communication.
 * - Subclasses implement specific logic for each state (lobby, loading, in-game, etc.).
 */
export abstract class AbstractGameSceneState implements NetworkObserver {
    protected gameScene: MultiScene;

    constructor(gameScene: MultiScene) {
        this.gameScene = gameScene;
    }

    public enter(): void {}
    public exit(): void {}
    public render(): void {}

    public update(_: number, __: CharacterInput): AbstractGameSceneState | null {
        return null;
    }

    // NetworkObserver methods (default: no-op)
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

/**
 * InGameState handles the main multiplayer gameplay loop.
 * 
 * - Updates all game objects, spawns objects, and updates the UI.
 * - Checks for player death or victory conditions.
 * - Handles network messages for object updates, creation, removal, and player reports.
 */
export class InGameState extends AbstractGameSceneState {
    private factories : Map<string, GameObjectFactory>;
    private assetsManager: AssetsManager;

    constructor(gameScene: MultiScene) {
        super(gameScene);
        this.assetsManager = new AssetsManager(gameScene.getScene());
        this.assetsManager.useDefaultLoadingScreen = false;

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

    public exit(): void {
        this.gameScene.clearUI();
        this.gameScene.removePlayer();
    }


    public update(dt: number, input: CharacterInput): AbstractGameSceneState|null {
        this.gameScene.spawnObject(dt);
        this.gameScene.updateObjects(dt, input);
        this.gameScene.updateUI();

        const alive = this.gameScene.updatePlayer();
        if(!alive) return new DeadState(this.gameScene);

        if( this.gameScene.getLeftRemotePlayer() == 0) {
            return new WinningState(this.gameScene);
        }

        return null;
    }

    public render(): void {
        this.gameScene.getScene().render();
    }

    public onParticipantLeft(id: string): void {
        console.log("Participant left:", id);
        this.gameScene.removeRemotePlayer(id);
    }

    public onPeerMessage(participantId: string, action: string, data: any): void {
        if(action === "updateObject") {
            this.gameScene.updateRemoteObject(data.id, participantId, data.position, data.timestamp);
        }
        else if(action === "createObject") {
            const factory = this.factories.get(data.type);
            if(!factory) return;

            const config: GameObjectConfig = {
                position: Utils.createVec3FromData(data.position),
                size: Utils.createVec3FromData(data.size),
                rotation: Vector3.Zero(),
                scene: this.gameScene.getScene(),
                parent: this.gameScene.getParent(),
                assetsManager: this.assetsManager,
            };
            const object = factory.create(config);
            this.assetsManager.onFinish = () => {
                this.gameScene.addNetworkObject(object, data.id, data.owner);
            };

            this.assetsManager.load();

            if(object && object.getMesh()) this.gameScene.addNetworkObject(object, data.id, data.owner);
        }
        else if(action === "removeObject") {
            this.gameScene.removeRemoteObject(data.id, data.owner);
        }
        else if(action === "playerReport") {
            this.gameScene.updateRemotePlayer(data.id, { score: data.score, hp: data.hp, inventory: data.inventory });
        }
        else if(action === "win") {
            this.gameScene.killPlayer();
        }
        else if(action === "objectContact") {
            this.gameScene.onRemoteObjectContact(data.id, data.owner);
        }
        else if(action === "rotate") {
            this.gameScene.rotate(data.axis);
        }
    }
}

/**
 * ActionSelectionState handles the action selection phase for multiplayer.
 * 
 * - Allows players to select actions or objects before resuming gameplay.
 * - Updates the camera and objects with a "fake" input (no movement).
 */
export class ActionSelectionState extends InGameState {
    private fakeInput: CharacterInput = {
        left: false,
        right: false,
        up: false,
        down: false,
        jump: false,
        forward: false,
        backward: false,
    };

    constructor(gameScene: MultiScene) {
        super(gameScene);
    }

    public update(dt: number, input: CharacterInput): AbstractGameSceneState|null {
        this.gameScene.updateSelectCamera(dt, input);
        this.gameScene.updateObjects(dt, this.fakeInput);
        return null;
    }
}

/**
 * DeadState handles the state when the local player is dead.
 * 
 * - Sets up the dead camera.
 * - Waits for the end of the game (win/lose) based on remaining players.
 */
export class DeadState extends InGameState {

    constructor(gameScene: MultiScene) {
        super(gameScene);
    }

    public enter(): void {
        this.gameScene.setupDeadCamera();
    }

    public exit(): void {

    }

    public update(dt: number, input: CharacterInput): AbstractGameSceneState|null {
        this.gameScene.updateObjects(dt, input);

        if(this.gameScene.getLeftRemotePlayer() == 1) return new LosingState(this.gameScene);

        return null;
    }
};

/**
 * LoadingState represents the loading phase of the multiplayer scene.
 * 
 * - Loads the level and assigns players to subcubes.
 * - Waits for all players to be ready before starting the game.
 * - Implements LevelLoaderObserver for level loading callbacks.
 */
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

    public exit(): void {
        NocturnaAudio.getInstance().then(audio => {
            audio.setBackgroundMusic("assets/music/background.mp3");
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
                    const remotePlayer = new RemotePlayer(player, participant.id, participant.id, subcube);
                    // add remote object
                    this.gameScene.addRemotePlayer(remotePlayer);
                }
                else {
                    player.getMesh().physicsBody.dispose();
                    player.getMesh().dispose();
                }
            }
        });

        this.gameScene.setupCollisions();

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

/**
 * WinningState handles the end-of-game win screen in multiplayer.
 * 
 * - Displays the multiplayer win HUD.
 * - Handles HUD disposal and user actions (continue, retry, quit).
 */
export class WinningState extends AbstractGameSceneState implements IEndScreenHUDListener {
    private hud: IEndScreenHUD;
    
    constructor(scene: MultiScene) {
        super(scene);
    }

    render(): void {}
    enter(): void {
        this.hud = createMultiWinScreenHUD(this);
    }
    exit() {
        this.hud.dispose();
        this.hud = null;
    }

    public update(dt: number, input: CharacterInput): AbstractGameSceneState | null {
        this.hud.update(dt, input);
        return null;
    }

    public onRetry(): void {}
    public onContinue(): void {}
    public onQuit(): void { window.location.reload(); }
}

/**
 * LosingState handles the end-of-game lose screen in multiplayer.
 * 
 * - Displays the multiplayer lose HUD.
 * - Handles HUD disposal and user actions (continue, retry, quit).
 */
export class LosingState extends AbstractGameSceneState implements IEndScreenHUDListener {
    private hud: IEndScreenHUD;

    constructor(gameScene: MultiScene) {
        super(gameScene);
    }
    public render(): void {}
    public enter(): void {
        this.hud = createMultiLoseScreenHUD(this);
    }
    public exit(): void {
        this.hud.dispose();
        this.hud = null;
    }
    public update(dt: number, input: CharacterInput): AbstractGameSceneState | null {
        this.hud.update(dt, input);
        return null;
    }
    public onRetry(): void {}
    public onContinue(): void {}
    public onQuit(): void { window.location.reload(); }
}

/**
 * LobbyState manages the multiplayer lobby before the game starts.
 * 
 * - Handles room creation/joining, player list management, and readiness.
 * - Waits for all players to be ready before transitioning to LoadingState.
 * - Implements LobbyObserver for lobby UI and network events.
 */
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