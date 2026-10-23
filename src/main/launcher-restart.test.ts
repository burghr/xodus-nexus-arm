import { describe, expect, it } from 'vitest';
import { restartArguments } from './launcher-restart.js';

describe('arm64 fork launcher restart', () => {
  it('starts the helper in its own user scope, with the pid and target as plain arguments', () => {
    const args = restartArguments(1234, '/home/user/Xodus Nexus.AppImage');
    expect(args.slice(0, 5)).toEqual(['--user', '--scope', '--quiet', '--collect', '--']);
    expect(args.slice(-2)).toEqual(['1234', '/home/user/Xodus Nexus.AppImage']);
    // The script uses "$1" and "$2", so a target path with spaces stays one argument.
    expect(args[7]).toContain('"$2"');
  });
});
