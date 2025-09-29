'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      // パスワードリセット機能は実装していないため、メッセージのみ表示
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒待機（API呼び出しのシミュレーション）
      
      setIsSuccess(true)
      setMessage('パスワードリセットのリンクを送信しました。メールをご確認ください。')
    } catch {
      setMessage('エラーが発生しました。しばらく時間をおいて再度お試しください。')
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
              登録されているメールアドレスを入力してください。
              パスワードリセット用のリンクをお送りします。
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-8">
            {!isSuccess ? (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {message && (
                  <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
                    {message}
                  </div>
                )}
                
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
                    {isLoading ? '送信中...' : 'リセットリンクを送信'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center">
                <div className="mb-4">
                  <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded mb-6">
                  {message}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  メールが届かない場合は、迷惑メールフォルダもご確認ください。
                </p>
              </div>
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
