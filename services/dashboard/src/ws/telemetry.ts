import { FastifyPluginAsync } from 'fastify';
import { WebSocket } from 'ws';
import { fetchAllServersStatus } from '../services/status.js';
import { verifyToken } from '../auth/jwt.js';

export const telemetryWsRoutes: FastifyPluginAsync = async (fastify) => {
  const clients = new Set<WebSocket>();

  // Heartbeat loop broadcasting telemetry every 2.5 seconds
  const interval = setInterval(async () => {
    if (clients.size === 0) return;

    try {
      const stats = await fetchAllServersStatus();
      const payload = JSON.stringify({
        type: 'telemetry',
        timestamp: Date.now(),
        servers: stats
      });

      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }
    } catch (err: any) {
      fastify.log.error('Telemetry broadcast error:', err.message);
    }
  }, 2500);

  fastify.addHook('onClose', () => {
    clearInterval(interval);
  });

  fastify.get('/ws/telemetry', { websocket: true }, (connection: any, _req) => {
    const socket: WebSocket = connection.socket || connection;

    clients.add(socket);

    // Send immediate initial status
    fetchAllServersStatus().then((stats) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'telemetry',
          timestamp: Date.now(),
          servers: stats
        }));
      }
    });

    socket.on('close', () => {
      clients.delete(socket);
    });
  });
};

