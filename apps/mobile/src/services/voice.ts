import * as Speech from 'expo-speech';
import { Language } from '../config/app';

const speechLocales: Record<Language, string> = {
  en: 'en-US',
  tl: 'fil-PH',
  ceb: 'fil-PH',
};

export function speak(text: string, language: Language) {
  Speech.stop();
  Speech.speak(text, { language: speechLocales[language], rate: 0.82 });
}
