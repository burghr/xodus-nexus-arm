# arm64 proof of concept

This private branch builds Xodus Nexus as a native arm64 AppImage for
ArmadaOS. It is not an official build.

Changes from upstream:

- `src/main/backend-releases.ts`: allow arm64. The backend stays x86_64,
  and FEX runs it through binfmt_misc.
- `src/main/index.ts`: no launcher self-update on arm64. Upstream releases
  are x86_64 only, and an update would replace this build.
- `src/main/steam-cdp.ts`, `src/main/steam-live.ts`: after "Add to Steam",
  also send the artwork to the running Steam client through its CEF debug
  port (127.0.0.1:8080). Decky Loader opens that port. Without it, Steam
  shows the artwork after its next start, as upstream does.

The Wine runtime and the games stay x86_64 and run through FEX.

## Build

The upstream tests expect Linux, so many of them fail on macOS. Build
without them:

```bash
npm ci
npm run clean
npm run typecheck
npx vite build
npx tsc -p tsconfig.electron.json
npx electron-builder --linux AppImage --arm64 --publish never
```

The result is `release/Xodus-Nexus-<version>-arm64.AppImage`.

## Upstream updates

```bash
git fetch upstream --tags
git merge v<new version>
```
