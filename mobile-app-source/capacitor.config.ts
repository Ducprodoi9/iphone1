import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ronnguyen.fuehrerscheinvietduc',
  appName: 'Führerschein Viet-Duc',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff'
  }
};

export default config;
