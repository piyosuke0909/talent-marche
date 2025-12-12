'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface PayoutRequest {
    id: string
    amount: number
    status: string
    bankInfo: string
    createdAt: string
    user: {
        id: string
        username: string
        email: string
        name: string | null
    }
}

function AdminPayoutsContent() {
    const [payouts, setPayouts] = useState<PayoutRequest[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const router = useRouter()

    useEffect(() => {
        fetchPayouts()
    }, [])

    const fetchPayouts = async () => {
        try {
            const res = await fetch('/api/admin/payouts')
            if (res.status === 403) {
                setError('管理者権限がありません')
                setIsLoading(false)
                return
            }
            if (!res.ok) throw new Error('Failed to fetch payouts')
            const data = await res.json()
            setPayouts(data)
        } catch (err) {
            console.error(err)
            setError('データの取得に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    const handleStatusUpdate = async (id: string, status: string) => {
        if (!confirm(`この申請を「${status === 'PROCESSED' ? '振込完了' : '却下'}」にしますか？`)) return

        try {
            const res = await fetch('/api/admin/payouts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            })

            if (!res.ok) throw new Error('Failed to update status')

            // Refresh list
            fetchPayouts()
        } catch (err) {
            console.error(err)
            alert('ステータスの更新に失敗しました')
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen text-red-600 gap-2">
                <AlertCircle className="w-6 h-6" />
                {error}
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">振込申請管理</h1>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申請日時</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ユーザー</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">口座情報</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {payouts.map((payout) => (
                            <tr key={payout.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(payout.createdAt).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{payout.user.username}</div>
                                    <div className="text-sm text-gray-500">{payout.user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                    ¥{payout.amount.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={payout.bankInfo}>
                                    {payout.bankInfo}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payout.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                            payout.status === 'PROCESSED' ? 'bg-green-100 text-green-800' :
                                                'bg-red-100 text-red-800'
                                        }`}>
                                        {payout.status === 'PENDING' ? '申請中' :
                                            payout.status === 'PROCESSED' ? '完了' : '失敗'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    {payout.status === 'PENDING' && (
                                        <>
                                            <button
                                                onClick={() => handleStatusUpdate(payout.id, 'PROCESSED')}
                                                className="text-green-600 hover:text-green-900"
                                                title="振込完了にする"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate(payout.id, 'FAILED')}
                                                className="text-red-600 hover:text-red-900"
                                                title="却下する"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {payouts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">申請はありません</div>
                )}
            </div>
        </div>
    )
}

export default function AdminPayoutsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AdminPayoutsContent />
        </Suspense>
    )
}
