const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// 1. Add mjs/cjs support
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// 2. Define your Zustand fix
const customResolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    return {
      filePath: require.resolve(moduleName),
      type: 'sourceFile',
    };
  }
  // IMPORTANT: Fallback to the default resolver so other tools can work
  return context.resolveRequest(context, moduleName, platform);
};

// 3. Apply the custom resolver
config.resolver.resolveRequest = customResolveRequest;

// 4. Wrap with NativeWind LAST
// This allows NativeWind to hook into the resolver safely
module.exports = withNativeWind(config, { input: './global.css' });