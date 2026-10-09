"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState } from "react";
import type { AppRouter } from "./routers/_app";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

let browserQueryClient: QueryClient | undefined;
function getQueryClient() {
  // Server: new client per request. Browser: reuse one so suspense doesn't drop it.
  if (typeof window === "undefined") return new QueryClient();
  return (browserQueryClient ??= new QueryClient());
}

function getUrl() {
  if (typeof window !== "undefined") return "/api/trpc";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api/trpc`;
  return "http://localhost:3000/api/trpc";
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: getUrl() })] }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
