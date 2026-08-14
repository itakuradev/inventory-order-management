'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { demoUserKeySchema, type DemoUserKey } from '@logimaster/contracts';

const STORAGE_KEY = 'logimaster.demo-user-key';

type DemoSession = {
  demoUserKey: DemoUserKey | null;
  /** localStorageからの復元が終わるまではtrue。 */
  isRestoring: boolean;
  login: (demoUserKey: DemoUserKey) => void;
  logout: () => void;
};

const DemoSessionContext = createContext<DemoSession | null>(null);

/**
 * Demo Authenticationのセッション保持。
 * 本認証ではないため、選択したDemo Userの識別子のみをブラウザへ保持する。
 */
export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [demoUserKey, setDemoUserKey] = useState<DemoUserKey | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    const stored = demoUserKeySchema.safeParse(window.localStorage.getItem(STORAGE_KEY));
    if (stored.success) {
      setDemoUserKey(stored.data);
    }
    setIsRestoring(false);
  }, []);

  const login = useCallback((key: DemoUserKey) => {
    window.localStorage.setItem(STORAGE_KEY, key);
    setDemoUserKey(key);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setDemoUserKey(null);
  }, []);

  return (
    <DemoSessionContext.Provider value={{ demoUserKey, isRestoring, login, logout }}>
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession(): DemoSession {
  const session = useContext(DemoSessionContext);
  if (!session) {
    throw new Error('DemoSessionProviderの外でuseDemoSessionを使用しています');
  }
  return session;
}

/** ログイン済みの画面でのみ使用する。未ログイン時はレイアウト側でログイン画面へ誘導する。 */
export function useAuthenticatedDemoUserKey(): DemoUserKey {
  const { demoUserKey } = useDemoSession();
  if (!demoUserKey) {
    throw new Error('ログインしていません');
  }
  return demoUserKey;
}
