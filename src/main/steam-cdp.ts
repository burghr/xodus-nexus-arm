// arm64 fork: Steam reads custom artwork files only when it starts. When the
// Steam CEF debug port is open (Decky Loader opens it), send the images to the
// running Steam client too, so that they show at once. Best effort only: if
// the port is closed, Steam shows the files after its next start.

const DEBUG_HOST = '127.0.0.1:8080';
// SteamClient.Apps.SetCustomArtworkForApp asset types.
const PORTRAIT = 0, HERO = 1, WIDE = 3;

const png = (bytes?: Buffer) => Boolean(bytes && bytes.length <= 4 * 1024 * 1024 &&
  bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a');

function evaluate(url: string, expression: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => { socket.close(); reject(Error('Steam did not answer.')); }, timeoutMs);
    const done = (error?: Error) => { clearTimeout(timer); socket.close(); if (error) reject(error); else resolve(); };
    socket.onerror = () => done(Error('Could not connect to Steam.'));
    socket.onopen = () => socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate',
      params: { expression, awaitPromise: true, returnByValue: true } }));
    socket.onmessage = event => {
      const reply = JSON.parse(String(event.data)) as { id?: number; result?: { exceptionDetails?: unknown } };
      if (reply.id !== 1) return;
      done(reply.result?.exceptionDetails ? Error('Steam refused the artwork.') : undefined);
    };
  });
}

export async function pushSteamArtworkLive(appid: number, artwork: { cover?: Buffer; wide?: Buffer },
  fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!Number.isInteger(appid) || appid < 0x80000000 || appid > 0xffffffff) return false;
  const assets = ([[artwork.cover, PORTRAIT], [artwork.wide ?? artwork.cover, HERO], [artwork.wide ?? artwork.cover, WIDE]] as const)
    .filter(([bytes]) => png(bytes));
  if (!assets.length) return false;
  try {
    const response = await fetcher(`http://${DEBUG_HOST}/json`, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) return false;
    const targets = await response.json() as Array<{ title?: unknown; webSocketDebuggerUrl?: unknown }>;
    // Only talk to Steam's own shared context on the local debug port.
    const target = Array.isArray(targets) ? targets.find(entry => entry.title === 'SharedJSContext' &&
      typeof entry.webSocketDebuggerUrl === 'string' && entry.webSocketDebuggerUrl.startsWith(`ws://${DEBUG_HOST}/devtools/page/`)) : undefined;
    if (!target) return false;
    const calls = assets.map(([bytes, type]) =>
      `SteamClient.Apps.SetCustomArtworkForApp(${appid}, ${JSON.stringify(bytes!.toString('base64'))}, 'png', ${type})`);
    await evaluate(target.webSocketDebuggerUrl as string, `Promise.all([${calls.join(', ')}]).then(() => true)`, 10_000);
    return true;
  } catch { return false; }
}
