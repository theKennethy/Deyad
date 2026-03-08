import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';

import path from 'node:path';
import fs from 'fs';
import { version } from './package.json';
// AppImage maker will produce .AppImage on linux hosts (handled outside Forge)

import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'deyad',      // lowercase to satisfy installer expectations
  },
  rebuildConfig: {},
  makers: [
    // windows installers/ZIP
    ...(process.platform === 'win32' ? [new MakerSquirrel({})] : []),
    // on linux we still want .deb and .rpm packages so users can
    // install via their distro's package manager, in addition to the
    // AppImage produced separately.
    ...(process.platform === 'linux' ? [new MakerDeb({}), new MakerRpm({})] : []),
    // a ZIP file for all platforms as a fallback/archive
    new MakerZIP({}, ['win32','darwin','linux']),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    postMake: async (_forgeConfig, results) => {
      console.log('postMake results:', JSON.stringify(results, null, 2));

      // regardless of what forge returns, we know where the linux and darwin
      // directories are created by the packager, so just try to create the
      // AppImage/DMG unconditionally. This avoids the "could not determine
      // base path" warnings above.
      // only create DMG here – AppImage is handled by a separate
      // script because the electron-installer-appimage module has been
      // unreliable (it often trips over forge's build metadata).  Running
      // `appimagetool` manually after packaging is more predictable.
      const { default: createDMG } = await import('electron-installer-dmg');

      const darwinDir = path.join(process.cwd(), 'out', `Deyad-darwin-x64`);
      if (process.platform === 'darwin' && fs.existsSync(darwinDir)) {
        try {
          await createDMG({
            appPath: path.join(darwinDir, 'Deyad.app'),
            name: `Deyad-${version}`,
            out: path.dirname(darwinDir),
          });
        } catch (err) {
          console.warn('DMG creation failed', err);
        }
      }
    },
  },
};

export default config;
