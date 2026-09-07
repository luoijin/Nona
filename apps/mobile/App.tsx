import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { APP_CONFIG } from './src/config/app';
import { surfaces } from './src/config/theme';
import { useSettingsStore } from './src/store/settings';
import { useAuthStore } from './src/store/auth';
import { supabase } from './src/services/supabase';
import { syncProfile } from './src/services/api';
import { NONA_CONFIG } from '@nona/shared';
import { useEffect } from 'react';

export default function App() {
  const highContrast = useSettingsStore((state) => state.highContrast);
  const { session, initialized, backendProfile, setSession, setInitialized, setBackendProfile, setBackendError } = useAuthStore();

  useEffect(() => {
    let active = true;
    const connectAccount = async (accessToken: string, fullName?: string) => {
      const profile = await syncProfile(accessToken, {
        fullName: fullName ?? APP_CONFIG.user.displayName,
        preferredLanguage: NONA_CONFIG.app.defaultLanguage,
      });
      setBackendProfile(profile);
    };
    const connectAccountSafely = (accessToken: string, fullName?: string) => {
      if (accessToken.startsWith('dev-session-')) return;
      void connectAccount(accessToken, fullName).catch((error: unknown) => {
        setBackendError(error instanceof Error ? error.message : NONA_CONFIG.auth.backendConnectionError);
      });
    };
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        if (data.session) connectAccountSafely(data.session.access_token, data.session.user.user_metadata.full_name);
        setInitialized(true);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) connectAccountSafely(nextSession.access_token, nextSession.user.user_metadata.full_name);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [setInitialized, setSession]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, highContrast && styles.highContrast]}>
        <StatusBar style={APP_CONFIG.statusBarStyle} />
        {!initialized ? null : session && backendProfile?.mpinSet ? <HomeScreen /> : <AuthScreen />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: surfaces.app },
  highContrast: { backgroundColor: surfaces.highContrastApp },
});
