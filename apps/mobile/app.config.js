const shared = require('../../packages/shared/config.json');

module.exports = {
  expo: {
    name: shared.app.name,
    slug: shared.app.slug,
    version: shared.app.version,
    platforms: [shared.app.platform],
    orientation: 'portrait',
    scheme: shared.app.slug,
    userInterfaceStyle: 'light',
    android: {
      package: shared.app.androidPackage,
      minSdkVersion: shared.app.androidMinSdkVersion,
      adaptiveIcon: {
        backgroundColor: shared.app.androidAdaptiveIconBackground,
      },
    },
    plugins: ['expo-secure-store'],
  },
};
