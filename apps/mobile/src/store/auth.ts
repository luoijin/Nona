import { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { BackendProfile } from '../services/api';
import type { DevelopmentSession } from '../services/api';

type AuthSession = Session | DevelopmentSession;
type AuthState = {
  session: AuthSession | null;
  loading: boolean;
  initialized: boolean;
  backendProfile: BackendProfile | null;
  backendError: string | null;
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setBackendProfile: (profile: BackendProfile | null) => void;
  setBackendError: (error: string | null) => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  initialized: false,
  backendProfile: null,
  backendError: null,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  setBackendProfile: (backendProfile) => set({ backendProfile, backendError: null }),
  setBackendError: (backendError) => set({ backendError }),
  signOut: async () => {
    if (useAuthStore.getState().session?.access_token.startsWith('dev-session-')) {
      set({ session: null, backendProfile: null, backendError: null });
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ session: null, backendProfile: null, backendError: null });
  },
}));
