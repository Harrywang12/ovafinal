"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FooterCta } from "./footer-cta";
import { Navbar } from "./navbar";

const AUTH_ROUTES = ["/login", "/forgot-password", "/reset-password"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (AUTH_ROUTES.includes(pathname)) return <>{children}</>;
  return <div className="app-frame"><Navbar /><div className="app-content" id={pathname === "/" ? undefined : "main-content"}>{children}</div><FooterCta /></div>;
}
