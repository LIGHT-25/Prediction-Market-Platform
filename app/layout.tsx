import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import Providers from "@/components/Providers";
import { ToastProvider } from "@/components/Toast";
import Navbar from "@/components/Navbar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "StellarPredict — Prediction Markets on Stellar",
  description:
    "Decentralized prediction markets powered by Soroban smart contracts on the Stellar network. Create, trade, and resolve prediction markets with low fees and instant settlement.",
  keywords: ["stellar", "soroban", "prediction markets", "DApp", "blockchain"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("font-sans", geistSans.variable)}
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <ToastProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <footer className="border-t border-border/50 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                  <p>© 2026 StellarPredict. Built on Stellar Testnet.</p>
                  <div className="flex items-center gap-4">
                    <a
                      href="https://stellar.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      Stellar.org
                    </a>
                    <a
                      href="https://soroban.stellar.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      Soroban Docs
                    </a>
                    <a
                      href="https://stellar.expert/explorer/testnet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      Explorer
                    </a>
                  </div>
                </div>
              </footer>
            </div>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
