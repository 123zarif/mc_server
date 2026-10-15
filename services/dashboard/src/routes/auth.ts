import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';
import { verifyAuthMePassword } from '../auth/authme.js';
import { checkPlayerPermissions } from '../auth/luckperms.js';
import { signToken, verifyToken } from '../auth/jwt.js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Login with in-game Minecraft username and AuthMe password
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body as { username?: string; password?: string };

    if (!username || !password) {
      return reply.code(400).send({ error: 'Username and password are required' });
    }

    try {
      // 1. Fetch AuthMe record from PostgreSQL
      const query = `
        SELECT id, username, realname, password, salt, email, "premiumUUID"
        FROM authme
        WHERE LOWER(username) = LOWER($1)
        LIMIT 1
      `;
      const res = await db.query(query, [username.trim()]);

      if (res.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid Minecraft credentials or player not registered' });
      }

      const playerRecord = res.rows[0];
      const storedHash: string = playerRecord.password;

      // 2. Verify password with AuthMe SHA256 / BCrypt
      const isValidPassword = verifyAuthMePassword(password, storedHash);
      if (!isValidPassword) {
        return reply.code(401).send({ error: 'Invalid Minecraft credentials' });
      }

      // 3. Verify Admin permissions via LuckPerms
      const playerUuid = playerRecord.premiumUUID || undefined;
      const permInfo = await checkPlayerPermissions(playerRecord.username || username, playerUuid);

      if (!permInfo.isAdmin) {
        return reply.code(403).send({
          error: 'Access denied: Your Minecraft account lacks Operator or LuckPerms Admin permissions.'
        });
      }

      // 4. Issue signed JWT session token
      const token = signToken({
        username: permInfo.username,
        uuid: permInfo.uuid,
        isAdmin: true,
        groups: permInfo.groups
      });

      return reply.send({
        token,
        user: {
          username: permInfo.username,
          uuid: permInfo.uuid,
          groups: permInfo.groups,
          isAdmin: true
        }
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Authentication service error: ' + err.message });
    }
  });

  // Verify current session
  fastify.get('/me', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.substring(7);
    const session = verifyToken(token);

    if (!session) {
      return reply.code(401).send({ error: 'Unauthorized: Invalid or expired token' });
    }

    return reply.send({ user: session });
  });
};

