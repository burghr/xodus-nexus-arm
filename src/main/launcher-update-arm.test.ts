import { describe, expect, it } from 'vitest';
import { launcherCandidate } from './launcher-update.js';

// arm64 fork: release selection from burghr/xodus-nexus-arm.
function release(tag: string, names = [`Xodus-Nexus-${tag.slice(1)}-arm64.AppImage`]) {
  const url = (name: string) => `https://github.com/burghr/xodus-nexus-arm/releases/download/${tag}/${name}`;
  return { tag_name: tag, assets: names.flatMap(name => [
    { name, size: 100, browser_download_url: url(name) },
    { name: `${name}.sha512sum`, size: 200, browser_download_url: url(`${name}.sha512sum`) },
  ]) };
}

describe('arm64 fork updater', () => {
  it('picks the newest arm build, also for the same upstream version', () => {
    const releases = [release('v0.3.11-arm.1'), release('v0.3.11-arm.2'), release('v0.3.10-arm.2')];
    expect(launcherCandidate(releases, '0.3.11-arm.1', true)?.version).toBe('0.3.11-arm.2');
    expect(launcherCandidate([release('v0.3.12-arm.1'), ...releases], '0.3.11-arm.2', true)?.version).toBe('0.3.12-arm.1');
    expect(launcherCandidate(releases, '0.3.11-arm.2', true)).toBeUndefined();
  });

  it('accepts the asset name of older arm releases', () => {
    const old = release('v0.3.11-arm.1', ['Xodus-Nexus-0.3.11-arm64.AppImage']);
    expect(launcherCandidate([old], '0.3.10-arm.2', true)?.image.name).toBe('Xodus-Nexus-0.3.11-arm64.AppImage');
  });

  it('ignores upstream tags, x86_64 assets, other repositories, and unclear releases', () => {
    expect(launcherCandidate([release('v0.3.12')], '0.3.11-arm.1', true)).toBeUndefined();
    expect(launcherCandidate([release('v0.3.12-arm.1', ['Xodus-Nexus-0.3.12-x86_64.AppImage'])], '0.3.11-arm.1', true)).toBeUndefined();
    const two = release('v0.3.12-arm.1', ['Xodus-Nexus-0.3.12-arm64.AppImage', 'Xodus-Nexus-0.3.12-arm.1-arm64.AppImage']);
    expect(launcherCandidate([two], '0.3.11-arm.1', true)).toBeUndefined();
    const elsewhere = release('v0.3.12-arm.1');
    elsewhere.assets = elsewhere.assets.map(asset => ({ ...asset, browser_download_url: asset.browser_download_url.replace('burghr', 'someone') }));
    expect(launcherCandidate([elsewhere], '0.3.11-arm.1', true)).toBeUndefined();
  });
});
