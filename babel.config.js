module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      
      'babel-plugin-transform-import-meta',
      ['transform-define', {
        // This forces the entire 'import.meta' keyword to be replaced with an object
        'import.meta': { env: { MODE: 'development' } } 
      }],
      'react-native-reanimated/plugin',
    ],
  };
};