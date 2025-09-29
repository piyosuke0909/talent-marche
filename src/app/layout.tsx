import type { Metadata } from "next";
import NextSessionProvider from '@/components/providers/SessionProvider'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import "./globals.css";

export const metadata: Metadata = {
  title: "Talent Marche - スキルマッチングプラットフォーム",
  description: "IT技術者のスキルを売買できるCtoCマーケットプレイス",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-100 flex flex-col font-sans">
        <NextSessionProvider>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </NextSessionProvider>
      </body>
    </html>
  );
}
