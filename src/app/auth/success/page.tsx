'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

export default function AuthSuccessPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin')
        }
    }, [status, router])

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    おかえりなさい！
                </h1>

                <p className="text-gray-600 mb-8">
                    {session?.user?.name ? `${session.user.name}さん、` : ''}
                    ログインが完了しました。<br />
                    Talent Marcheで新しい才能を探しましょう。
                </p>

                <div className="space-y-4">
                    <Link
                        href="/dashboard"
                        className="block w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition shadow-md"
                    >
                        ダッシュボードへ
                    </Link>

                    <Link
                        href="/"
                        className="block w-full bg-white text-gray-700 font-bold py-3 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
                    >
                        トップページへ戻る
                    </Link>
                </div>
            </div>
        </div>
    )
}
