import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { db } from '../db.js';
import { config } from '../config.js';
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
        SELECT *
        FROM authme
        WHERE LOWER(username) = LOWER($1)
        LIMIT 1
      `;
      const res = await db.query(query, [username.trim()]);

      if (res.rows.length === 0) {
        // If user is superadmin and not registered yet, hint at registration
        const isSuperadmin = config.superadmins.includes(username.trim().toLowerCase());
        return reply.code(401).send({
          error: isSuperadmin
            ? 'Account not registered yet. Use the Register/Setup tab to set your admin password.'
            : 'Invalid Minecraft credentials or player not registered in-game.'
        });
      }

      const playerRecord = res.rows[0];
      const storedHash: string = playerRecord.password;

      // 2. Verify password with AuthMe SHA256 / BCrypt
      const isValidPassword = verifyAuthMePassword(password, storedHash);
      if (!isValidPassword) {
        return reply.code(401).send({ error: 'Invalid Minecraft credentials' });
      }

      // 3. Verify Admin permissions via LuckPerms
      const playerUuid = playerRecord.premiumUUID || playerRecord.uuid || playerRecord.player_uuid || undefined;
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
      if (err.code === '42P01') {
        return reply.code(503).send({
          error: 'The AuthMe database table has not been initialized yet. Start your Minecraft server (mc-auth) or register via the setup tab.'
        });
      }
      return reply.code(500).send({ error: 'Authentication service error: ' + err.message });
    }
  });

  // Register initial superadmin or account directly from web console
  fastify.post('/register', async (request, reply) => {
    const { username, password } = request.body as { username?: string; password?: string };
    if (!username || !password) {
      return reply.code(400).send({ error: 'Username and password are required' });
    }

    const cleanUser = username.trim();
    const normalizedUser = cleanUser.toLowerCase();

    try {
      const isSuperadmin = config.superadmins.includes(normalizedUser);
      const countRes = await db.query('SELECT COUNT(*) as count FROM authme');
      const userCount = parseInt(countRes.rows[0]?.count || '0', 10);

      if (userCount > 0 && !isSuperadmin) {
        return reply.code(403).send({
          error: 'Direct registration is restricted to server administrators configured in DASHBOARD_SUPERADMINS.'
        });
      }

      // Check if user already exists
      const existRes = await db.query('SELECT id FROM authme WHERE LOWER(username) = LOWER($1)', [cleanUser]);
      if (existRes.rows.length > 0) {
        return reply.code(409).send({ error: `Player '${cleanUser}' is already registered. Please log in.` });
      }

      // Format as AuthMe SHA256: $SHA$salt$hash
      const salt = crypto.randomBytes(8).toString('hex');
      const passHash = crypto.createHash('sha256').update(password).digest('hex');
      const finalHash = crypto.createHash('sha256').update(passHash + salt).digest('hex');
      const storedPassword = `$SHA$${salt}$${finalHash}`;

      const now = Date.now();
      await db.query(`
        INSERT INTO authme (username, realname, password, regdate, lastlogin)
        VALUES ($1, $2, $3, $4, $5)
      `, [cleanUser, cleanUser, storedPassword, now, now]);

      const token = signToken({
        username: cleanUser,
        isAdmin: true,
        groups: ['admin', 'superadmin']
      });

      return reply.send({
        success: true,
        token,
        user: {
          username: cleanUser,
          isAdmin: true,
          groups: ['admin', 'superadmin']
        }
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Registration error: ' + err.message });
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
