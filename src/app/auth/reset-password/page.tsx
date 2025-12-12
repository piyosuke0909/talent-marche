'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function ResetPasswordPageContent() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    setError('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset email')
      }

      setStep('reset')
      setMessage('認証コードを送信しました。メールをご確認ください。')
    } catch (err: any) {
      setError('エラーが発生しました。しばらく時間をおいて再度お試しください。')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    setError('')

    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      setMessage('パスワードを再設定しました。ログインページへ移動します...')
      setTimeout(() => {
        router.push('/auth/signin')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'パスワードの再設定に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            パスワードリセット
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'email'
              ? '登録されているメールアドレスを入力してください。'
              : 'メールに届いた認証コードと新しいパスワードを入力してください。'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {message && (
            <div className="mb-4 bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {step === 'email' ? (
            <form className="space-y-6" onSubmit={handleSendEmail}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '送信中...' : '認証コードを送信'}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                  認証コード (6桁)
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 tracking-widest"
                  placeholder="123456"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="8文字以上"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '更新中...' : 'パスワードを変更'}
                </button>
              </div>
            </form>
          )}

          <div className="text-center mt-6">
            <Link href="/auth/signin" className="text-sm text-blue-600 hover:underline">
              ログインページに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordPageContent />
    </Suspense>
  )
}
