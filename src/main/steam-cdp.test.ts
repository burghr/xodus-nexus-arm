import { describe, expect, it, vi } from 'vitest';
import { gamepadLayoutScript, pushSteamArtworkLive, pushSteamGamepadLayoutLive } from './steam-cdp.js';

const image = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from('image')]);
const reply = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body))) as unknown as typeof fetch;

describe('live Steam artwork', () => {
  it('does nothing when the Steam debug port is closed', async () => {
    const closed = vi.fn(async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch;
    expect(await pushSteamArtworkLive(0x80000001, { cover: image }, closed)).toBe(false);
  });

  it('refuses invalid shortcut IDs and missing artwork without a request', async () => {
    const fetcher = reply([]);
    expect(await pushSteamArtworkLive(12, { cover: image }, fetcher)).toBe(false);
    expect(await pushSteamArtworkLive(0x80000001, { cover: Buffer.from('not a png') }, fetcher)).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('talks only to the Steam shared context on the local debug port', async () => {
    const targets = [
      { title: 'Steam Big Picture Mode', webSocketDebuggerUrl: 'ws://127.0.0.1:8080/devtools/page/A' },
      { title: 'SharedJSContext', webSocketDebuggerUrl: 'ws://192.0.2.1:8080/devtools/page/B' },
    ];
    expect(await pushSteamArtworkLive(0x80000001, { cover: image }, reply(targets))).toBe(false);
  });
});

describe('live Steam gamepad layout', () => {
  it('does nothing when the Steam debug port is closed, or for an invalid shortcut ID', async () => {
    const closed = vi.fn(async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch;
    expect(await pushSteamGamepadLayoutLive(0x80000001, closed)).toBe(false);
    const fetcher = reply([]);
    expect(await pushSteamGamepadLayoutLive(12, fetcher)).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('builds a script that changes only layouts without a gamepad, to a gamepad template', () => {
    const script = gamepadLayoutScript(0x80000001);
    expect(script).toContain(`(${0x80000001})`);
    expect(script).toContain('bUsesGamepad === false');
    expect(script).toContain('SetSelectedConfigForApp(app, index, url, false, 0)');
    expect(script).toContain('result.bUsesGamepad === true');
    // The script must be valid JavaScript.
    expect(() => new Function(`return ${script}`)).not.toThrow();
  });
});
