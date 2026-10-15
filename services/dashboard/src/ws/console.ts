import { FastifyPluginAsync } from 'fastify';
import { WebSocket } from 'ws';
import { config } from '../config.js';
import { getContainerLogStream, executeContainerCommand } from '../services/docker.js';
import { verifyToken } from '../auth/jwt.js';

export const consoleWsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ws/console/:serverId', { websocket: true }, (connection: any, req) => {
    const { serverId } = req.params as { serverId: string };
    const query = req.query as { token?: string };

    const socket: WebSocket = connection.socket || connection;

    // Verify authentication token from query parameter
    if (!query.token) {
      socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized: Missing session token' }));
      socket.close();
      return;
    }

    const session = verifyToken(query.token);
    if (!session || !session.isAdmin) {
      socket.send(JSON.stringify({ type: 'error', message: 'Forbidden: Admin session required' }));
      socket.close();
      return;
    }

    const serverNode = config.servers.find(s => s.id === serverId);
    if (!serverNode) {
      socket.send(JSON.stringify({ type: 'error', message: `Server '${serverId}' not found` }));
      socket.close();
      return;
    }

    socket.send(JSON.stringify({
      type: 'info',
      message: `\x1b[32m=== Connected to live console: ${serverNode.name} (${serverNode.containerName}) ===\x1b[0m\r\n`
    }));

    let logStream: any = null;

    // Start streaming logs from Docker
    getContainerLogStream(serverNode.containerName, 100)
      .then((stream) => {
        logStream = stream;

        stream.on('data', (chunk: Buffer) => {
          if (socket.readyState === WebSocket.OPEN) {
            // Demux standard Docker frame header if present (8 bytes)
            const text = chunk.length > 8 && (chunk[0] === 1 || chunk[0] === 2)
              ? chunk.subarray(8).toString('utf-8')
              : chunk.toString('utf-8');

            socket.send(JSON.stringify({ type: 'log', data: text }));
          }
        });

        stream.on('error', (err) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'error', message: 'Log stream error: ' + err.message }));
          }
        });
      })
      .catch((err) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'error', message: 'Failed to attach log stream: ' + err.message }));
        }
      });

    // Listen for incoming commands typed in the terminal
    socket.on('message', async (rawMsg: Buffer | string) => {
      try {
        const payload = JSON.parse(rawMsg.toString());
        if (payload.type === 'command' && payload.command) {
          const cmd = payload.command.trim();
          socket.send(JSON.stringify({ type: 'log', data: `\x1b[33m> ${cmd}\x1b[0m\r\n` }));

          const response = await executeContainerCommand(serverNode.containerName, cmd);
          if (response && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'log', data: `${response}\r\n` }));
          }
        }
      } catch {
        // Plain text fallback
        const cmd = rawMsg.toString().trim();
        if (cmd) {
          try {
            const response = await executeContainerCommand(serverNode.containerName, cmd);
            if (response && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: 'log', data: `${response}\r\n` }));
            }
          } catch (e: any) {
            socket.send(JSON.stringify({ type: 'error', message: e.message }));
          }
        }
      }
    });

    socket.on('close', () => {
      if (logStream && typeof logStream.destroy === 'function') {
        logStream.destroy();
      }
    });
  });
};

