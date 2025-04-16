import { Engine, Scene, Vector3, FollowCamera } from "@babylonjs/core";
import { MainScene } from "./MainScene";
import { CharacterInput } from "./types";

class App {
    engine: Engine;
    scene: MainScene;
    canvas: HTMLCanvasElement;
    websocket: WebSocket;
    pc: RTCPeerConnection;
    dataChannel: RTCDataChannel;
    rtc_id: number;

    constructor() {
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "80%";
        this.canvas.style.height = "80%";
        this.canvas.style.display = "block";
        this.canvas.id = "gameCanvas";
        document.body.appendChild(this.canvas);

        this.createWebsocket();
        
        this.engine = new Engine(this.canvas, true);
    }

    createWebsocket() {
        this.websocket = new WebSocket("wss://localhost:8090");
        this.websocket.onopen = () => {
            console.log("WebSocket connection established");
        };
        this.websocket.onmessage = (msg) => {
            // console.log("Message from server: ", msg.data);
            // Handle incoming messages from the server
            let data = JSON.parse(msg.data);

            if(data.offer) {
                this.answer(data.offer);
            }
            else if(data.candidate) {
                this.pc.addIceCandidate(new RTCIceCandidate(data.candidate)).then(() => {
                    console.log("ICE candidate added");
                }).catch((error) => {
                    console.error("Error adding ICE candidate: ", error);
                });
            }
            else if(data.answer) {
                this.pc.setRemoteDescription(new RTCSessionDescription(data.answer)).then(() => {
                    console.log("Remote description set");
                }).catch((error) => {
                    console.error("Error setting remote description: ", error);
                });
            }
            else if(data.id) {
                console.log("id being ", data.id);

                this.rtc_id  = data.id;
                if(data.should_call) this.call();
            }
        };
        this.websocket.onclose = () => {
            console.log("WebSocket connection closed");
        };
        this.websocket.onerror = (error) => {
            console.error("WebSocket error: ", error);
        };
    }

    call() {
        console.log("Calling...");

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
            if (event.candidate) {
                this.websocket.send(JSON.stringify({ candidate: event.candidate }));
            }
        };
        this.pc.oniceconnectionstatechange = () => {
            console.log("ICE connection state: ", this.pc.iceConnectionState);
        };


        this.dataChannel = this.pc.createDataChannel("gameData");
        this.dataChannel.onopen = () => {
            console.log("Data channel opened");
            this.scene.sendPosition = (position) => this.sendInput(position);
            this.scene.addRemoteCharacter(true);
        };
        this.dataChannel.onclose = () => {
            console.log("Data channel closed");
        };

        this.dataChannel.onmessage = (event) => {
            // console.log("Message from data channel: ", event.data);
            this.scene.updateObjectPosition(JSON.parse(event.data));
        };

        this.pc.createOffer().then((offer) => {
            this.pc.setLocalDescription(offer);
            this.websocket.send(JSON.stringify({ offer: offer }));
        }
        ).catch((error) => {
            console.error("Error creating offer: ", error);
        });

    }

    answer(sdp: RTCSessionDescriptionInit) {
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
            if (event.candidate) {
                this.websocket.send(JSON.stringify({ candidate: event.candidate }));
            }
        };
        this.pc.oniceconnectionstatechange = () => {
            console.log("ICE connection state: ", this.pc.iceConnectionState);
        };

        this.pc.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.dataChannel.onopen = () => {
                console.log("Data channel opened");
                this.scene.sendPosition = (position) => this.sendInput(position);
                this.scene.addRemoteCharacter(false);
            };
            this.dataChannel.onclose = () => {
                console.log("Data channel closed");
            };
            this.dataChannel.onmessage = (event) => {
                // console.log("Message from data channel: ", event.data);
                this.scene.updateObjectPosition(JSON.parse(event.data));
            };
        };

        this.pc.setRemoteDescription(new RTCSessionDescription(sdp)).then(() => {
            console.log("Remote description set");
        }).catch((error) => {
            console.error("Error setting remote description: ", error);
        });

        this.pc.createAnswer().then((answer) => {
            this.pc.setLocalDescription(answer);
            this.websocket.send(JSON.stringify({ answer: answer }));
        }).catch((error) => {
            console.error("Error creating answer: ", error);
        });
    }

    sendInput(position: any) {
        if(this.dataChannel && this.dataChannel.readyState === "open") {
            // console.log("Sending input: ", JSON.stringify(position));
            this.dataChannel.send(JSON.stringify(position));
        }
    }

    async start() {
        this.scene = new MainScene(this.engine);
        this.gameLoop();
    }

    gameLoop() {
        this.engine.runRenderLoop(() => {
            let deltaTime = this.engine.getDeltaTime();
            // console.log("Delta Time: ", deltaTime);
            this.scene.update(deltaTime);
            this.scene.render();
        });
    }
}

const gameEngine = new App();
gameEngine.start();