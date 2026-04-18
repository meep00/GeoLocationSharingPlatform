import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

export default {
  expo: {
    name: "GeoLocationSharingPlatform",
    slug: "geo-location-sharing-platform",
    version: "0.1.0",
    orientation: "portrait",
    newArchEnabled: true,
    userInterfaceStyle: "light",
    assetBundlePatterns: ["**/*"],
    android: {
      config: {
        googleMaps: {
          apiKey: process.env.API_KEY,
        },
      },
    },
    extra: {
      googleMapsApiKey: process.env.API_KEY,
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow GeoTour to use your location for tour tracking.",
        },
      ],
    ],
  },
};
