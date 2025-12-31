import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "../components/react-query-provider";
import { Navbar } from "../components/navbar";
import { FloatingChat } from "../components/floating-chat";
import { FooterCta } from "../components/footer-cta";

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
          <div className="min-h-screen flex flex-col relative overflow-x-hidden">
            {/* Decorative gradient orbs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
              <div className="orb orb-accent w-[600px] h-[600px] -top-48 -right-48 animate-float" style={{ animationDelay: "0s" }} />
              <div className="orb orb-secondary w-[500px] h-[500px] top-1/3 -left-64 animate-float" style={{ animationDelay: "2s" }} />
              <div className="orb orb-accent w-[400px] h-[400px] bottom-0 right-1/4 animate-float" style={{ animationDelay: "4s" }} />
            </div>
            
            {/* Court line pattern overlay */}
            <div className="pointer-events-none fixed inset-0 court-pattern" />
            
            <Navbar />
            <main className="flex-1 relative z-10">
              {children}
            </main>
            <FooterCta />
          </div>
          <FloatingChat />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
