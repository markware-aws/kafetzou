// Dynamic Expo config — reads from .env.development or .env.production
// depending on the EAS build profile (set APP_ENV=development|production)
// For local dev, values fall back to localhost defaults.

const IS_PROD = process.env.APP_ENV === "production";

module.exports = {
  expo: {
    name: IS_PROD ? "Fortune Teller" : "Fortune Teller (Dev)",
    slug: "kafetzou",
    version: "1.0.0",
    orientation: "portrait",
    scheme: IS_PROD ? "kafetzou" : "kafetzou-dev",
    userInterfaceStyle: "dark",
    ios: {
      supportsTablet: false,
      bundleIdentifier: IS_PROD ? "com.kafetzou.app" : "com.kafetzou.app.dev",
      infoPlist: {
        NSPhotoLibraryUsageDescription:
          "We need access to your photo library to select coffee cup images for reading.",
        NSCameraUsageDescription:
          "Take a photo of your coffee cup for a reading.",
      },
    },
    android: {
      package: IS_PROD ? "com.kafetzou.app" : "com.kafetzou.app.dev",
      permissions: ["READ_EXTERNAL_STORAGE", "CAMERA"],
    },
    plugins: [
      "expo-router",
      [
        "expo-image-picker",
        {
          photosPermission:
            "We need access to your photo library to select coffee cup images.",
          cameraPermission: "Take a photo of your coffee cup for a reading.",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      apiUrl: process.env.API_URL ?? "http://localhost:8000",
      staticUrl: process.env.STATIC_URL ?? "http://localhost:3000",
      cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID ?? "",
      cognitoClientId: process.env.COGNITO_CLIENT_ID ?? "",
      cognitoDomain: process.env.COGNITO_DOMAIN ?? "",
      storeUrl: process.env.STORE_URL ?? "http://localhost:3000/buy-credits",
      eas: {
        projectId: process.env.EAS_PROJECT_ID ?? "your-eas-project-id",
      },
    },
  },
};
