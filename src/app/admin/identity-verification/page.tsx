'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Loader2, CheckCircle, XCircle, AlertCircle, Shield, User, Eye, EyeOff } from 'lucide-react'

interface VerificationRequest {
    id: string
    documentImage: string
    documentType: string
    status: string
    adminNote: string | null
    createdAt: string
    user: {
        id: string
        username: string
        email: string
        name: string | null
        image: string | null
        identityVerified: boolean
    }
}

const documentTypeLabels: Record<string, string> = {
    drivers_license: '運転免許証',
    passport: 'パスポート',
    my_number_card: 'マイナンバーカード',
}

function AdminIdentityVerificationContent() {
    const [verifications, setVerifications] = useState<VerificationRequest[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [rejectNote, setRejectNote] = useState('')
    const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
    const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set())
    const searchParams = useSearchParams()
    const router = useRouter()

    const statusFilter = searchParams?.get('status') || 'PENDING'

    useEffect(() => {
        fetchVerifications()
    }, [statusFilter])

    const fetchVerifications = async () => {
        setIsLoading(true)
        setError('')
        try {
            const res = await fetch(`/api/admin/identity-verification?status=${statusFilter}`)
            if (res.status === 403) {
                setError('管理者権限がありません')
                return
            }
            if (!res.ok) throw new Error('Failed to fetch')
            const data = await res.json()
            setVerifications(data.verifications)
        } catch {
            setError('データの取得に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    const handleApprove = async (id: string) => {
        if (!confirm('この申請を承認し、本人確認済みにしますか？')) return

        setProcessingId(id)
        try {
            const res = await fetch(`/api/admin/identity-verification/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'APPROVED' }),
            })
            if (!res.ok) throw new Error('Failed')
            await fetchVerifications()
        } catch {
            alert('承認に失敗しました')
        } finally {
            setProcessingId(null)
        }
    }

    const handleReject = async (id: string) => {
        if (!rejectNote.trim()) {
            alert('却下理由を入力してください')
            return
        }

        setProcessingId(id)
        try {
            const res = await fetch(`/api/admin/identity-verification/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'REJECTED', adminNote: rejectNote }),
            })
            if (!res.ok) throw new Error('Failed')
            setShowRejectModal(null)
            setRejectNote('')
            await fetchVerifications()
        } catch {
            alert('却下に失敗しました')
        } finally {
            setProcessingId(null)
        }
    }

    const toggleImage = (id: string) => {
        setExpandedImages(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
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
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Shield className="w-8 h-8 text-indigo-600" />
                本人確認審査
            </h1>

            {/* Status Filter Tabs */}
            <div className="mb-6 flex gap-2">
                {['PENDING', 'APPROVED', 'REJECTED'].map(status => (
                    <button
                        key={status}
                        onClick={() => router.push(`/admin/identity-verification?status=${status}`)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statusFilter === status
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border'
                            }`}
                    >
                        {status === 'PENDING' ? '審査待ち' : status === 'APPROVED' ? '承認済み' : '却下済み'}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            ) : verifications.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
                    該当する申請はありません
                </div>
            ) : (
                <div className="space-y-4">
                    {verifications.map(v => (
                        <div key={v.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-start justify-between gap-4">
                                    {/* User Info */}
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 flex-shrink-0">
                                            {v.user.image ? (
                                                <Image src={v.user.image} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" unoptimized />
                                            ) : (
                                                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <User className="h-7 w-7 text-gray-500" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900">{v.user.name || v.user.username}</div>
                                            <div className="text-sm text-gray-500">@{v.user.username} • {v.user.email}</div>
                                            <div className="text-xs text-gray-400">
                                                提出日: {new Date(v.createdAt).toLocaleString('ja-JP')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Document Type Badge */}
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                                            {documentTypeLabels[v.documentType] || v.documentType}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${v.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                            v.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {v.status === 'PENDING' ? '審査待ち' : v.status === 'APPROVED' ? '承認済み' : '却下済み'}
                                        </span>
                                    </div>
                                </div>

                                {/* Document Image Toggle */}
                                <div className="mt-4">
                                    <button
                                        onClick={() => toggleImage(v.id)}
                                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        {expandedImages.has(v.id) ? (
                                            <><EyeOff className="w-4 h-4" /> 画像を非表示</>
                                        ) : (
                                            <><Eye className="w-4 h-4" /> 証明書画像を表示</>
                                        )}
                                    </button>

                                    {expandedImages.has(v.id) && (
                                        <div className="mt-3 bg-gray-50 border rounded-lg p-4">
                                            <Image
                                                src={v.documentImage}
                                                alt="身分証明書"
                                                width={600}
                                                height={400}
                                                className="max-w-full h-auto rounded-lg border"
                                                unoptimized
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Admin Note (for rejected) */}
                                {v.adminNote && (
                                    <div className="mt-3 bg-gray-50 rounded p-3 text-sm text-gray-700">
                                        <strong>管理者コメント: </strong>{v.adminNote}
                                    </div>
                                )}

                                {/* Actions (only for PENDING) */}
                                {v.status === 'PENDING' && (
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => handleApprove(v.id)}
                                            disabled={processingId === v.id}
                                            className="inline-flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {processingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            承認する
                                        </button>
                                        <button
                                            onClick={() => setShowRejectModal(v.id)}
                                            disabled={processingId === v.id}
                                            className="inline-flex items-center gap-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            却下する
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">却下理由を入力</h2>
                        <textarea
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            placeholder="却下理由を入力してください（ユーザーに表示されます）"
                            rows={4}
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 resize-none"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(null)
                                    setRejectNote('')
                                }}
                                className="flex-1 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={() => handleReject(showRejectModal)}
                                disabled={processingId !== null}
                                className="flex-1 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                却下する
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function AdminIdentityVerificationPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>}>
            <AdminIdentityVerificationContent />
        </Suspense>
    )
}
