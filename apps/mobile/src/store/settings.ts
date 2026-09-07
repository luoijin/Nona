import { create } from 'zustand';
import { APP_CONFIG } from '../config/app';
import type { Language } from '@nona/shared';

type SettingsState = {
  language: Language;
  voiceGuidance: boolean;
  highContrast: boolean;
  setLanguage: (language: Language) => void;
  setVoiceGuidance: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  language: APP_CONFIG.defaultLanguage,
  voiceGuidance: true,
  highContrast: false,
  setLanguage: (language) => set({ language }),
  setVoiceGuidance: (voiceGuidance) => set({ voiceGuidance }),
  setHighContrast: (highContrast) => set({ highContrast }),
}));
