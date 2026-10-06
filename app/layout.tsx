import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ReactQueryProvider } from "../components/react-query-provider";
import { AuthProvider } from "../components/auth-provider";
import { AppShell } from "../components/app-shell";

const bricolage = localFont({
  src: "../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  variable: "--font-bricolage",
  display: "swap",
  weight: "200 800",
});

const dmSans = localFont({
  src: "../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  display: "swap",
  weight: "100 1000",
});

export const metadata: Metadata = {
  title: "Volley Ref Lab | Master the Whistle",
  description: "AI-powered volleyball referee training. Master calls, rulings, and game situations with adaptive quizzes and real-time video analysis.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmSans.variable}`}>
      <body className="text-ink antialiased font-sans">
        <ReactQueryProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
