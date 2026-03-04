'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Shield, Mail, KeyRound } from 'lucide-react'

export default function AdminVerifyPage() {
    const router = useRouter()
    const [step, setStep] = useState<'send' | 'verify'>('send')
    const [otp, setOtp] = useState('')
    const [maskedEmail, setMaskedEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSendOtp = async () => {
        setIsLoading(true)
        setError('')

        try {
            const res = await fetch('/api/admin/otp', { method: 'POST' })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'OTPの送信に失敗しました')
                return
            }

            setMaskedEmail(data.maskedEmail)
            setStep('verify')
        } catch {
            setError('通信エラーが発生しました')
        } finally {
            setIsLoading(false)
        }
    }

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const res = await fetch('/api/admin/otp', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp }),
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || '認証に失敗しました')
                return
            }

            // OTP verified, cookie is set — redirect to admin
            router.push('/admin')
            router.refresh()
        } catch {
            setError('通信エラーが発生しました')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                        <Shield className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">管理者認証</h1>
                    <p className="text-gray-500 text-sm mt-2">
                        管理者ページにアクセスするには、ワンタイムパスワードによる認証が必要です。
                    </p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {step === 'send' ? (
                    <div className="space-y-6">
                        <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                            <Mail className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            <p className="text-sm text-gray-600">
                                登録された管理者メールアドレスに6桁の認証コードを送信します。
                            </p>
                        </div>
                        <button
                            onClick={handleSendOtp}
                            disabled={isLoading}
                            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" />送信中...</>
                            ) : (
                                '認証コードを送信'
                            )}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
                            <KeyRound className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <p className="text-sm text-green-700">
                                <strong>{maskedEmail}</strong> に認証コードを送信しました。
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                6桁の認証コード
                            </label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                                className="w-full p-4 text-center text-2xl font-mono tracking-[0.5em] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || otp.length !== 6}
                            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" />認証中...</>
                            ) : (
                                '認証する'
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setStep('send'); setOtp(''); setError('') }}
                            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
                        >
                            コードを再送信する
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
