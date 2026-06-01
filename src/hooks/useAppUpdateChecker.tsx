import { useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import VersionCheck from 'react-native-version-check';

export function useAppUpdateChecker() {
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // 1. Check if an update is available on the live store
        const update = await VersionCheck.needUpdate();

        if (update && update.isNeeded) {
          Alert.alert(
            'Update Available',
            `A newer version (${update.latestVersion}) of the app is available on the Play Store. Please update for the best experience.`,
            [
              {
                text: 'Update Now',
                onPress: () => {
                  // 2. Redirect the user straight to your Play Store listing URL
                 VersionCheck.getStoreUrl()
                .then((url: string) => Linking.openURL(url))
                .catch((err: any) => console.error('Error opening store', err));
                },
              },
              {
                text: 'Later',
                style: 'cancel',
              },
            ],
            { cancelable: true }
          );
        }
      } catch (error) {
        console.log('Failed to check for store updates:', error);
      }
    };

    // Run the check on app mount (e.g., in your root _layout.tsx)
    if (!__DEV__) { 
      checkForUpdates();
    }
  }, []);
}