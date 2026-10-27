import fs from 'node:fs/promises';
import path from 'node:path';

// arm64 fork: before each game, the runtime's Wine launcher runs
// gaming-services-version.exe in its own Wine session to write the Gaming
// Services version, then starts Wine again for the game. Under FEX the extra
// session costs about 7 s. When the prefix already has the value, skip it.
// The bytes must match scripts/runtime-compat/gaming-services-version.c
// (38.117.27001.0). If a runtime writes another version, the check fails and
// the helper runs as before.
const VERSION = 'hex(b):00,00,79,69,75,00,26,00';

/** True when system.reg already has the Gaming Services version that the runtime writes. */
export function gamingServicesVersionInRegistry(systemReg: string): boolean {
  const section = systemReg.split(/\r?\n(?=\[)/)
    .find(part => /^\[Software\\\\Microsoft\\\\GamingServices\]/i.test(part));
  if (!section) return false;
  return ['CurrentVersion', 'AvailableVersion']
    .every(name => section.split(/\r?\n/).includes(`"${name}"=${VERSION}`));
}

export async function gamingServicesVersionApplied(prefix: string): Promise<boolean> {
  try { return gamingServicesVersionInRegistry(await fs.readFile(path.join(prefix, 'system.reg'), 'latin1')); }
  catch { return false; }
}
