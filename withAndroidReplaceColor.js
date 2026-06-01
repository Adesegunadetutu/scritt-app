const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidReplaceColor(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    
    // 1. Add the 'tools' namespace to the manifest tag if it's missing
    if (!config.modResults.manifest.$['xmlns:tools']) {
      config.modResults.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // 2. Find the specific meta-data tag for notification color
    const notificationColorMetadata = mainApplication['meta-data']?.find(
      (item) => item.$['android:name'] === 'com.google.firebase.messaging.default_notification_color'
    );

    if (notificationColorMetadata) {
      // 3. Add the tools:replace attribute to override the Firebase default
      notificationColorMetadata.$['tools:replace'] = 'android:resource';
    }

    return config;
  });
};