const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAdiRegistration = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      // Find where the native Android assets folder is
      const assetPath = path.join(config.modRequest.platformProjectRoot, 'app/src/main/assets');
      
      // Ensure the directory exists
      if (!fs.existsSync(assetPath)) {
        fs.mkdirSync(assetPath, { recursive: true });
      }

      // Copy your token file into the native build folder
      const srcFile = path.resolve(config.modRequest.projectRoot, 'native-assets/adi-registration.properties');
      const destFile = path.join(assetPath, 'adi-registration.properties');

      fs.copyFileSync(srcFile, destFile);
      return config;
    },
  ]);
};

module.exports = withAdiRegistration;