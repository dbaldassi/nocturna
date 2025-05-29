import { RemoteParticipant, RTCSignaling, RemoteParticipantObserver } from "./RemoteParticipant";

/**
 * NetworkObserver defines the interface for objects that want to observe network events,
 * such as room creation/joining, participant changes, connection establishment, and peer messages.
 */
export interface NetworkObserver {
    onRoomJoined(roomId: string, playerId: string, participants: string[]): void;
    onRoomJoinFailed(reason: string): void;
    onRoomCreated(roomId: string): void;
    onRoomCreationFailed(reason: string): void;
    onParticipantJoined(participantId: string): void;
    onParticipantLeft(participantId: string): void;
    onConnectionEstablished(remoteId: string): void;
    onPeerMessage(participantId: string, action: string, data: any): void;
}

/**
 * NetworkManager handles all networking for multiplayer, including:
 * - WebSocket connection to the signaling server for lobby management and WebRTC signaling.
 * - Room creation, joining, and participant management.
 * - Peer-to-peer connection setup using WebRTC (offers, answers, ICE candidates).
 * - Sending and receiving game updates between participants.
 * - Notifying observers of network events.
 * 
 * Implements the singleton pattern: use NetworkManager.getInstance() to get the instance.
 */
export class NetworkManager implements RTCSignaling, RemoteParticipantObserver {
    private static instance: NetworkManager;
    private socket: WebSocket | null = null;
    private isConnected: boolean = false;
    private observers: NetworkObserver = null;
    private roomId: string | null = null;
    private id: string | null = null;
    private remoteParticipant: RemoteParticipant[] = [];

    // WebSocket command constants
    private static readonly JOIN_CMD = "join";
    private static readonly CREATE_CMD = "create";
    private static readonly LEAVE_CMD = "leave";
    private static readonly LIST_CMD = "list";
    private static readonly DELETE_CMD = "delete";
    private static readonly NEW_PARTICIPANT_CMD = "new_participant";
    private static readonly LEFT_PARTICIPANT_CMD = "left_participant";
    public static readonly ROOM_PARTICIPANTS_CMD = "room_participants";
    private static readonly CALL_CMD = "call";
    public static readonly ANSWER_CMD = "answer";
    private static readonly ICE_CANDIDATE_CMD = "ice_candidate";

    /**
     * Private constructor for singleton pattern.
     * Initializes the WebSocket connection to the signaling server.
     */
    private constructor() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        const protocol = window.location.protocol === "http:" ? "ws" : "wss";
        const host = port ? `${hostname}:${port}` : `${hostname}`;

