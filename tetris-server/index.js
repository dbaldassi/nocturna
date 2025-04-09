const HTTPS            = require("https");
const WebSocketServer  = require ("websocket").server;
const FS = require("fs");

const PORT = 8090;

var players = [];
var counter = 0;

function wss(server) {
	//Create websocket server
    const wssServer = new WebSocketServer ({
	httpServer: server,
	autoAcceptConnections: false
    });
    
    wssServer.on("request", (request) => {
	request.on('requestAccepted', () => console.log('Request accepted'));
	request.on('requestRejected', () => console.log('Request rejected'));
	
	let connection = request.accept();
	connection.player_id = ++counter;
	
	players.push(connection);
	
	connection.on("message", (message) => {
	    let player = players.find(elt => elt.player_id !== connection.player_id);
	    player.sendUTF(message.utf8Data);
	});
	
	connection.on("close", () => {
	    players.splice(players.indexOf(connection), 1);
	});

	connection.sendUTF(JSON.stringify({ id: connection.player_id, should_call : players.length === 2 }));
    });
}

//Load certs
const options = {
    key	: FS.readFileSync ("server.key"),
    cert	: FS.readFileSync ("server.cert")
};

//Manualy starty server
const server = HTTPS.createServer (options).listen(PORT);
//Launch wss server
wss(server);


const onExit = (e) => {
	if (e) console.error(e);
	process.exit();
};

process.on("uncaughtException"	, onExit);
process.on("SIGINT"		, onExit);
process.on("SIGTERM"		, onExit);
process.on("SIGQUIT"		, onExit);
