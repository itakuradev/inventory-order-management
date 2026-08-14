'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDemoSession } from '@/features/auth/demo-session';

export default function HomePage() {
  const router = useRouter();
  const { demoUserKey, isRestoring } = useDemoSession();

  useEffect(() => {
    if (isRestoring) {
      return;
    }
    router.replace(demoUserKey ? '/orders' : '/login');
  }, [demoUserKey, isRestoring, router]);

  return null;
}
