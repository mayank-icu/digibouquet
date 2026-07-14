const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroid15Fixes(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];
    
    // Ensure the tools namespace is defined
    if (!androidManifest.manifest.$['xmlns:tools']) {
      androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    if (!application.activity) {
      application.activity = [];
    }
    
    const activityName = 'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity';
    const existingActivity = application.activity.find(a => a.$['android:name'] === activityName);

    if (existingActivity) {
      // Modify existing activity to remove the restriction
      existingActivity.$['android:screenOrientation'] = 'unspecified';
      existingActivity.$['tools:replace'] = 'android:screenOrientation';
    } else {
      // Add the activity to override the library's restriction
      application.activity.push({
        $: {
          'android:name': activityName,
          'android:screenOrientation': 'unspecified',
          'tools:replace': 'android:screenOrientation',
          'android:exported': 'false'
        }
      });
    }

    return config;
  });
};
