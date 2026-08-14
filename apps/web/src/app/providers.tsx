'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DemoSessionProvider } from '@/features/auth/demo-session';
import { ApiError } from '@/lib/api-client';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 業務エラー（400/403/404/409）は再試行しても結果が変わらない。
            retry: (failureCount, error) =>
              !(error instanceof ApiError && error.status < 500) && failureCount < 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DemoSessionProvider>{children}</DemoSessionProvider>
    </QueryClientProvider>
  );
}
