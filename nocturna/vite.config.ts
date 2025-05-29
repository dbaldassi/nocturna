import { defineConfig } from 'vite';
import { WebSocketServer } from 'ws';

// import subprotcol handlers
import { MultiProtocol } from './server/multi.ts';

const handlers = {
	"multi"	        : new MultiProtocol(),
};



export default defineConfig({
  plugins: [
    {
      name: 'nocturna-websocket-server',
      configureServer(server) {
        const wss = new WebSocketServer({ noServer: true });

        // Gérer les connexions HTTP pour upgrader vers WebSocket
        // pour eviter les conflits avec le serveur de développement Vite
        server.httpServer?.on('upgrade', (request, socket, head) => {
          if (request.url === '/nocturna-ws') {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
          }
        });

        wss.on('connection', (ws, request) => {
            const subprotocol = request.headers['sec-websocket-protocol'];
            if (subprotocol && handlers[subprotocol]) {
                handlers[subprotocol].handleConnection(ws);
            } else {
                console.error(`No handler for subprotocol: ${subprotocol}`);
                ws.close(1000, 'No handler for subprotocol');
            }
        });
      },
    },
  ],

  optimizeDeps: {
    exclude: [
      "@babylonjs/core/Audio/webAudioStreamingSound", // ou le nom du module qui pose problème
      "@babylonjs/core/Audio/webAudioStaticSound",
      "@babylonjs/core/Audio/webAudioSound",
      "@babylonjs/core/Audio/webAudioEngine",
      "@babylonjs/core/Audio/webAudioWrapper"
    ]
  }
});
