const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const assetsDir = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "assets"
      );

      // Create assets directory if it doesn't exist
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }

      // Copy adi-registration.properties
      const sourceFile = path.join(
        projectRoot,
        "assets",
        "adi-registration.properties"
      );
      const destFile = path.join(assetsDir, "adi-registration.properties");

      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, destFile);
        console.log("Copied adi-registration.properties to Android assets");
      }

      return config;
    },
  ]);
};
