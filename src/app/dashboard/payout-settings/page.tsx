'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'


function PayoutSettingsContent() {
    const { data: session } = useSession()
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<'loading' | 'connected' | 'unconnected'>('loading')
    const router = useRouter()

    // Form State
    const [formData, setFormData] = useState({
        bankCode: '',
        branchCode: '',
        accountType: 'ordinary',
        accountNumber: '',
        accountHolder: ''
    })

    useEffect(() => {
        // Check if user has tenant ID setup
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/user/payout-status')
                if (res.ok) {
                    const data = await res.json()
                    setStatus(data.isPayoutSetup ? 'connected' : 'unconnected')
                } else {
                    setStatus('unconnected')
                }
            } catch (e) {
                console.error(e)
                setStatus('unconnected')
            }
        }
        checkStatus()
    }, [])

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        // Simulate validation
        if (!formData.bankCode || !formData.branchCode || !formData.accountNumber || !formData.accountHolder) {
            alert('すべての項目を入力してください')
            setIsLoading(false)
            return
        }

        try {
            // Call API to ensure Tenant is created (Mock Backend)
            // We verify the backend creates the tenant ID even if bank info is not actually sent/stored
            const res = await fetch('/api/payouts/onboarding', {
                method: 'POST'
            })

            if (!res.ok) {
                const err = await res.json()
                // If it fails seriously
                throw new Error(err.error || 'Failed to register')
            }

            // Success (Mock or Real)
            // We treat it as success
            alert('口座情報を登録しました（デモ：実際の口座確認は行われません）')
            setStatus('connected')
            router.refresh()

        } catch (error) {
            console.error(error)
            alert('登録に失敗しました。時間をおいて再度お試しください。')
        } finally {
            setIsLoading(false)
        }
    }

    if (status === 'loading') {
        return <div className="p-8 text-center text-gray-500">読み込み中...</div>
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">振込先口座設定</h1>

            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                        {status === 'connected' ? (
                            <>
                                <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                                登録済み
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-5 h-5 text-indigo-600 mr-2" />
                                銀行口座の登録
                            </>
                        )}
                    </h2>

                    {status === 'connected' ? (
                        <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
                            <p className="text-green-800 font-medium mb-2">振込先口座の設定が完了しています</p>
                            <p className="text-sm text-green-600">売上金は自動的に登録口座へ振り込まれます。</p>
                            <button
                                onClick={() => setStatus('unconnected')}
                                className="mt-4 text-sm text-gray-500 underline hover:text-gray-700"
                            >
                                登録情報を変更する
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">銀行コード (4桁)</label>
                                    <input
                                        type="text"
                                        name="bankCode"
                                        value={formData.bankCode}
                                        onChange={handleChange}
                                        maxLength={4}
                                        placeholder="0001"
                                        className="w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">支店コード (3桁)</label>
                                    <input
                                        type="text"
                                        name="branchCode"
                                        value={formData.branchCode}
                                        onChange={handleChange}
                                        maxLength={3}
                                        placeholder="001"
                                        className="w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">口座種別</label>
                                <select
                                    name="accountType"
                                    value={formData.accountType}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="ordinary">普通 (Ordinary)</option>
                                    <option value="current">当座 (Current)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">口座番号 (7桁)</label>
                                <input
                                    type="text"
                                    name="accountNumber"
                                    value={formData.accountNumber}
                                    onChange={handleChange}
                                    maxLength={7}
                                    placeholder="1234567"
                                    className="w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">口座名義 (全角カナ)</label>
                                <input
                                    type="text"
                                    name="accountHolder"
                                    value={formData.accountHolder}
                                    onChange={handleChange}
                                    placeholder="ヤマダ タロウ"
                                    className="w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            <div className="pt-4 flex justify-center">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center px-8 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition disabled:bg-gray-400 shadow-md"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            登録中...
                                        </>
                                    ) : (
                                        '口座情報を登録する'
                                    )}
                                </button>
                            </div>

                            <p className="mt-4 text-xs text-center text-gray-500">
                                ※デモ環境のため、入力された情報は保存されません。
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function PayoutSettingsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PayoutSettingsContent />
        </Suspense>
    )
}
