import { FastifyPluginAsync } from 'fastify';
import { config } from '../config.js';
import { fetchAllServersStatus, fetchServerStatus } from '../services/status.js';
import { executeContainerCommand, controlContainerPower } from '../services/docker.js';
import { verifyToken } from '../auth/jwt.js';

export const serverRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication hook for all /api/servers routes
  fastify.addHook('preHandler', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized: Authentication required' });
    }
    const token = authHeader.substring(7);
    const session = verifyToken(token);
    if (!session || !session.isAdmin) {
      return reply.code(403).send({ error: 'Forbidden: Admin session required' });
    }
  });

  // Get status of all servers
  fastify.get('/', async (_request, reply) => {
    const data = await fetchAllServersStatus();
    return reply.send({ servers: data });
  });

  // Get status of a specific server
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const serverNode = config.servers.find(s => s.id === id);
    if (!serverNode) {
      return reply.code(404).send({ error: `Server '${id}' not found` });
    }

    const data = await fetchServerStatus(serverNode);
    return reply.send({ server: data });
  });

  // Dispatch console command to a server
  fastify.post('/:id/command', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { command } = request.body as { command?: string };

    if (!command || !command.trim()) {
      return reply.code(400).send({ error: 'Command cannot be empty' });
    }

    const serverNode = config.servers.find(s => s.id === id);
    if (!serverNode) {
      return reply.code(404).send({ error: `Server '${id}' not found` });
    }

    try {
      const output = await executeContainerCommand(serverNode.containerName, command);
      return reply.send({
        success: true,
        server: id,
        command: command.trim(),
        response: output || 'Command executed successfully.'
      });
    } catch (err: any) {
      return reply.code(500).send({
        error: `Failed to execute command on '${id}': ` + err.message
      });
    }
  });

  // Control container power (start, stop, restart)
  fastify.post('/:id/power', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { action } = request.body as { action?: 'start' | 'stop' | 'restart' };

    if (!action || !['start', 'stop', 'restart'].includes(action)) {
      return reply.code(400).send({ error: "Action must be 'start', 'stop', or 'restart'" });
    }

    const serverNode = config.servers.find(s => s.id === id);
    if (!serverNode) {
      return reply.code(404).send({ error: `Server '${id}' not found` });
    }

    try {
      await controlContainerPower(serverNode.containerName, action);
      return reply.send({
        success: true,
        server: id,
        action,
        message: `Successfully executed '${action}' on ${serverNode.name}.`
      });
    } catch (err: any) {
      return reply.code(500).send({
        error: `Failed to execute '${action}' on '${id}': ` + err.message
      });
    }
  });
};

