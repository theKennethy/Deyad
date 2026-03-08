import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';

import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import path from 'node:path';
import { version } from './package.json';
// we'll build an AppImage manually in postMake hook

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
    // Squirrel for Windows still requires Wine/Mono on Linux; we add a ZIP
    // fallback to allow building without those tools.
    new MakerSquirrel({}),
    new MakerZIP({}, ['win32','darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
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
      // helper to extract base output path from result element
      const resolveBase = (r: any): string | undefined => {
        if (!r) return undefined;
        if (typeof r === 'string') return r;
        if (Array.isArray(r) && r.length > 0) return r[0];
        if (r.outputPath) return r.outputPath;
        if (r[0]) return r[0];
        return undefined;
      };
      // create AppImage on linux
      const { default: createAppImage } = await import('electron-installer-appimage');
      for (const result of results) {
        const base = resolveBase(result);
        if (!base) {
          console.warn('could not determine base path for result', result);
          continue;
        }
        if (result.platform === 'linux') {
          const dir = path.join(base, `deyad-${version}-linux-x64`);
          try {
            await createAppImage({
              src: dir,
              dest: base,
              arch: 'x86_64',
              options: { icon: path.join(dir, 'build', 'icons', '256x256.png') },
            });
          } catch (err) {
            console.warn('AppImage creation failed', err);
          }
        }
        if (result.platform === 'darwin') {
          // generate DMG using electron-installer-dmg
          const { default: createDMG } = await import('electron-installer-dmg');
          const dir = path.join(base, `deyad-${version}-darwin-x64`);
          try {
            await createDMG({
              appPath: path.join(dir, 'Deyad.app'),
              name: `Deyad-${version}`,
              out: base,
            });
          } catch (err) {
            console.warn('DMG creation failed', err);
          }
        }
      }
    },
  },
};

export default config;
