const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function withAdIdRemoval(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest;

    // Add uses-permission with remove to indicate we don't use AD_ID
    if (!mainApplication["uses-permission"]) {
      mainApplication["uses-permission"] = [];
    }

    // Add AD_ID removal declaration
    mainApplication["uses-permission"].push({
      $: {
        "android:name": "com.google.android.gms.permission.AD_ID",
        "tools:node": "remove",
      },
    });

    return config;
  });
};
