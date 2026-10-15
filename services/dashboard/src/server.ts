import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config.js';
import { authRoutes } from './routes/auth.js';
import { serverRoutes } from './routes/servers.js';
import { playerRoutes } from './routes/players.js';
import { consoleWsRoutes } from './ws/console.js';
import { telemetryWsRoutes } from './ws/telemetry.js';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

async function main() {
  try {
    // 1. Plugins
    await fastify.register(cors, {
      origin: true,
      credentials: true
    });

    await fastify.register(websocket, {
      options: {
        maxPayload: 1048576 // 1MB
      }
    });

    // 2. Static Web Dashboard Frontend
    const publicPath = path.join(__dirname, '..', 'public');
    await fastify.register(fastifyStatic, {
      root: publicPath,
      prefix: '/'
    });

    // 3. API Routes
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(serverRoutes, { prefix: '/api/servers' });
    await fastify.register(playerRoutes, { prefix: '/api/servers' });

    fastify.get('/api/config', async () => {
      return {
        serverName: config.serverName,
        superadmins: config.superadmins,
        connection: {
          java: {
            host: process.env.DOMAIN || 'zarifzuhayer.tech',
            port: parseInt(process.env.MINECRAFT_JAVA_PORT || '25565', 10),
            version: '1.21.4 (Java Edition)'
          },
          bedrock: {
            host: process.env.DOMAIN || 'zarifzuhayer.tech',
            port: parseInt(process.env.MINECRAFT_BEDROCK_PORT || '19132', 10),
            version: 'Latest Bedrock (Android / iOS / Windows / Console)'
          },
          voice: {
            port: parseInt(process.env.VOICE_CHAT_PORT || '24454', 10),
            protocol: 'UDP'
          }
        },
        servers: config.servers.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          description: s.description,
          port: s.port
        }))
      };
    });

    fastify.post('/api/config', async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Unauthorized: Authentication required' });
      }
      const token = authHeader.substring(7);
      const { verifyToken } = await import('./auth/jwt.js');
      const session = verifyToken(token);
      if (!session || !session.isAdmin) {
        return reply.code(403).send({ error: 'Forbidden: Admin access required' });
      }

      const { serverName } = request.body as { serverName?: string };
      if (serverName && serverName.trim()) {
        config.serverName = serverName.trim();
      }
      return reply.send({ success: true, serverName: config.serverName });
    });

    // 4. WebSocket Routes
    await fastify.register(consoleWsRoutes);
    await fastify.register(telemetryWsRoutes);

    // 5. Test Database Connection and Initialize Tables
    try {
      await db.query('SELECT NOW()');
      fastify.log.info('[PostgreSQL] Successfully connected to database pool.');
      const { initDatabase } = await import('./db.js');
      await initDatabase();
    } catch (err: any) {
      fastify.log.warn(`[PostgreSQL] Initial connection warning: ${err.message}. Retries active.`);
    }

    // 6. Clean API 404 Handler
    fastify.setNotFoundHandler((request, reply) => {
      return reply.code(404).send({ error: 'API or WebSocket endpoint not found' });
    });

    // 7. Start Listening
    await fastify.listen({ port: config.port, host: config.host });
    fastify.log.info(`🚀 Minecraft Network Dashboard running on http://${config.host}:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();

