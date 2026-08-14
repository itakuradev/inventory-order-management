import type { ReactNode } from 'react';

export function ErrorAlert({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}

export function InfoPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function LoadingPanel({ label = '読み込み中です' }: { label?: string }) {
  return <InfoPanel>{label}...</InfoPanel>;
}
