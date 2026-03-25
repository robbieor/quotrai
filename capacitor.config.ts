import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9b11f743854248068d3ea81555111caa',
  appName: 'Quotr',
  webDir: 'dist',
  server: {
    // Comment out or remove these two lines for production builds
    // so the app loads from the bundled dist/ folder instead.
    url: 'https://9b11f743-8542-4806-8d3e-a81555111caa.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    Geolocation: {},
    LocalNotifications: {},
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
