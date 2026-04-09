import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ie.foreman.app',
  appName: 'Foreman',
  webDir: 'dist',
  // server: {
  //   // Uncomment for development hot-reload only.
  //   // For production / App Store builds, keep commented so the app loads from bundled dist/.
  //   url: 'https://9b11f743-8542-4806-8d3e-a81555111caa.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  plugins: {
    Geolocation: {},
    LocalNotifications: {},
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
