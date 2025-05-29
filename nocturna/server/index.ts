import Express from 'express';
import CORS from "cors";
import HTTP from "http";

import { WebSocketServer } from 'ws';
import { MultiProtocol } from './multi.ts';

const PORT = 5173;

//Create rest api
const rest = Express();
rest.use(CORS());
rest.use(Express.static("www"));
rest.use("/docs", Express.static("www/docs"));

const handlers = {
	"multi"	        : new MultiProtocol(),
};

function configureServer(server) {
	const wss = new WebSocketServer({ server });

	wss.on('connection', (ws, request) => {
		const subprotocol = request.headers['sec-websocket-protocol'];
		if (subprotocol && handlers[subprotocol]) {
			handlers[subprotocol].handleConnection(ws);
		} else {
			console.error(`No handler for subprotocol: ${subprotocol}`);
			ws.close(1000, 'No handler for subprotocol');
		}
	});
}

//Manualy starty server
const server = HTTP.createServer(rest).listen(PORT);
//Launch wss server
configureServer(server);

