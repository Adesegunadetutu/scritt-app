import mobileAds from "react-native-google-mobile-ads";

export const initMobileAds = async () => {
  await mobileAds().initialize();
  console.log("AdMob Initialized!");
};