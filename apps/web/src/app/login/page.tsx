'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DEMO_USER_KEY, type DemoUserKey } from '@logimaster/contracts';
import { useDemoSession } from '@/features/auth/demo-session';

const LOGIN_OPTIONS: { key: DemoUserKey; label: string; variant: 'primary' | 'secondary' }[] = [
  { key: DEMO_USER_KEY.OPERATOR, label: '担当者としてログイン', variant: 'primary' },
  { key: DEMO_USER_KEY.ADMIN, label: '管理者としてログイン', variant: 'secondary' },
];

export default function LoginPage() {
  const router = useRouter();
  const { demoUserKey, isRestoring, login } = useDemoSession();

  useEffect(() => {
    if (!isRestoring && demoUserKey) {
      router.replace('/orders');
    }
  }, [demoUserKey, isRestoring, router]);

  const handleLogin = (key: DemoUserKey) => {
    login(key);
    router.replace('/orders');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center gap-4 bg-slate-800 px-6 text-white">
        <span className="text-xl font-bold tracking-tight">LogiMaster</span>
        <span className="hidden text-sm text-slate-300 sm:inline">在庫・出荷管理システム</span>
        <span className="ml-auto text-sm text-slate-200">八王子物流センター</span>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-8 py-10 shadow-sm">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">LogiMaster</h1>
            <p className="mt-2 text-sm text-slate-600">在庫・出荷管理システム</p>
          </div>

          <hr className="my-8 border-slate-200" />

          <div className="space-y-3">
            {LOGIN_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleLogin(option.key)}
                className={`w-full rounded-md px-4 py-3.5 text-base font-medium transition-colors ${
                  option.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-slate-300 bg-white text-blue-700 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            初期版はDemo Authenticationのため、パスワード認証は行いません。
          </p>
        </div>
      </main>
    </div>
  );
}
