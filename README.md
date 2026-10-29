> **This project is no longer needed.** Xodus Nexus now has native ARM support, so you do not need this port to play PC Game Pass on an ARM handheld. Please use the official [Xodus Nexus](https://github.com/domsvoboda/xodus-nexus) release instead. This port was a fun project, and I learned a lot from it. Thank you to everyone who tested it and sent reports. I do not plan more updates for now, but I keep the repository here as a reference. Please support the upstream Xodus Nexus project and its developer.

# Xodus Nexus arm64 build for ArmadaOS

This repository builds [Xodus Nexus](https://github.com/domsvoboda/xodus-nexus) as a native arm64 AppImage for ARM64 handhelds with [ArmadaOS](https://armadaos.dev/). It is not meant to be used directly.

**To install Xodus Nexus on ArmadaOS, use the install script:** [burghr/xodus-nexus-arm-port](https://github.com/burghr/xodus-nexus-arm-port). The script downloads the AppImage from the [releases](https://github.com/burghr/xodus-nexus-arm/releases) of this repository. It also sets up the parts that the AppImage needs, for example the KDE wallet, Google Chrome for the sign-in, and the Steam shortcut.

## What this is

- An unofficial fork of Xodus Nexus. It is not part of Xodus Nexus, Xodus, ArmadaOS, or Microsoft.
- Do not report problems with this build to the Xodus Nexus developer. Report them in [xodus-nexus-arm-port](https://github.com/burghr/xodus-nexus-arm-port/issues).
- Only the launcher is native arm64. The backend, the Wine runtime, and the games are x86_64, and they run through the FEX translation layer that ArmadaOS includes.
- The launcher does not update itself. To update it, run the install script again.

The changes from upstream and the build steps are in [ARM64.md](ARM64.md). For the features of Xodus Nexus itself, see the [upstream README](https://github.com/domsvoboda/xodus-nexus#readme).

## License

Xodus Nexus is by the [Xodus Nexus contributors](https://github.com/domsvoboda/xodus-nexus/graphs/contributors) and is licensed under the MIT license. This fork keeps that license. See [LICENSE](LICENSE).
