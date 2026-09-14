import { registerPlugin } from '@capacitor/core';

interface AppSettingsPlugin {
  open(): Promise<void>;
}

export const AppSettings = registerPlugin<AppSettingsPlugin>('AppSettings');
