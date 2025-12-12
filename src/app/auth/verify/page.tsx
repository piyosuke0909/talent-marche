'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, Mail, Lock, ArrowRight, CheckCircle, Loader2 } from 'lucide-react'

function VerifyPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [step, setStep] = useState<'email' | 'otp'>('email')
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isAutoSending, setIsAutoSending] = useState(false)

    const handleAutoSendOtp = async (emailToSend: string) => {
        setIsAutoSending(true)
        setIsLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailToSend }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send OTP')
            }

            setSuccess('認証コードを送信しました。メールをご確認ください。')
            setStep('otp')
        } catch (err: any) {
            setError(err.message)
            setIsAutoSending(false)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        const emailParam = searchParams?.get('email')
        if (emailParam && !isAutoSending && step === 'email') {
            setEmail(emailParam)
            // Auto send OTP if email is present
            handleAutoSendOtp(emailParam)
        }
    }, [searchParams, isAutoSending, step])

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')
        setSuccess('')

        try {
            const res = await fetch('/api/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send OTP')
            }

            setSuccess('認証コードを送信しました。メールをご確認ください。')
            setStep('otp')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')
        setSuccess('')

        try {
            const res = await fetch('/api/auth/otp', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Invalid OTP')
            }

            setSuccess('認証に成功しました！')
            // Redirect or perform next action
            setTimeout(() => {
                router.push('/auth/signin')
            }, 2000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center">
                    <div className="mx-auto bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">メール認証</h1>
                    <p className="text-blue-100 mt-2 text-sm">
                        {step === 'email' ? 'メールアドレスを入力してください' : '認証コードを入力してください'}
                    </p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-current" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            {success}
                        </div>
                    )}

                    {step === 'email' ? (
                        <form onSubmit={handleSendOtp} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    メールアドレス
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                        placeholder="example@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        認証コードを送信
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    認証コード (6桁)
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none tracking-widest text-lg"
                                        placeholder="123456"
                                        maxLength={6}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        認証する
                                        <CheckCircle className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep('email')}
                                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                メールアドレスを変更する
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyPageContent />
        </Suspense>
    )
}
