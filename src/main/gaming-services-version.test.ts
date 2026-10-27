import { describe, expect, it } from 'vitest';
import { gamingServicesVersionInRegistry } from './gaming-services-version.js';

const applied = [
  'WINE REGISTRY Version 2',
  '',
  '[Software\\\\Microsoft\\\\GamingServices] 1792777420',
  '#time=1dd63160a74f52e',
  '"AvailableVersion"=hex(b):00,00,79,69,75,00,26,00',
  '"CurrentVersion"=hex(b):00,00,79,69,75,00,26,00',
  '',
  '[Software\\\\Microsoft\\\\Other] 1792777420',
  '"CurrentVersion"=dword:00000001',
  '',
].join('\n');

describe('gamingServicesVersionInRegistry', () => {
  it('finds the version that the runtime helper writes', () => {
    expect(gamingServicesVersionInRegistry(applied)).toBe(true);
    expect(gamingServicesVersionInRegistry(applied.replaceAll('\n', '\r\n'))).toBe(true);
  });

  it('needs both values in the GamingServices key', () => {
    expect(gamingServicesVersionInRegistry(applied.replace(/"AvailableVersion".*\n/, ''))).toBe(false);
    expect(gamingServicesVersionInRegistry(applied.replace('GamingServices]', 'GamingServicesOld]'))).toBe(false);
    expect(gamingServicesVersionInRegistry('WINE REGISTRY Version 2\n')).toBe(false);
  });

  it('runs the helper again for another version', () => {
    expect(gamingServicesVersionInRegistry(applied.replaceAll('79,69,75,00,26', '79,69,76,00,26'))).toBe(false);
  });
});
