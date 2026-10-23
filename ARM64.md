# arm64 build

This branch builds Xodus Nexus as a native arm64 AppImage for
ArmadaOS. It is not an official build.

Changes from upstream:

- `src/main/backend-releases.ts`: allow arm64. The backend stays x86_64,
  and FEX runs it through binfmt_misc.
- `src/main/launcher-update.ts`: on Linux arm64, the launcher updates itself
  from the releases of this fork, not from upstream. It accepts tags such as
  `v0.3.11-arm.2`, takes the `*-arm64.AppImage` asset, and checks for an
  arm64 ELF file. On other systems, the upstream behavior stays the same.
- `src/main/steam-cdp.ts`, `src/main/steam-live.ts`: after "Add to Steam",
  also send the artwork to the running Steam client through its CEF debug
  port (127.0.0.1:8080). Decky Loader opens that port. Without it, Steam
  shows the artwork after its next start, as upstream does.
- `src/main/index.ts`: open the window maximized when the default or saved
  size is as large as the screen work area. On a small handheld screen, the
  title bar and the panel otherwise hide the bottom of the window.

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
npx electron-builder --linux AppImage --arm64 --publish never \
  -c.extraMetadata.version=<upstream version>-arm.<build>
```

The version must be the same as the release tag without the `v`, for
example `0.3.11-arm.2` for the tag `v0.3.11-arm.2`. The launcher compares
its own version with the release tags, so a build with a wrong version does
not find updates, or finds an update to itself. `package.json` keeps the
upstream version, so upstream merges do not get a conflict there.

The result is `release/Xodus-Nexus-<upstream version>-arm.<build>-arm64.AppImage`.

## Release

1. Build with the version of the new tag (see above).
2. Make the checksum file: `shasum -a 512 Xodus-Nexus-<version>-arm64.AppImage > Xodus-Nexus-<version>-arm64.AppImage.sha512sum`.
3. Tag the commit `v<version>`, and push the tag.
4. Publish a GitHub release for the tag with both files. Do not mark it as a pre-release: the launcher ignores pre-releases.

## Upstream updates

```bash
git fetch upstream --tags
git merge v<new version>
```

This fork has its own short `README.md`. If the merge has a conflict in that file, keep the fork version:

```bash
git checkout --ours README.md
git add README.md
```
