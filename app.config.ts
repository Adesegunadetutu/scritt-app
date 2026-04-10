import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Scritt',
  slug: 'myapp',
  version: '1.0.0',
  ios: {
      bundleIdentifier: "com.adesegunadetutu.scritt", // Add this line
      supportsTablet: true,
      infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
    },
  android: {
    package: "com.adesegunadetutu.scritt", // This must be unique
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }
  },
  plugins: [
    "expo-router",
    "@react-native-community/datetimepicker",
    "expo-web-browser"
  ],
  // ... other existing config
  extra: {
    ...config.extra,
    eas: {
      projectId: "33ac3f0b-27ed-45ad-8d92-c0a681d5aca6"
    }
  },
  updates: {
    url: "https://u.expo.dev/33ac3f0b-27ed-45ad-8d92-c0a681d5aca6"
  },
  runtimeVersion: {
    policy: "appVersion"
  }
});