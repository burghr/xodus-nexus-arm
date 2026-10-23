// arm64 fork: Steam reads custom artwork files only when it starts. When the
// Steam CEF debug port is open (Decky Loader opens it), send the images to the
// running Steam client too, so that they show at once. Best effort only: if
// the port is closed, Steam shows the files after its next start.

const DEBUG_HOST = '127.0.0.1:8080';
// SteamClient.Apps.SetCustomArtworkForApp asset types.
const PORTRAIT = 0, HERO = 1, WIDE = 3;

const png = (bytes?: Buffer) => Boolean(bytes && bytes.length <= 4 * 1024 * 1024 &&
  bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a');
const validAppId = (appid: number) => Number.isInteger(appid) && appid >= 0x80000000 && appid <= 0xffffffff;

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
      done(reply.result?.exceptionDetails ? Error('Steam refused the request.') : undefined);
    };
  });
}

/** The WebSocket address of Steam's shared context, or undefined. */
async function steamContext(fetcher: typeof fetch): Promise<string | undefined> {
  const response = await fetcher(`http://${DEBUG_HOST}/json`, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) return undefined;
  const targets = await response.json() as Array<{ title?: unknown; webSocketDebuggerUrl?: unknown }>;
  // Only talk to Steam's own shared context on the local debug port.
  const target = Array.isArray(targets) ? targets.find(entry => entry.title === 'SharedJSContext' &&
    typeof entry.webSocketDebuggerUrl === 'string' && entry.webSocketDebuggerUrl.startsWith(`ws://${DEBUG_HOST}/devtools/page/`)) : undefined;
  return target?.webSocketDebuggerUrl as string | undefined;
}

export async function pushSteamArtworkLive(appid: number, artwork: { cover?: Buffer; wide?: Buffer },
  fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!validAppId(appid)) return false;
  const assets = ([[artwork.cover, PORTRAIT], [artwork.wide ?? artwork.cover, HERO], [artwork.wide ?? artwork.cover, WIDE]] as const)
    .filter(([bytes]) => png(bytes));
  if (!assets.length) return false;
  try {
    const context = await steamContext(fetcher);
    if (!context) return false;
    const calls = assets.map(([bytes, type]) =>
      `SteamClient.Apps.SetCustomArtworkForApp(${appid}, ${JSON.stringify(bytes!.toString('base64'))}, 'png', ${type})`);
    await evaluate(context, `Promise.all([${calls.join(', ')}]).then(() => true)`, 10_000);
    return true;
  } catch { return false; }
}

// Steam picks the default controller layout of a non-Steam shortcut by its
// name, and community layouts for that name win. Game Pass titles often have a
// "Web Browser" layout from cloud gaming in a browser, so the game gets no
// gamepad. For each connected controller whose layout for the new shortcut
// does not use the gamepad, select the Gamepad template of that controller
// type, the same call that Steam's own layout picker makes. Layouts that use
// the gamepad stay as they are.
export function gamepadLayoutScript(appid: number): string {
  return `(async (app) => {
  const input = SteamClient.Input;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const read = index => Promise.race([input.GetConfigForAppAndController(app, index), wait(800)]).catch(() => undefined);
  const connected = [];
  for (let index = 0; index < 32; index++) {
    const config = await read(index);
    if (config && typeof config.nControllerType === 'number') connected.push({ index, config });
  }
  const change = connected.filter(entry => entry.config.bUsesGamepad === false);
  if (!change.length) return 0;
  const templates = [];
  const registration = input.RegisterForControllerConfigInfoMessages(list => { templates.push(...[].concat(list)); });
  input.QueryControllerConfigsForApp(app, change[0].index, false);
  await wait(2000);
  try { registration?.unregister?.(); } catch {}
  // Most controller types have "_gamepad_joystick". The Steam Deck lists its
  // gamepad template as "_gamepad_fps" ("Gamepad With Joystick Trackpad").
  const preferred = ['_gamepad_joystick.vdf', '_gamepad_fps.vdf', '_gamepad+mouse.vdf'];
  let changed = 0;
  for (const { index, config } of change) {
    const own = templates.filter(entry => entry && entry.nControllerType === config.nControllerType &&
      typeof entry.URL === 'string' && entry.URL.startsWith('template://controller_'));
    const template = preferred.map(suffix => own.find(entry => entry.URL.endsWith(suffix))).find(Boolean);
    if (!template) continue;
    input.SetSelectedConfigForApp(app, index, template.URL, false, 0);
    changed++;
  }
  return changed;
})(${appid})`;
}

export async function pushSteamGamepadLayoutLive(appid: number, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!validAppId(appid)) return false;
  try {
    const context = await steamContext(fetcher);
    if (!context) return false;
    await evaluate(context, gamepadLayoutScript(appid), 60_000);
    return true;
  } catch { return false; }
}
