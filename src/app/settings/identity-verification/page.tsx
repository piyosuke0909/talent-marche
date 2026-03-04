'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Upload, CheckCircle, XCircle, Clock, AlertCircle, ArrowLeft, Shield } from 'lucide-react'

interface VerificationStatus {
    verification: {
        id: string
        documentType: string
        status: string
        adminNote: string | null
        createdAt: string
    } | null
    identityVerified: boolean
}

const documentTypes = [
    { value: 'drivers_license', label: '運転免許証' },
    { value: 'passport', label: 'パスポート' },
    { value: 'my_number_card', label: 'マイナンバーカード' },
]

export default function IdentityVerificationPage() {
    const router = useRouter()
    const { data: session, status: sessionStatus } = useSession()
    const [verificationData, setVerificationData] = useState<VerificationStatus | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [documentType, setDocumentType] = useState('')
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [imageBase64, setImageBase64] = useState<string | null>(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        if (sessionStatus === 'loading') return
        if (!session) {
            router.push('/auth/signin?callbackUrl=/settings/identity-verification')
            return
        }
        fetchStatus()
    }, [session, sessionStatus, router])

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/identity-verification')
            if (res.ok) {
                const data = await res.json()
                setVerificationData(data)
            }
        } catch {
            setError('ステータスの取得に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            setError('ファイルサイズは5MB以下にしてください')
            return
        }

        setImagePreview(URL.createObjectURL(file))

        const reader = new FileReader()
        reader.onloadend = () => {
            setImageBase64(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!documentType || !imageBase64) {
            setError('証明書の種類と画像を選択してください')
            return
        }

        setIsSubmitting(true)

        try {
            const res = await fetch('/api/identity-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentType,
                    documentImage: imageBase64,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || '提出に失敗しました')
                return
            }

            setSuccess(data.message)
            setImagePreview(null)
            setImageBase64(null)
            setDocumentType('')
            await fetchStatus()
        } catch {
            setError('提出に失敗しました')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading || sessionStatus === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    const v = verificationData?.verification
    const isVerified = verificationData?.identityVerified
    const canSubmit = !v || v.status === 'REJECTED'
    const isPending = v?.status === 'PENDING'

    return (
        <div className="bg-gray-100 min-h-screen">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <div className="mb-6">
                    <Link href="/settings/profile" className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        設定に戻る
                    </Link>
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <Shield className="w-7 h-7 text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-900">本人確認</h1>
                </div>

                {/* Current Status */}
                {isVerified && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 flex items-center gap-4">
                        <CheckCircle className="w-10 h-10 text-green-600 flex-shrink-0" />
                        <div>
                            <h2 className="text-lg font-bold text-green-800">本人確認済み</h2>
                            <p className="text-green-700 text-sm">あなたの本人確認は完了しています。</p>
                        </div>
                    </div>
                )}

                {isPending && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6 flex items-center gap-4">
                        <Clock className="w-10 h-10 text-amber-600 flex-shrink-0" />
                        <div>
                            <h2 className="text-lg font-bold text-amber-800">審査中</h2>
                            <p className="text-amber-700 text-sm">
                                提出日: {new Date(v!.createdAt).toLocaleDateString('ja-JP')} — 管理者による審査をお待ちください。
                            </p>
                        </div>
                    </div>
                )}

                {v?.status === 'REJECTED' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                        <div className="flex items-center gap-4 mb-3">
                            <XCircle className="w-10 h-10 text-red-600 flex-shrink-0" />
                            <div>
                                <h2 className="text-lg font-bold text-red-800">却下されました</h2>
                                <p className="text-red-700 text-sm">下記の理由により、本人確認が却下されました。再度お申し込みください。</p>
                            </div>
                        </div>
                        {v.adminNote && (
                            <div className="bg-white border border-red-100 rounded p-3 mt-2">
                                <p className="text-sm text-gray-700"><strong>却下理由: </strong>{v.adminNote}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Submission Form */}
                {canSubmit && !isVerified && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-bold mb-4 text-gray-900">身分証明書の提出</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            本人確認を行うには、公的な身分証明書の画像をアップロードしてください。
                            管理者が確認後、本人確認バッジが付与されます。
                        </p>

                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mb-4 bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Document Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    証明書の種類 <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={documentType}
                                    onChange={(e) => setDocumentType(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">選択してください</option>
                                    {documentTypes.map(dt => (
                                        <option key={dt.value} value={dt.value}>{dt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    証明書の画像 <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex items-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 bg-gray-50 transition-colors">
                                        <Upload className="w-8 h-8 text-gray-400 mr-3" />
                                        <div>
                                            <p className="text-gray-600 font-medium">画像をアップロード</p>
                                            <p className="text-sm text-gray-500">JPG, PNG形式（5MB以下）</p>
                                        </div>
                                    </div>
                                </div>

                                {imagePreview && (
                                    <div className="mt-4 relative inline-block">
                                        <Image
                                            src={imagePreview}
                                            alt="証明書プレビュー"
                                            width={300}
                                            height={200}
                                            className="rounded-lg border object-cover max-h-48"
                                            unoptimized
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setImagePreview(null)
                                                setImageBase64(null)
                                            }}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Warning */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>ご注意：</strong>提出された画像は本人確認の目的のみに使用され、安全に管理されます。
                                    個人情報は適切に保護いたします。
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !documentType || !imageBase64}
                                className="w-full p-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        提出中...
                                    </>
                                ) : (
                                    '身分証明書を提出する'
                                )}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}
