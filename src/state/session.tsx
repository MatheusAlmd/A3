import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api, configureSession, DEMO_MODE } from '../api/client';
import { demoLogin, setDemoUser } from '../api/demo';
import { ApiError } from '../api/errors';
import type { Login, Role, User } from '../api/types';

interface SessionContextValue {
  user: User | null;
  restoring: boolean;
  expired: boolean;
  login: (email: string, password: string) => Promise<void>;
  enterDemo: (role: Role) => void;
  logout: () => void;
}
const SessionContext = createContext<SessionContextValue>(null!);
const KEY = 'coleta-session';
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Login | null>(null);
  const [restoring, setRestoring] = useState(!DEMO_MODE && Platform.OS !== 'web');
  const [expired, setExpired] = useState(false);
  const clear = useCallback((isExpired = false) => {
    configureSession(null);
    setSession(null);
    setDemoUser(null);
    setExpired(isExpired);
    if (Platform.OS !== 'web') void SecureStore.deleteItemAsync(KEY).catch(() => {});
  }, []);
  const accept = useCallback(
    (next: Login) => {
      configureSession(next, () => clear(true));
      setSession(next);
      setExpired(false);
      if (DEMO_MODE) setDemoUser(next.user);
    },
    [clear],
  );
  useEffect(() => {
    if (DEMO_MODE || Platform.OS === 'web') return;
    let active = true;
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        if (!raw || !active) return;
        const saved = JSON.parse(raw) as Login;
        if (Date.parse(saved.expiresAt) <= Date.now()) {
          clear(true);
          return;
        }
        configureSession(saved, () => clear(true));
        try {
          saved.user = await api.me();
        } catch (e) {
          if (!(e instanceof ApiError) || e.status !== 0) throw e;
        }
        if (active) accept(saved);
      } catch {
        if (active) clear();
      } finally {
        if (active) setRestoring(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [accept, clear]);
  useEffect(() => {
    if (!session) return;
    const ms = Date.parse(session.expiresAt) - Date.now();
    const timer = setTimeout(() => clear(true), Math.max(0, Math.min(ms, 2147483647)));
    return () => clearTimeout(timer);
  }, [session, clear]);
  const login = async (email: string, password: string) => {
    const next = await api.login(email, password);
    if (!DEMO_MODE && Platform.OS !== 'web')
      await SecureStore.setItemAsync(KEY, JSON.stringify(next));
    accept(next);
  };
  return (
    <SessionContext.Provider
      value={{
        user: session?.user || null,
        restoring,
        expired,
        login,
        enterDemo: (role) => accept(demoLogin(role)),
        logout: () => clear(),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export const useSession = () => useContext(SessionContext);
