'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, ArrowRight, History, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

interface Payout {
    id: string
    amount: number
    status: string
    createdAt: string
}

function WalletPageContent() {
    const [balance, setBalance] = useState<number | null>(null)
    const [payouts, setPayouts] = useState<Payout[]>([])
    const [amount, setAmount] = useState('')
    const [bankInfo, setBankInfo] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const router = useRouter()


    useEffect(() => {
        fetchWalletInfo()
    }, [])

    const fetchWalletInfo = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/payouts')
            const data = await res.json()
            if (res.ok) {
                setBalance(data.balance)
                setPayouts(data.payouts)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleRequestPayout = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage('')
        setError('')

        try {
            const res = await fetch('/api/payouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseInt(amount),
                    bankInfo: bankInfo
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to request payout')
            }

            setMessage('振込申請を受け付けました。')
            setAmount('')
            setBankInfo('')
            fetchWalletInfo() // Refresh balance and history
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading && balance === null) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="w-8 h-8 text-blue-600" />
                売上管理・振込申請
            </h1>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-4">
                <div className="bg-indigo-100 p-2 rounded-lg">
                    <ArrowRight className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-indigo-900 mb-1">売上の自動振込について</h3>
                    <p className="text-sm text-indigo-700 mb-2">
                        今後は売上が自動的に登録口座へ振り込まれるようになります（当ページの残高には加算されません）。<br />
                        まだ口座登録がお済みでない方は、設定ページより登録をお願いします。
                    </p>
                    <button
                        onClick={() => router.push('/dashboard/payout-settings')}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-800 underline"
                    >
                        振込先口座の設定はこちら &rarr;
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Balance Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-sm font-medium text-gray-500 mb-2">現在の売上残高</h2>
                    <div className="text-4xl font-bold text-gray-900 mb-6">
                        ¥{balance?.toLocaleString() || 0}
                    </div>

                    <form onSubmit={handleRequestPayout} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                振込申請金額
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    placeholder="0"
                                    min="1000"
                                    max={balance || 0}
                                    required
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">※1,000円以上から申請可能です</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                振込先口座情報
                            </label>
                            <textarea
                                value={bankInfo}
                                onChange={(e) => setBankInfo(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none h-24 resize-none"
                                placeholder="銀行名、支店名、口座種別、口座番号、口座名義（カタカナ）"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || (balance || 0) < 1000}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : '振込申請をする'}
                        </button>
                    </form>
                </div>

                {/* History Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-500" />
                        申請履歴
                    </h2>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {payouts.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">申請履歴はありません</p>
                        ) : (
                            payouts.map((payout) => (
                                <div key={payout.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-bold text-gray-900">¥{payout.amount.toLocaleString()}</div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(payout.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${payout.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                        payout.status === 'PROCESSED' ? 'bg-green-100 text-green-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {payout.status === 'PENDING' ? '申請中' :
                                            payout.status === 'PROCESSED' ? '振込完了' : '失敗'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function WalletPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WalletPageContent />
        </Suspense>
    )
}
