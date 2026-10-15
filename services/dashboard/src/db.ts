import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const db = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

db.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected pool error on idle client:', err.message);
});

/**
 * Ensures required database tables exist matching AuthMe and LuckPerms schemas.
 */
export async function initDatabase(): Promise<void> {
  try {
    // 1. Ensure AuthMe table exists with exact AuthMe PostgreSQL schema
    await db.query(`
      CREATE TABLE IF NOT EXISTS authme (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        realname VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        "isLogged" SMALLINT DEFAULT 0,
        "hasSession" SMALLINT DEFAULT 0,
        totp VARCHAR(32),
        ip VARCHAR(40),
        lastlogin BIGINT,
        regdate BIGINT,
        regip VARCHAR(40),
        yaw REAL,
        pitch REAL,
        x DOUBLE PRECISION DEFAULT 0.0,
        y DOUBLE PRECISION DEFAULT 0.0,
        z DOUBLE PRECISION DEFAULT 0.0,
        world VARCHAR(255) DEFAULT 'world'
      );
    `);
    console.log('[PostgreSQL] AuthMe table schema verified/initialized.');
  } catch (err: any) {
    console.error('[PostgreSQL] Error initializing schema:', err.message);
  }
}
