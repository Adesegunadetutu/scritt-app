const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// This forces Metro to resolve Zustand to its CJS entry point
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    return {
      filePath: require.resolve(moduleName),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Add mjs support which helps with modern library resolution
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

module.exports = withNativeWind(config, { input: './global.css' });