        const url = `${protocol}://${host}/nocturna-ws`;
        this.createWebsocket(url);
    }

    /**
     * Sets the observer for network events.
     * @param observer - The observer to notify of network events.
     */
    public setObserver(observer: NetworkObserver): void {
        this.observers = observer;
    }

    /**
     * Returns the singleton instance of NetworkManager.
     */
    public static getInstance(): NetworkManager {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }

    /**
     * Creates a WebSocket connection to the given URL.
     * @param url - The WebSocket server URL.
     */
    public createWebsocket(url: string): void {
        if (this.socket) {
            console.warn("Already connected to a WebSocket server.");
            return;
        }

        this.socket = new WebSocket(url, "multi");

        this.socket.addEventListener("open", () => {
            this.isConnected = true;
            console.log("Connected to WebSocket server.");
        });

        this.socket.addEventListener("message", (msg) => this.handleMessage(msg));

        this.socket.addEventListener("close", () => {
            this.isConnected = false;
            console.log("Disconnected from WebSocket server.");
            this.socket = null;
        });

        this.socket.addEventListener("error", (error) => {
            console.error("WebSocket error:", error);
        });
    }

    /**
     * Sends a request to create a new room.
     */
    public createRoom(): void {
        if (!this.socket) {
            console.error("WebSocket is not connected.");
            return;
        }
        const data = {
            cmd: NetworkManager.CREATE_CMD,
        };

        this.socket.send(JSON.stringify(data));
    }

    /**
     * Sends a request to join an existing room.
     * @param roomId - The room ID to join.
     * @param playerId - The player's ID.
     */
    public joinRoom(roomId: string, playerId: string): void {
        if (!this.socket) {
            console.error("WebSocket is not connected.");
            return;
        }
        this.roomId = roomId;
        this.id = playerId;
        const data = {
            cmd: NetworkManager.JOIN_CMD,
            roomId: roomId,
            playerId: playerId,
        };

        this.socket.send(JSON.stringify(data));
    }

    /**
     * Handles the response when joining a room.
     * @param msg - The join message data.
     */
    private handleJoined(msg: any): void {
        if(msg.error) {
            this.observers.onRoomJoinFailed(msg.error);
            return;
        }
        const data = msg.data;

        this.observers.onRoomJoined(this.roomId, this.id, data.participants);
        
        data.participants.forEach((participant: string) => {
            if (participant !== this.id) {
                const remoteParticipant = new RemoteParticipant(participant, this, this);
                this.remoteParticipant.push(remoteParticipant);
                remoteParticipant.call();
            }
        });   
    }

    /**
     * Handles incoming WebSocket messages and dispatches them to the appropriate handler.
     * @param msg - The WebSocket message event.
     */
    private handleMessage(msg: MessageEvent): void {
        const data = JSON.parse(msg.data);
        console.log("Received message:", data);

        const cmd = data.cmd;
        console.log("Command:", cmd, data.cmd, data["cmd"]);
        if (cmd === NetworkManager.NEW_PARTICIPANT_CMD) {
            const participant = new RemoteParticipant(data.id, this, this);
            this.remoteParticipant.push(participant);
            this.observers.onParticipantJoined(data.id);
        }
        else if (cmd === NetworkManager.LEFT_PARTICIPANT_CMD) {
            const participant = this.remoteParticipant.find((p) => p.id === data.id);
            if (participant) {
                this.remoteParticipant = this.remoteParticipant.filter((p) => p.id !== data.id);
                this.observers.onParticipantLeft(data.id);
            }
        }
        else if (cmd === NetworkManager.CREATE_CMD) {
            if (data.error) {
                this.observers.onRoomCreationFailed(data.error);
            } else {
                this.roomId = data.data.id;
                this.observers.onRoomCreated(this.roomId);
            }
        }
        else if (cmd === NetworkManager.JOIN_CMD) {
            this.handleJoined(data);
        }
        else if (cmd === NetworkManager.CALL_CMD) {
            const participant = this.remoteParticipant.find((p) => p.id === data.remoteId);
            console.log("CALL_CMD", participant, this.remoteParticipant);
            if (participant) participant.answer(data.offer);
        }
        else if (cmd === NetworkManager.ANSWER_CMD) {
            const participant = this.remoteParticipant.find((p) => p.id === data.remoteId);
            if (participant) participant.handleAnswer(data.answer);
        }
        else if (cmd === NetworkManager.ICE_CANDIDATE_CMD) {
            const participant = this.remoteParticipant.find((p) => p.id === data.remoteId);
            if (participant) participant.addICECandidate(data.candidate);
        }
        else {
            console.warn("Unknown command:", cmd);
        }
    }

    /**
     * Sends a game update to all remote participants via their data channels.
     * @param action - The action type.
     * @param data - The data payload.
     */
    public sendUpdate(action: string, data: any): void {
        this.remoteParticipant.forEach((participant) => {
            participant.send(this.id, action, data);
        });
    }

    /**
     * Disconnects from the WebSocket server.
     */
    public disconnect(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    // RTCSignaling methods

    /**
     * Sends a WebRTC offer to a remote participant via the signaling server.
     * @param remoteId - The remote participant's ID.
     * @param offer - The RTC session description offer.
     */
    public sendOffer(remoteId: string, offer: RTCSessionDescriptionInit): void {
        this.socket.send(JSON.stringify({
            cmd: NetworkManager.CALL_CMD,
            remoteId: remoteId,
            offer: offer,
        }));
    }

    /**
     * Sends a WebRTC answer to a remote participant via the signaling server.
     * @param remoteId - The remote participant's ID.
     * @param answer - The RTC session description answer.
     */
    public sendAnswer(remoteId: string, answer: RTCSessionDescriptionInit): void {
        this.socket.send(JSON.stringify({
            cmd: NetworkManager.ANSWER_CMD,
            remoteId: remoteId,
            answer: answer,
        }));
    }

    /**
     * Sends an ICE candidate to a remote participant via the signaling server.
     * @param remoteId - The remote participant's ID.
     * @param candidate - The ICE candidate.
     */
    public sendICECandidate(remoteId: string, candidate: RTCIceCandidateInit): void {
        this.socket.send(JSON.stringify({
            cmd: NetworkManager.ICE_CANDIDATE_CMD,
            remoteId: remoteId,
            candidate: candidate,
        }));
    }

    /**
     * Called when a WebRTC data channel is opened with a remote participant.
     * @param remoteId - The remote participant's ID.
     */
    public onDataChannelOpened(remoteId: string): void {
        this.observers.onConnectionEstablished(remoteId);
    }

    /**
     * Called when a WebRTC data channel is closed with a remote participant.
     * @param _ - The remote participant's ID.
     */
    public onDataChannelClosed(_: string): void {
        // No-op
    }

    // RemoteParticipantObserver methods

    /**
     * Called when a remote participant sends an update.
     * @param id - The participant's ID.
     * @param action - The action type.
     * @param data - The data payload.
     */
    public onUpdate(id: string, action: string, data: any): void {
        this.observers.onPeerMessage(id, action, data);
    }
}