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
    package: "com.empress1.scritt", // This must be unique
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
      projectId: "dbdb70ca-2a99-421f-8133-8ed1573542af"
    }
  },
  updates: {
    url: "https://u.expo.dev/dbdb70ca-2a99-421f-8133-8ed1573542af"
  },
  runtimeVersion: {
    policy: "appVersion"
  }
});