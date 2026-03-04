
'use client'

import { useState, useEffect, Suspense, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useSession } from 'next-auth/react'
import { Loader2, AlertCircle, Clock, MapPin, DollarSign, Send, CheckCircle, User as UserIcon, ShieldCheck, ShieldAlert } from 'lucide-react'

interface User {
    id: string
    name: string
    image: string | null
    bio: string | null
    identityVerified: boolean
    createdAt: string
}

interface RequestDetail {
    id: string
    title: string
    description: string
    budget: number | null
    deadline: string | null
    location: string | null
    skills: string[]
    images: string[]
    createdAt: string
    user: User
    category: {
        id: string
        name: string
        slug: string
    }
    _count: {
        proposals: number
    }
    myProposal?: {
        id: string
        createdAt: string
    } | null
}

interface Proposal {
    id: string
    message: string
    price: number
    deliveryDays: number
    createdAt: string
    user: User
}

function RequestDetailContent({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { data: session } = useSession()
    const router = useRouter()

    // State
    const [request, setRequest] = useState<RequestDetail | null>(null)
    const [proposals, setProposals] = useState<Proposal[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    // Proposal Form State
    const [formPrice, setFormPrice] = useState('')
    const [formDays, setFormDays] = useState('')
    const [formMessage, setFormMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showProposalForm, setShowProposalForm] = useState(false)

    useEffect(() => {
        fetchRequest()
    }, [id])

    // If owner, fetch proposals
    useEffect(() => {
        if (request && session?.user?.id === request.user.id) {
            fetchProposals()
        }
    }, [request, session])


    const fetchRequest = async () => {
        try {
            const res = await fetch(`/api/requests/${id}`)
            if (!res.ok) throw new Error('Failed to fetch request')
            const data = await res.json()
            setRequest(data)
        } catch (err) {
            console.error(err)
            setError('依頼の取得に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    const fetchProposals = async () => {
        try {
            const res = await fetch(`/api/requests/${id}/proposals`)
            if (res.ok) {
                const data = await res.json()
                setProposals(data.proposals)
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleSubmitProposal = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!session) {
            router.push('/auth/signin')
            return
        }

        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/requests/${id}/proposals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    price: formPrice,
                    deliveryDays: formDays,
                    message: formMessage
                })
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || 'Failed')
            }

            alert('提案を送信しました！')
            setShowProposalForm(false)
            fetchRequest() // Refresh to update myProposal status
        } catch (err: any) {
            alert(err.message || '提案の送信に失敗しました')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleAcceptProposal = async (proposalId: string) => {
        if (!confirm('この提案を採用して、注文を作成しますか？\n（決済画面へ進みます）')) return

        try {
            const res = await fetch(`/api/proposals/${proposalId}/accept`, {
                method: 'POST'
            })
            if (!res.ok) throw new Error('Accept failed')

            const data = await res.json()
            // Redirect to order page or checkout?
            // Usually accepting a proposal immediately creates an order.
            // But payment? 
            // If the system requires payment upfront, we might need a checkout flow for the proposal.
            // For now, let's assume "Accept" creates the order and redirects to the order page where they might pay.
            // Or maybe it redirects to checkout with pre-filled info.

            // Let's implement the API to return the orderId.
            if (data.orderId) {
                router.push(`/orders/${data.orderId}`)
            }
        } catch (err) {
            alert('採用処理に失敗しました')
        }
    }

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
    if (error || !request) return (
        <div className="flex flex-col items-center justify-center py-20 text-red-600">
            <AlertCircle className="w-12 h-12 mb-4" />
            <p>{error || '依頼が見つかりません'}</p>
        </div>
    )

    const isOwner = session?.user?.id === request.user.id
    const hasProposed = !!request.myProposal

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                            <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-medium">
                                {request.category.name}
                            </span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: ja })}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">{request.title}</h1>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
                            {request.budget && (
                                <div className="flex items-center gap-1">
                                    <DollarSign className="w-4 h-4" />
                                    <span>予算: ¥{request.budget.toLocaleString()}</span>
                                </div>
                            )}
                            {request.deadline && (
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>納期: {new Date(request.deadline).toLocaleDateString()}</span>
                                </div>
                            )}
                            {request.location && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{request.location}</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t pt-6">
                            <h2 className="font-bold text-lg mb-3">依頼内容</h2>
                            <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                                {request.description}
                            </p>

                            {request.images && request.images.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-bold text-sm mb-2 text-gray-700">参考画像</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {request.images.map((image, index) => (
                                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => window.open(image, '_blank')}
                                            >
                                                <Image
                                                    src={image}
                                                    alt={`参考画像 ${index + 1}`}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {request.skills.length > 0 && (
                            <div className="mt-6">
                                <h3 className="font-bold text-sm mb-2 text-gray-700">必要スキル</h3>
                                <div className="flex flex-wrap gap-2">
                                    {request.skills.map(skill => (
                                        <span key={skill} className="bg-gray-100 px-3 py-1 rounded text-sm text-gray-700">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Proposal Form (For Non-Owners) */}
                    {!isOwner && !hasProposed && (
                        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">この依頼に提案する</h2>
                                {!showProposalForm && (
                                    <button
                                        onClick={() => setShowProposalForm(true)}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-bold"
                                    >
                                        提案する
                                    </button>
                                )}
                            </div>

                            {showProposalForm && (
                                <form onSubmit={handleSubmitProposal} className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">提示金額 (円)</label>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                value={formPrice}
                                                onChange={e => setFormPrice(e.target.value)}
                                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                                placeholder="例: 50000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">完了予定日 (日後)</label>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                value={formDays}
                                                onChange={e => setFormDays(e.target.value)}
                                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                                placeholder="例: 7"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">提案メッセージ</label>
                                        <textarea
                                            required
                                            rows={6}
                                            value={formMessage}
                                            onChange={e => setFormMessage(e.target.value)}
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                            placeholder="あなたのスキルや経験、どのように貢献できるかを具体的に記述してください。"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowProposalForm(false)}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                        >
                                            キャンセル
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
                                        >
                                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            提案を送信
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {!isOwner && hasProposed && (
                        <div className="bg-green-50 rounded-lg p-6 border border-green-100 flex items-center text-green-800">
                            <CheckCircle className="w-6 h-6 mr-3" />
                            <div>
                                <p className="font-bold">あなたは既にこの依頼に提案済みです</p>
                                <p className="text-sm mt-1">クライアントからの返信をお待ちください。</p>
                            </div>
                        </div>
                    )}

                    {/* Proposals List (For Owner) */}
                    {isOwner && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center">
                                受信した提案
                                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm font-normal">
                                    {proposals.length}件
                                </span>
                            </h2>

                            {proposals.length === 0 ? (
                                <p className="text-gray-500 py-8 text-center bg-gray-50 rounded-lg">
                                    まだ提案はありません。
                                </p>
                            ) : (
                                proposals.map(proposal => (
                                    <div key={proposal.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center">
                                                <div className="relative w-10 h-10 mr-3">
                                                    <Image
                                                        src={proposal.user.image || '/images/default-avatar.svg'}
                                                        alt={proposal.user.name}
                                                        fill
                                                        className="rounded-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{proposal.user.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {formatDistanceToNow(new Date(proposal.createdAt), { addSuffix: true, locale: ja })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-gray-900">¥{proposal.price.toLocaleString()}</div>
                                                <div className="text-sm text-gray-500">納期: {proposal.deliveryDays}日</div>
                                            </div>
                                        </div>
                                        <p className="text-gray-700 whitespace-pre-wrap mb-6 bg-gray-50 p-4 rounded-lg text-sm">
                                            {proposal.message}
                                        </p>
                                        <div className="flex justify-end gap-3">
                                            <Link
                                                href={`/profile/${proposal.user.id}`}
                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
                                            >
                                                プロフィールを見る
                                            </Link>
                                            <button
                                                onClick={() => handleAcceptProposal(proposal.id)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium shadow-sm transition-transform active:scale-95"
                                            >
                                                この提案を採用する
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Right: User Info & Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">依頼者情報</h3>
                        <div className="flex items-center mb-4">
                            <div className="relative w-16 h-16 mr-4">
                                <Image
                                    src={request.user.image || '/images/default-avatar.svg'}
                                    alt={request.user.name}
                                    fill
                                    className="rounded-full object-cover"
                                />
                            </div>
                            <div>
                                <Link href={`/profile/${request.user.id}`} className="font-bold text-lg hover:underline block">
                                    {request.user.name}
                                </Link>
                                {request.user.identityVerified ? (
                                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium border border-blue-200 mt-1">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        本人確認済
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 px-2 py-0.5 rounded text-xs font-medium border border-gray-200 mt-1">
                                        <ShieldAlert className="w-3.5 h-3.5" />
                                        本人未確認
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                            {request.user.bio || '自己紹介がありません'}
                        </p>
                        <div className="text-xs text-gray-500 space-y-1">
                            <div className="flex items-center">
                                <UserIcon className="w-3 h-3 mr-2" />
                                登録日: {new Date(request.user.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    {/* Safety Tips (Static) */}
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h3 className="font-bold text-gray-700 mb-3 text-sm">安全な取引のために</h3>
                        <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4">
                            <li>外部サービス（LINEなど）への誘導は禁止されています。</li>
                            <li>仮払い前に作業を開始しないでください。</li>
                            <li>不審な依頼は運営に通報してください。</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RequestDetailContent params={params} />
        </Suspense>
    )
}
