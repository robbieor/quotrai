import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9b11f743854248068d3ea81555111caa',
  appName: 'Foreman',
  webDir: 'dist',
  // server: {
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
