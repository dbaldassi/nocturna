
class Participant {
    public id: string;
    public host: boolean = false;
    private connection : Connection;

    constructor(connection: Connection, id:string) {
        this.connection = connection;
        this.id = id;
    }

    sendMessage(message) {
        this.connection.sendMessage(message);
    }
};

class Room {
    public static readonly MAX_PARTICIPANTS = 4;

    private participants: Map<string, Participant>;
    private id: string;

    constructor(id: string) {
        this.id = id;
        this.participants = new Map();
    }

    addParticipant(id, connection) {
        // Check if the participant already exists
        if (this.participantExists(id)) {
            connection.sendError(MultiProtocol.JOIN_CMD, "Participant already exists");
            return;
        }

        const participant = new Participant(connection, id);
        // Notify all participants about the new participant
        this.participants.forEach((p) => {
            p.sendMessage({ cmd: MultiProtocol.NEW_PARTICIPANT_CMD, id });
        });
        // Send all participants to the new participant as array of ids
        connection.sendSuccess(MultiProtocol.JOIN_CMD, 
            { participants: Array.from(this.participants.keys()) });

        connection.roomId = this.id;
        connection.participantId = id;

        this.participants.set(id, participant);
        return participant;
    }

    removeParticipant(id) {
        this.participants.delete(id);
        // Notify all participants about the removed participant
        this.participants.forEach((p) => {
            p.sendMessage({ cmd: MultiProtocol.LEFT_PARTICIPANT_CMD, id });
        });
    }

    participantExists(id) {
        return this.participants.has(id);
    }

    getNumberOfParticipants() {
        return this.participants.size;
    }

    isFull() {
        return this.getNumberOfParticipants() >= Room.MAX_PARTICIPANTS;
    }

    getParticipant(id) {
        return this.participants.get(id);
    }

    getParticipants() {
        return Array.from(this.participants.values());
    }
}

class RoomManager {
    public static readonly MAX_ROOMS = 10;
    private rooms: Map<string, Room>;

    constructor() {
        this.rooms = new Map();
        const room = new Room("test");
        this.rooms.set("test", room);
    }

    getRoom(id) {
        return this.rooms.get(id);
    }

    createRoom(id, connection) {
        if(this.rooms.size >= RoomManager.MAX_ROOMS) {
            connection.sendError(MultiProtocol.CREATE_CMD, "Max rooms reached");
            return;
        }

        if (this.rooms.has(id)) {
            connection.sendError(MultiProtocol.CREATE_CMD, "Room already exists");
            return;
        }

        const room = new Room(id);
        this.rooms.set(id, room);
        connection.roomId = id;
        connection.sendSuccess(MultiProtocol.CREATE_CMD, { id: id });
    }

    deleteRoom(roomId, connection) {
        if (this.rooms.has(roomId)) {
            this.rooms.delete(roomId);
            connection.sendUTF(JSON.stringify({ cmd: "delete", success: true, message: "Room deleted", id: roomId }));
        } else {
            connection.sendUTF(JSON.stringify({ cmd: "delete", success: false, message: "Room does not exist", id: roomId }));
        }
    }

    leaveRoom(roomId, participantId, connection) {
        const room = this.rooms.get(roomId);
        if(!room) {
            connection.sendError(MultiProtocol.LEAVE_CMD, "Room does not exist");
            return;
        }

        room.removeParticipant(participantId);
        connection.sendSuccess(MultiProtocol.LEAVE_CMD, "Left room");
        connection.roomId = null;
        connection.participantId = null;

        // If the room is empty, delete it
        if(room.getNumberOfParticipants() === 0 && roomId !== "test") {
            this.rooms.delete(roomId);
        }
    }

    joinRoom(roomId: string, participantId: string, connection: Connection) {
        const room = this.rooms.get(roomId);
        if(!room) {
            connection.sendError(MultiProtocol.JOIN_CMD, "Room does not exist");
            return;
        }

        if(room.isFull()) {
            connection.sendError(MultiProtocol.JOIN_CMD, "Room is full");
            return;
        }

        room.addParticipant(participantId, connection);
    }
}

