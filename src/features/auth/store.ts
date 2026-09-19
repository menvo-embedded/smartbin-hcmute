import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../core/supabase/client';
import { isEnvConfigured } from '../../core/config/env';
import { toSignInErrorMessage } from './authError';
import type { Profile } from '../../shared/types/database';
import type { Role } from '../../shared/constants/waste';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  role: Role | null;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  get role() {
    return get().profile?.role ?? null;
  },

  /** Gọi một lần ở root layout. Trả về hàm huỷ lắng nghe. */
  init: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, loading: false });
      if (data.session) void loadProfile(set, data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session) void loadProfile(set, session.user.id);
      else set({ profile: null });
    });

    return () => sub.subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    if (!isEnvConfigured) {
      throw new Error('Thiếu cấu hình Supabase. Hãy kiểm tra file .env (xem .env.example).');
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(toSignInErrorMessage(error));
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));

async function loadProfile(set: (s: Partial<AuthState>) => void, userId: string) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (data) set({ profile: data });
}
