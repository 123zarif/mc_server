import * as mcUtil from 'minecraft-server-util';
import { config, ServerNode } from '../config.js';
import { getContainerMetrics, ContainerMetrics } from './docker.js';

export interface ServerStatusData {
  id: string;
  name: string;
  type: 'proxy' | 'backend';
  description: string;
  isOnline: boolean;
  pingMs?: number;
  players: {
    online: number;
    max: number;
    list: { name: string; id: string }[];
  };
  version?: string;
  motd?: string;
  metrics: ContainerMetrics;
}

export async function fetchServerStatus(server: ServerNode): Promise<ServerStatusData> {
  const metrics = await getContainerMetrics(server.containerName);

  let isOnline = metrics.state === 'running';
  let pingMs: number | undefined;
  let players = { online: 0, max: 0, list: [] as { name: string; id: string }[] };
  let version: string | undefined;
  let motd: string | undefined;

  if (isOnline) {
    try {
      // Fast Server List Ping (SLP)
      const res = await mcUtil.status(server.host, server.port, {
        timeout: 2500,
        enableSRV: false
      });

      pingMs = res.roundTripLatency;
      version = res.version.name;
      motd = res.motd.clean;
      players = {
        online: res.players.online,
        max: res.players.max,
        list: (res.players.sample || []).map(p => ({ name: p.name, id: p.id }))
      };
    } catch {
      // Server is running in Docker, but Minecraft port might still be initializing
    }
  }

  return {
    id: server.id,
    name: server.name,
    type: server.type,
    description: server.description,
    isOnline,
    pingMs,
    players,
    version,
    motd,
    metrics
  };
}

export async function fetchAllServersStatus(): Promise<ServerStatusData[]> {
  return Promise.all(config.servers.map(s => fetchServerStatus(s)));
}

