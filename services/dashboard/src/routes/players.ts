import { FastifyPluginAsync } from 'fastify';
import { config } from '../config.js';
import { fetchServerStatus } from '../services/status.js';
import { executeContainerCommand } from '../services/docker.js';
import { verifyToken } from '../auth/jwt.js';

export const playerRoutes: FastifyPluginAsync = async (fastify) => {
  // Get players online on a specific server (Public read)
  fastify.get('/:id/players', async (request, reply) => {
    const { id } = request.params as { id: string };
    const serverNode = config.servers.find(s => s.id === id);
    if (!serverNode) {
      return reply.code(404).send({ error: `Server '${id}' not found` });
    }

    const data = await fetchServerStatus(serverNode);
    return reply.send({
      server: id,
      online: data.players.online,
      max: data.players.max,
      players: data.players.list
    });
  });

  // Player action: kick, ban, op, deop (Admin only)
  fastify.post('/:id/players/action', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized: Authentication required' });
    }
    const token = authHeader.substring(7);
    const session = verifyToken(token);
    if (!session || !session.isAdmin) {
      return reply.code(403).send({ error: 'Forbidden: Admin session required' });
    }

    const { id } = request.params as { id: string };
    const { player, action, reason } = request.body as {
      player?: string;
      action?: 'kick' | 'ban' | 'op' | 'deop';
      reason?: string;
    };

    if (!player || !action) {
      return reply.code(400).send({ error: 'Player and action are required' });
    }

    const serverNode = config.servers.find(s => s.id === id);
    if (!serverNode) {
      return reply.code(404).send({ error: `Server '${id}' not found` });
    }

    let cmd = '';
    const safePlayer = player.replace(/[^a-zA-Z0-9_]/g, '');
    const safeReason = (reason || 'Action performed by administrator').replace(/["\n\r]/g, '');

    switch (action) {
      case 'kick':
        cmd = `kick ${safePlayer} ${safeReason}`;
        break;
      case 'ban':
        cmd = `ban ${safePlayer} ${safeReason}`;
        break;
      case 'op':
        cmd = `op ${safePlayer}`;
        break;
      case 'deop':
        cmd = `deop ${safePlayer}`;
        break;
      default:
        return reply.code(400).send({ error: `Unsupported action: ${action}` });
    }

    try {
      const output = await executeContainerCommand(serverNode.containerName, cmd);
      return reply.send({
        success: true,
        action,
        player: safePlayer,
        commandExecuted: cmd,
        response: output || 'Action completed successfully.'
      });
    } catch (err: any) {
      return reply.code(500).send({
        error: `Failed to execute ${action} on ${safePlayer}: ` + err.message
      });
    }
  });
};

