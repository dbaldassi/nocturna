


export interface RTCSignaling {
    sendOffer(remoteId:string, offer: RTCSessionDescriptionInit): void;
    sendAnswer(remoteId: string, answer: RTCSessionDescriptionInit): void;
    sendICECandidate(remoteId: string, candidate: RTCIceCandidateInit): void;
    onDataChannelOpened(remoteId: string): void;
    onDataChannelClosed(remoteId: string): void;
}

export interface RemoteParticipantObserver {
    onUpdate(id: string, action: string, data: any): void;
}

export class RemoteParticipant {
    public id: string;

    private pc: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private signaling: RTCSignaling;
    private observer: RemoteParticipantObserver | null = null;

    constructor(id: string, signaling: RTCSignaling, observer: RemoteParticipantObserver) {
        this.observer = observer;
        this.id = id;
        this.signaling = signaling;
    }

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
                { urls: "stun:stun3.l.google.com:19302" },
                { urls: "stun:stun4.l.google.com:19302" },
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

    public onMessage(event: MessageEvent): void {
        const data = JSON.parse(event.data);
        // console.log("Received message from participant:", this.id, data);
        this.observer.onUpdate(this.id, data.action, data.data);
    }

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