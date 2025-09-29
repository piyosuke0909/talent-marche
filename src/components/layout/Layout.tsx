'use client'

import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'
import Header from './Header'
import Footer from './Footer'

interface LayoutProps {
  children: React.ReactNode
  session?: Session | null
}

export default function Layout({ children, session }: LayoutProps) {
  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </SessionProvider>
  )
}
