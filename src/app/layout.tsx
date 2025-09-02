import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import ErrorBoundary from "@/components/ui/error-boundary";
import { ErrorLoggerProvider } from "@/components/providers/error-logger-provider";
import { ActivityTrackerProvider } from "@/components/providers/activity-tracker-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Keiri - フリーランス向け経理ウェブアプリ",
  description: "税の知識がないフリーランス向けに帳簿付けを簡単にし、確定申告の負担を軽減するウェブアプリケーション",
  keywords: ["経理", "確定申告", "フリーランス", "帳簿", "仕訳"],
  authors: [{ name: "Keiri Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans`}
      >
        <ErrorLoggerProvider>
          <ActivityTrackerProvider>
            <ErrorBoundary>
              <ToastProvider>
                {children}
              </ToastProvider>
            </ErrorBoundary>
          </ActivityTrackerProvider>
        </ErrorLoggerProvider>
      </body>
    </html>
  );
}
