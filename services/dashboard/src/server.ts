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

    // 4. WebSocket Routes
    await fastify.register(consoleWsRoutes);
    await fastify.register(telemetryWsRoutes);

    // 5. Test Database Connection
    try {
      await db.query('SELECT NOW()');
      fastify.log.info('[PostgreSQL] Successfully connected to database pool.');
    } catch (err: any) {
      fastify.log.warn(`[PostgreSQL] Initial connection warning: ${err.message}. Retries active.`);
    }

    // 6. SPA Fallback (Redirect unmatched routes to index.html)
    fastify.setNotFoundHandler((request, reply) => {
      if (request.raw.url && request.raw.url.startsWith('/api')) {
        return reply.code(404).send({ error: 'Endpoint not found' });
      }
      return reply.sendFile('index.html');
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

