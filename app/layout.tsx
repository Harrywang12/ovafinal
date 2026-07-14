import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "../components/react-query-provider";
import { AuthProvider } from "../components/auth-provider";
import { AppShell } from "../components/app-shell";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  adjustFontFallback: false,
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
