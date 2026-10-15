export interface ServerNode {
  id: string;
  name: string;
  type: 'proxy' | 'backend';
  containerName: string;
  host: string;
  port: number;
  rconPort?: number;
  rconPassword?: string;
  description: string;
}

export const config = {
  port: parseInt(process.env.DASHBOARD_PORT || '3000', 10),
  host: process.env.DASHBOARD_HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'mc_network_secret_key_change_in_production_123456789',
  superadmins: (process.env.DASHBOARD_SUPERADMINS || 'litlua,ozzy')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean),
  adminGroups: (process.env.LUCKPERMS_ADMIN_GROUPS || 'admin,owner,operator,op,staff')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean),
  db: {
    host: process.env.POSTGRES_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'mc_admin',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DB || 'mc_network',
  },
  servers: [
    {
      id: 'velocity',
      name: 'Velocity Proxy',
      type: 'proxy',
      containerName: 'mc-velocity',
      host: 'velocity',
      port: 25577,
      description: 'Network Edge Proxy & Traffic Forwarder'
    },
    {
      id: 'auth',
      name: 'Auth Gateway',
      type: 'backend',
      containerName: 'mc-auth',
      host: 'mc-auth',
      port: 25565,
      rconPort: 25575,
      description: 'Player Authentication & Limbo Void'
    },
    {
      id: 'survival',
      name: 'Survival SMP',
      type: 'backend',
      containerName: 'mc-survival',
      host: 'mc-survival',
      port: 25565,
      rconPort: 25575,
      description: 'Main Survival World & Towny/Residence'
    },
    {
      id: 'pvp',
      name: 'PvP Arena',
      type: 'backend',
      containerName: 'mc-pvp',
      host: 'mc-pvp',
      port: 25565,
      rconPort: 25575,
      description: 'Competitive PvP & GrimAC Duel Arena'
    }
  ] as ServerNode[]
};

