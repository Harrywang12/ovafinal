"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FloatingChat } from "./floating-chat";
import { FooterCta } from "./footer-cta";
import { Navbar } from "./navbar";

const AUTH_ROUTES = ["/login", "/forgot-password", "/reset-password"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  if (isAuthPage) return <>{children}</>;

  return (
    <>
      <div className="min-h-screen flex flex-col relative overflow-x-hidden">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div className="orb orb-accent w-[600px] h-[600px] -top-48 -right-48 animate-float" />
          <div className="orb orb-secondary w-[500px] h-[500px] top-1/3 -left-64 animate-float [animation-delay:2s]" />
          <div className="orb orb-accent w-[400px] h-[400px] bottom-0 right-1/4 animate-float [animation-delay:4s]" />
        </div>
        <div className="pointer-events-none fixed inset-0 court-pattern" aria-hidden="true" />
        <Navbar />
        <div className="flex-1 relative z-10">{children}</div>
        <FooterCta />
      </div>
      <FloatingChat />
    </>
  );
}
