// macOS notarization hook for electron-builder.
// Requires APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID env vars.
// Skipped on non-macOS platforms and when env vars are not set.

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;

  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD || !process.env.APPLE_TEAM_ID) {
    console.log('Skipping notarization — APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, or APPLE_TEAM_ID not set.');
    return;
  }

  let notarize;
  try {
    notarize = require('@electron/notarize').notarize;
  } catch {
    console.log('Skipping notarization — @electron/notarize not installed.');
    return;
  }

  const appId = 'com.deyad.app';
  const appPath = `${appOutDir}/${context.packager.appInfo.productFilename}.app`;

  console.log(`Notarizing ${appId} …`);
  await notarize({
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
