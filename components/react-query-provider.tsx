"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const status = (error as Error & { status?: number }).status;
          return status !== 401 && status !== 403 && failureCount < 2;
        },
      },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
