
'use client'

import { useState } from 'react'
import { Loader2, Send, CheckCircle } from 'lucide-react'

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)

        try {
            const res = await fetch('/api/inquiries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (!res.ok) {
                throw new Error('送信に失敗しました')
            }

            setIsSubmitted(true)
            setFormData({ name: '', email: '', subject: '', message: '' })
        } catch (err) {
            setError('エラーが発生しました。時間をおいて再度お試しください。')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    if (isSubmitted) {
        return (
            <div className="container mx-auto max-w-lg px-4 py-16 text-center">
                <div className="mb-6 flex justify-center">
                    <CheckCircle className="h-16 w-16 text-emerald-500" />
                </div>
                <h1 className="mb-4 text-2xl font-bold text-gray-900">詳細を受け付けました</h1>
                <p className="text-gray-600">
                    お問い合わせありがとうございます。<br />
                    内容を確認の上、担当者よりご連絡させていただきます。
                </p>
                <button
                    onClick={() => setIsSubmitted(false)}
                    className="mt-8 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                    新しい問い合わせを送る
                </button>
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-12">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900">お問い合わせ</h1>
                <p className="mt-2 text-gray-600">
                    ご質問やご要望がございましたら、お気軽にお問い合わせください。
                </p>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
                                お名前 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder="田中 太郎"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                                メールアドレス <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder="example@email.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="subject" className="mb-2 block text-sm font-medium text-gray-700">
                            件名 <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="subject"
                            name="subject"
                            required
                            value={formData.subject}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="">選択してください</option>
                            <option value="サービスについて">サービスについて</option>
                            <option value="支払い・振込について">支払い・振込について</option>
                            <option value="不具合の報告">不具合の報告</option>
                            <option value="アカウントについて">アカウントについて</option>
                            <option value="その他">その他</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="message" className="mb-2 block text-sm font-medium text-gray-700">
                            お問い合わせ内容 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="message"
                            name="message"
                            required
                            rows={6}
                            value={formData.message}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="具体的にお書きください..."
                        />
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 送信中...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-5 w-5" /> 送信する
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
