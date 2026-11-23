import type { ExpoConfig, ConfigContext } from 'expo/config';
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Coleta',
  slug: 'coleta-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'coleta',
  userInterfaceStyle: 'light',
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL || '',
  },
  icon: './assets/icon.png',
  ios: { supportsTablet: true, bundleIdentifier: 'com.coleta.mobile' },
  android: {
    package: 'com.coleta.mobile',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundColor: '#214D3A',
    },
  },
  web: {
    output: 'single',
    favicon: './assets/favicon.png',
    name: 'Coleta',
    description: 'Cuidar da cidade começa por aqui. Aplicativo mobile de coleta.',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      { backgroundColor: '#F7F8F2', image: './assets/icon.png', imageWidth: 110 },
    ],
    'expo-font',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'O Coleta usa sua localização para definir pontos de coleta e compartilhar a posição do caminhão durante a rota.',
      },
    ],
    ...(process.env.GOOGLE_MAPS_API_KEY
      ? [
          ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY }] as [
            string,
            { androidGoogleMapsApiKey: string },
          ],
        ]
      : []),
  ],
});
