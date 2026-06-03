// セッションプロバイダー: NextAuth のセッション情報を全コンポーネントに提供するラッパー
// layout.tsx から呼ばれ、useSession() フックが子コンポーネントで使えるようになる

'use client'

import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'

export default function NextSessionProvider({
  children,
  session
}: {
  children: React.ReactNode
  session?: Session | null
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
