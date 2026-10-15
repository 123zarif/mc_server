import Docker from 'dockerode';
import { Readable } from 'stream';

export const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export interface ContainerMetrics {
  name: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'unknown';
  cpuPercent: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
  memoryPercent: number;
  uptimeSeconds: number;
}

export async function getContainerMetrics(containerName: string): Promise<ContainerMetrics> {
  try {
    const container = docker.getContainer(containerName);
    const inspect = await container.inspect();

    const state = inspect.State.Running ? 'running' : inspect.State.Restarting ? 'restarting' : 'exited';

    if (!inspect.State.Running) {
      return {
        name: containerName,
        state,
        cpuPercent: 0,
        memoryUsedMb: 0,
        memoryLimitMb: 0,
        memoryPercent: 0,
        uptimeSeconds: 0
      };
    }

    const startedAt = new Date(inspect.State.StartedAt).getTime();
    const uptimeSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));

    const stats = await container.stats({ stream: false });

    // Calculate CPU %
    let cpuPercent = 0;
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - (stats.precpu_stats?.cpu_usage?.total_usage || 0);
    const systemDelta = (stats.cpu_stats.system_cpu_usage || 0) - (stats.precpu_stats?.system_cpu_usage || 0);
    const onlineCpus = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;

    if (systemDelta > 0 && cpuDelta > 0) {
      cpuPercent = Math.min(100, Math.round(((cpuDelta / systemDelta) * onlineCpus * 100) * 10) / 10);
    }

    // Calculate Memory
    const memoryUsedBytes = stats.memory_stats.usage || 0;
    const memoryLimitBytes = stats.memory_stats.limit || 1;
    const memoryUsedMb = Math.round(memoryUsedBytes / (1024 * 1024));
    const memoryLimitMb = Math.round(memoryLimitBytes / (1024 * 1024));
    const memoryPercent = Math.min(100, Math.round((memoryUsedBytes / memoryLimitBytes) * 1000) / 10);

    return {
      name: containerName,
      state,
      cpuPercent,
      memoryUsedMb,
      memoryLimitMb,
      memoryPercent,
      uptimeSeconds
    };
  } catch (err: any) {
    return {
      name: containerName,
      state: 'unknown',
      cpuPercent: 0,
      memoryUsedMb: 0,
      memoryLimitMb: 0,
      memoryPercent: 0,
      uptimeSeconds: 0
    };
  }
}

/**
 * Execute a console command inside the server container via rcon-cli or shell.
 */
export async function executeContainerCommand(containerName: string, command: string): Promise<string> {
  const container = docker.getContainer(containerName);

  // itzg/minecraft-server has rcon-cli built-in
  const exec = await container.exec({
    Cmd: ['rcon-cli', ...command.trim().split(' ')],
    AttachStdout: true,
    AttachStderr: true
  });

  const stream = await exec.start({ hijack: true, stdin: false });
  return new Promise((resolve, reject) => {
    let output = '';
    stream.on('data', (chunk: Buffer) => {
      // Clean Docker multiplexing headers (first 8 bytes) if present
      const text = chunk.length > 8 && (chunk[0] === 1 || chunk[0] === 2)
        ? chunk.subarray(8).toString('utf-8')
        : chunk.toString('utf-8');
      output += text;
    });

    stream.on('end', () => resolve(output.trim()));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Get raw container logs stream for WebSocket live terminal display.
 */
export async function getContainerLogStream(containerName: string, tail: number = 100): Promise<Readable> {
  const container = docker.getContainer(containerName);
  const rawStream = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
    tail,
    timestamps: false
  });

  return rawStream as unknown as Readable;
}

/**
 * Trigger container power lifecycle action.
 */
export async function controlContainerPower(containerName: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
  const container = docker.getContainer(containerName);
  if (action === 'start') {
    await container.start();
  } else if (action === 'stop') {
    await container.stop({ t: 10 });
  } else if (action === 'restart') {
    await container.restart({ t: 10 });
  }
}

