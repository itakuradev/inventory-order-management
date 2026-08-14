'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { useDemoSession } from '@/features/auth/demo-session';

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { demoUserKey, isRestoring } = useDemoSession();

  useEffect(() => {
    if (!isRestoring && !demoUserKey) {
      router.replace('/login');
    }
  }, [demoUserKey, isRestoring, router]);

  // 画面側の制御は補助であり、業務ルールと認可の保証はサーバー側が行う。
  if (isRestoring || !demoUserKey) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
