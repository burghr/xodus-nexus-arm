import { spawn } from 'node:child_process';
import { accessSync, constants } from 'node:fs';

// arm64 fork: a desktop menu often starts the launcher as a systemd user
// service with KillMode=control-group. When the old launcher exits, systemd
// stops that service and kills every process in it, also the helper that
// app.relaunch() leaves to start the new AppImage. The new AppImage is then
// killed while it mounts, and the AppImage runtime shows a FUSE error.
// Start the helper in its own systemd scope instead, so that it survives.
const SYSTEMD_RUN = ['/usr/bin/systemd-run', '/bin/systemd-run'];

// The helper waits for the old launcher to exit, because only one launcher
// can run at a time, then starts the new AppImage with the same environment.
const WAIT_THEN_START = 'while kill -0 "$1" 2>/dev/null; do sleep 0.2; done; exec "$2"';

export function restartArguments(pid: number, target: string): string[] {
  return ['--user', '--scope', '--quiet', '--collect', '--', '/bin/sh', '-c', WAIT_THEN_START, 'nexus-restart', String(pid), target];
}

/** Return true if the restart helper started. The caller then quits. */
export function restartInOwnScope(target: string, environment: NodeJS.ProcessEnv = process.env): boolean {
  if (process.platform !== 'linux') return false;
  const command = SYSTEMD_RUN.find(file => { try { accessSync(file, constants.X_OK); return true; } catch { return false; } });
  if (!command) return false;
  try {
    const child = spawn(command, restartArguments(process.pid, target), { env: environment, detached: true, stdio: 'ignore' });
    child.on('error', () => {});
    child.unref();
    return typeof child.pid === 'number';
  } catch { return false; }
}
