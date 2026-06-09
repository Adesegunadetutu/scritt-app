import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Scritt',
  slug: 'myapp',
  version: '1.0.5',
  // 🔔 Add notification configuration at the top level
  notification: {
    icon: "./assets/notification-icon.png", // Ensure this exists and is transparent/white
    color: "#ffffff",
  },
  ios: {
    ...config.ios,
    bundleIdentifier: "com.adesegunadetutu.scritt",
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    ...config.android,
    package: "com.adesegunadetutu.scritt",
    googleServicesFile: "./google-services.json",
    // 🔋 Critical for background delivery on Android 13+
    permissions: [
      "android.permission.POST_NOTIFICATIONS",
      "RECEIVE_BOOT_COMPLETED", // Restarts notification listeners after phone reboot
      "WAKE_LOCK",              // Allows the CPU to wake up to process the push
      "VIBRATE",
      "SCHEDULE_EXACT_ALARM"         // Required for some background scheduling in Android 13
    ],
    // 🔗 Critical for notification clicks to actually open the app correctly
    intentFilters: [
      {
        action: "VIEW",
        data: [
          {
            scheme: "com.adesegunadetutu.scritt"
          }
        ],
        category: ["BROWSABLE", "DEFAULT"]
      }
    ],
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }
  },
  plugins: [
    ...(config.plugins || []),
    "expo-secure-store",
    "expo-font",
    "expo-router",
    // 🔔 Explicitly add expo-notifications plugin
    [
      "expo-notifications",
      {
        "icon": "./assets/notification-icon.png",
        "color": "#ffffff"
      }
    ],
    "@react-native-community/datetimepicker",
    "./withAdiRegistration",
    "expo-web-browser",
    [
      "expo-build-properties",
      {
        "android": {
          "ndkVersion": "26.1.10909125",
          "compileSdkVersion": 35,
          "targetSdkVersion": 35,
          "buildToolsVersion": "35.0.0"
        }
      }
    ]
  ],
  extra: {
    ...config.extra,
    eas: {
      projectId: "33ac3f0b-27ed-45ad-8d92-c0a681d5aca6"
    }
  }
});