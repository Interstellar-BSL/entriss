import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthSessionProvider } from "@/components/providers/session-provider";
import { ActionFeedbackProvider } from "@/components/providers/action-feedback-provider";
import { GlobalLoadingProvider } from "@/components/providers/global-loading-provider";

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
  title: "Entriss — Visitor Management",
  description: "Enterprise visitor management for multi-tenant organizations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthSessionProvider>
          <ActionFeedbackProvider>
            <GlobalLoadingProvider>{children}</GlobalLoadingProvider>
          </ActionFeedbackProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
