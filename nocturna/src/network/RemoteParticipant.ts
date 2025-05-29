/**
 * RTCSignaling defines the interface for signaling operations required for WebRTC peer connection setup.
 * Implementations must handle sending offers, answers, ICE candidates, and data channel events.
 */
export interface RTCSignaling {
    sendOffer(remoteId: string, offer: RTCSessionDescriptionInit): void;
    sendAnswer(remoteId: string, answer: RTCSessionDescriptionInit): void;
    sendICECandidate(remoteId: string, candidate: RTCIceCandidateInit): void;
    onDataChannelOpened(remoteId: string): void;
    onDataChannelClosed(remoteId: string): void;
}

/**
 * RemoteParticipantObserver defines the interface for receiving updates from remote participants.
 */
export interface RemoteParticipantObserver {
    onUpdate(id: string, action: string, data: any): void;
}

/**
 * RemoteParticipant manages a WebRTC peer-to-peer connection and data channel with a single remote player.
 * 
 * - Handles offer/answer exchange and ICE candidate negotiation.
 * - Manages the RTCDataChannel for sending and receiving game data.
 * - Notifies the observer of incoming messages.
 * - Integrates with a signaling implementation for connection setup.
 */
export class RemoteParticipant {
    /** The unique ID of the remote participant. */
    public id: string;

    private pc: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private signaling: RTCSignaling;
    private observer: RemoteParticipantObserver | null = null;

    /**
     * Constructs a new RemoteParticipant.
     * @param id - The remote participant's ID.
     * @param signaling - The signaling interface for WebRTC setup.
     * @param observer - The observer to notify of incoming messages.
     */
    constructor(id: string, signaling: RTCSignaling, observer: RemoteParticipantObserver) {
        this.observer = observer;
        this.id = id;
        this.signaling = signaling;
    }

    /**
     * Configures the data channel event handlers for open, close, and message events.
     */
    private configureDataChannel(): void {
        this.dataChannel.onopen = () => {
            console.log("Data channel opened with participant:", this.id);
            this.signaling.onDataChannelOpened(this.id);
        };
        this.dataChannel.onclose = () => {
            console.log("Data channel closed with participant:", this.id);
            this.signaling.onDataChannelClosed(this.id);
            this.dataChannel = null;
            this.pc = null;
        }
        this.dataChannel.onmessage = (event) => this.onMessage(event);
    }

    /**
     * Initiates a WebRTC connection as the caller (creates offer and data channel).
     */
    async call(): Promise<void> {
        if (this.pc) {
            console.warn("Already in a call with this participant.");
            return;
        }

        this.pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
                { urls: "stun:stun2.l.google.com:19302" },
            ],
        });
        this.pc.onicecandidate = (event) => {
            this.signaling.sendICECandidate(this.id, event.candidate);
        };

        this.dataChannel = this.pc.createDataChannel("dataChannel");
        this.configureDataChannel();

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        this.signaling.sendOffer(this.id, offer);
    }

    /**
     * Handles an incoming offer and responds with an answer (callee).
     * @param offer - The received RTC session description offer.
     */
    async answer(offer: RTCSessionDescriptionInit): Promise<void> {
        if (this.pc) {
            console.warn("Already in a call with this participant.");
            return;
        }

        this.pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
                { urls: "stun:stun2.l.google.com:19302" },
            ],
        });
        this.pc.onicecandidate = (event) => {
            this.signaling.sendICECandidate(this.id, event.candidate);
        };

        this.pc.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.configureDataChannel();
        };

        await this.pc.setRemoteDescription(offer);
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.signaling.sendAnswer(this.id, answer);
    }

    /**
     * Handles an incoming answer to a previously sent offer.
     * @param answer - The received RTC session description answer.
     */
    async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        if (this.pc) {
            try {
                await this.pc.setRemoteDescription(answer);
                // console.log("Remote description set:", answer);
            } catch (error) {
                console.error("Error setting remote description:", error);
            }
        }
    }

    /**
     * Adds an ICE candidate to the peer connection.
     * @param candidate - The ICE candidate to add.
     */
    async addICECandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (this.pc) {
            try {
                await this.pc.addIceCandidate(candidate);
                // console.log("ICE candidate added:", candidate);
            } catch (error) {
                console.error("Error adding ICE candidate:", error);
            }
        }
    }

    /**
     * Handles an incoming message from the data channel and notifies the observer.
     * @param event - The message event.
     */
    public onMessage(event: MessageEvent): void {
        const data = JSON.parse(event.data);
        // console.log("Received message from participant:", this.id, data);
        this.observer.onUpdate(this.id, data.action, data.data);
    }

    /**
     * Sends a message to the remote participant via the data channel.
     * @param id - The sender's ID.
     * @param action - The action type.
     * @param data - The data payload.
     */
    public send(id: string, action: string, data: any): void {
        if (this.dataChannel && this.dataChannel.readyState === "open") {
            const message = JSON.stringify({ id, action, data });
            this.dataChannel.send(message);
            // console.log("Sent message to participant:", this.id, message);
        } else {
            console.warn("Data channel is not open. Cannot send message.");
        }
    }
}