class Connection {
    private ws : any;
    private roomManager: RoomManager;

    public roomId: string|null = null;
    public participantId: string|null;

    constructor(ws: any, roomManager: RoomManager) {
        this.roomManager = roomManager;
        this.ws = ws;
        this.roomId = null;

        
        ws.on('message', (message) => {
            let msg = JSON.parse(message.toString());

            // console.log('Received (connection):', msg);

            if(msg.cmd === MultiProtocol.CALL_CMD) this.call(msg.remoteId, msg.offer);
            else if(msg.cmd === MultiProtocol.ANSWER_CMD) this.answer(msg.remoteId, msg.answer);
            else if(msg.cmd === MultiProtocol.ICE_CANDIDATE_CMD) this.addICECandidate(msg.remoteId, msg.candidate);
            else if(msg.cmd === MultiProtocol.JOIN_CMD) this.roomManager.joinRoom(this.roomId as string, msg.playerId, this);
        });

        ws.on('close', () => {
            if(this.participantId && this.roomId) {
                this.roomManager.leaveRoom(this.roomId, this.participantId, this);
            }
        });
    }

    private forward(remoteId: string, req: any) {
        const room = this.roomManager.getRoom(this.roomId);
        if(!room) {
            this.sendError(req.cmd, "Room does not exist");
            return;
        }

        const participant = room.getParticipant(remoteId);
        if(!participant) {
            this.sendError(req.cmd, "Participant does not exist");
            return;
        }

        participant.sendMessage(req);
    }

    private call(remoteId: string, offer: string) {
        this.forward(remoteId, { cmd: MultiProtocol.CALL_CMD, remoteId: this.participantId, offer });
    }

    private answer(remoteId: string, answer: string) {
        this.forward(remoteId, { cmd: MultiProtocol.ANSWER_CMD, remoteId: this.participantId, answer });
    }

    private addICECandidate(remoteId: string, candidate: any) {
        this.forward(remoteId, { cmd: MultiProtocol.ICE_CANDIDATE_CMD, remoteId: this.participantId, candidate:candidate });
    }

    sendMessage(message) {
        this.ws.send(JSON.stringify(message));
    }

    sendError(cmd, reason) {
        this.ws.send(JSON.stringify({ cmd: cmd, error: reason }));
    }

    sendSuccess(cmd, data?: any) {  
        this.ws.send(JSON.stringify({ cmd: cmd, message: "OK", data: data }));
    }
}

function getRandomId() : string {
    return Math.random().toString(36).substring(2, 15);
}

export class MultiProtocol {
    private roomManager: RoomManager;

    public static readonly JOIN_CMD = "join";
    public static readonly CREATE_CMD = "create";
    public static readonly LEAVE_CMD = "leave";
    public static readonly LIST_CMD = "list";
    public static readonly DELETE_CMD = "delete";
    public static readonly NEW_PARTICIPANT_CMD = "new_participant";
    public static readonly LEFT_PARTICIPANT_CMD = "left_participant";
    public static readonly ROOM_PARTICIPANTS_CMD = "room_participants";
    public static readonly CALL_CMD = "call";
    public static readonly ANSWER_CMD = "answer";
    public static readonly ICE_CANDIDATE_CMD = "ice_candidate";

    constructor() {
        this.roomManager = new RoomManager();
    }

    private createRoom(connection: Connection) {
        let roomId = getRandomId();

        // Check if the roomId already exists
        // If it does, generate a new one
        while(this.roomManager.getRoom(roomId)) {
            roomId = getRandomId();
        }

        this.roomManager.createRoom(roomId, connection);
    }

    handleConnection(ws: any) {
        const listener = (message) => {
            // console.log('Received:', message.toString());
            let msg = JSON.parse(message.toString());

            ws.off('message', listener);
            const connection = new Connection(ws, this.roomManager);

            if(msg.cmd === MultiProtocol.CREATE_CMD) this.createRoom(connection);
            else if(msg.cmd === MultiProtocol.JOIN_CMD) this.roomManager.joinRoom(msg.roomId, msg.playerId, connection);
            else return;
        };

        ws.on('message', listener);
    }
}