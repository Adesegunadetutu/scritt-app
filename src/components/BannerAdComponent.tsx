import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';

const productionId = Platform.select({
  android: process.env.EXPO_PUBLIC_AD_UNIT_ID_ANDROID,
  ios: process.env.EXPO_PUBLIC_AD_UNIT_ID_IOS,
});

const adUnitId = __DEV__
  ? TestIds.BANNER
  : (productionId || TestIds.BANNER);

interface BannerAdProps {
  containerClass?: string;
}

const BannerAdComponent: React.FC<BannerAdProps> = ({
  containerClass = "",
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <View className={`px-6 items-center justify-center py-2 ${containerClass}`}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => setIsVisible(true)}
        onAdFailedToLoad={() => setIsVisible(false)}
      />
    </View>
  );
};

export default BannerAdComponent;