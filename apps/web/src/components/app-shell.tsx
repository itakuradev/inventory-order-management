'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { USER_ROLE_LABEL } from '@logimaster/contracts';
import { useDemoSession } from '@/features/auth/demo-session';
import { useMe } from '@/features/auth/use-me';

type NavItem = { href: string; label: string };
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: '出荷管理',
    items: [
      { href: '/orders', label: '出荷オーダー一覧' },
      { href: '/orders/new', label: '出荷オーダー登録' },
    ],
  },
  {
    title: '在庫管理',
    items: [{ href: '/inventories', label: '在庫一覧' }],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/orders') {
    return pathname === '/orders' || (pathname.startsWith('/orders/') && pathname !== '/orders/new');
  }
  return pathname === href;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { logout } = useDemoSession();
  const { data: me } = useMe();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center gap-4 bg-slate-800 px-4 text-white">
        <button
          type="button"
          aria-label="メニューの表示を切り替える"
          aria-expanded={isSidebarOpen}
          onClick={() => setIsSidebarOpen((open) => !open)}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-md hover:bg-slate-700"
        >
          <span className="h-0.5 w-5 rounded bg-white" />
          <span className="h-0.5 w-5 rounded bg-white" />
          <span className="h-0.5 w-5 rounded bg-white" />
        </button>

        <Link href="/orders" className="text-xl font-bold tracking-tight">
          LogiMaster
        </Link>
        <span className="hidden text-sm text-slate-300 sm:inline">在庫・出荷管理システム</span>

        <div className="ml-auto flex items-center gap-6 text-sm">
          <span className="hidden text-slate-200 md:inline">
            {me?.warehouse.name ?? '八王子物流センター'}
          </span>
          <span className="text-slate-100">
            {me ? `${me.name}（${USER_ROLE_LABEL[me.role]}）` : ''}
          </span>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-slate-200 hover:bg-slate-700"
          >
            ログアウト
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {isSidebarOpen ? (
          <nav className="w-64 shrink-0 border-r border-slate-200 bg-white py-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="mb-4">
                <p className="px-5 py-2 text-sm font-semibold text-slate-700">{group.title}</p>
                <ul>
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={`block border-l-2 py-2.5 pl-8 pr-4 text-sm ${
                            active
                              ? 'border-blue-600 bg-blue-50 font-medium text-blue-700'
                              : 'border-transparent text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        ) : null}

        <main className="min-w-0 flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
