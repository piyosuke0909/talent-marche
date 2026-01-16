'use client'

import Image from 'next/image'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  UserCircle,
} from 'lucide-react'

type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'

interface OrderUser {
  id: string
  name: string | null
  username: string
  image: string | null
  bio?: string | null
}

interface OrderMessage {
  id: string
  content: string
  isRead: boolean
  createdAt: string
  senderId: string
  receiverId: string
  sender: OrderUser
  receiver: OrderUser
}

interface OrderDetail {
  id: string
  status: OrderStatus
  totalAmount: number
  message: string | null
  deadline: string | null
  createdAt: string
  updatedAt: string
  sellerId: string
  buyerId: string
  service: {
    id: string
    title: string
    description: string
    price: number
    deliveryDays: number
    images: string[]
    category?: {
      id: string
      name: string
    } | null
  } | null
  seller: OrderUser
  buyer: OrderUser
  messages: OrderMessage[]
  reviews: Array<{
    id: string
    rating: number
    comment: string | null
    createdAt: string
    reviewer: OrderUser
  }>
}

interface OrderDetailClientProps {
  initialOrder: OrderDetail
  currentUserId: string
}

const statusLabels: Record<OrderStatus, string> = {
  PENDING: '保留中',
  IN_PROGRESS: '進行中',
  COMPLETED: '完了',
  CANCELLED: 'キャンセル',
  DISPUTED: '異議あり',
}

const statusDescriptions: Partial<Record<OrderStatus, string>> = {
  PENDING: '承認待ちの状態です。販売者の対応をお待ちください。',
  IN_PROGRESS: '作業が進行中です。納品までお待ちください。',
  COMPLETED: '取引が完了しました。レビューの投稿を検討しましょう。',
  CANCELLED: '取引がキャンセルされました。',
  DISPUTED: 'サポート対応中です。詳細はサポートにお問い合わせください。',
}

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  DISPUTED: 'bg-purple-100 text-purple-700',
}

function formatDateTime(value: string | null) {
  if (!value) return '未設定'
  return new Date(value).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function OrderDetailClient({ initialOrder, currentUserId }: OrderDetailClientProps) {
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail>(initialOrder)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<OrderStatus | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Delivery States
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false)
  const [deliveryMessage, setDeliveryMessage] = useState('')
  const [isDelivering, setIsDelivering] = useState(false)

  const isSeller = order.sellerId === currentUserId
  const counterparty = isSeller ? order.buyer : order.seller

  const availableStatusActions = (() => {
    if (order.status === 'CANCELLED' || order.status === 'COMPLETED' || order.status === 'DISPUTED') return []

    if (isSeller) {
      return (['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as OrderStatus[]).filter(status => {
        if (status === 'IN_PROGRESS' && order.status !== 'PENDING') return false
        if (status === 'COMPLETED' && order.status !== 'IN_PROGRESS') return false
        if (status === 'CANCELLED' && order.status === 'COMPLETED') return false
        return status !== order.status
      })
    }

    if (!isSeller && order.status === 'PENDING') {
      return ['CANCELLED'] as OrderStatus[]
    }

    return []
  })()

  const refreshOrder = async () => {
    setIsRefreshing(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/orders/${order.id}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || '注文の再読み込みに失敗しました')
      }

      const data: OrderDetail = await response.json()
      setOrder(data)
      setFeedback('最新の状態に更新しました')
    } catch (error) {
      setErrorMessage((error as Error).message)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleStatusUpdate = async (nextStatus: OrderStatus) => {
    setUpdatingStatus(nextStatus)
    setErrorMessage(null)
    setFeedback(null)
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'ステータスの更新に失敗しました')
      }

      await refreshOrder()
      setFeedback('ステータスを更新しました')
    } catch (error) {
      setErrorMessage((error as Error).message)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleDelivery = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsDelivering(true)
    setErrorMessage(null)

    try {
      // 1. Send Message
      const msgRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: order.buyerId,
          content: `【納品報告】\n${deliveryMessage}`,
          orderId: order.id, // Creating relationship to order
        }),
      })

      if (!msgRes.ok) throw new Error('メッセージの送信に失敗しました')

      // 2. Update Status to COMPLETED
      const statusRes = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      })

      if (!statusRes.ok) throw new Error('ステータスの更新に失敗しました')

      // 3. Refresh
      await refreshOrder()
      setFeedback('納品が完了しました！')
      setIsDeliveryModalOpen(false)
      setDeliveryMessage('')
    } catch (err) {
      setErrorMessage((err as Error).message)
    } finally {
      setIsDelivering(false)
    }
  }

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  const hasReviewed = order.reviews.some(r => r.reviewer.id === currentUserId)
  const canReview = order.status === 'COMPLETED' && !hasReviewed

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingReview(true)
    setErrorMessage(null)
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          rating,
          comment
        })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'レビューの送信に失敗しました')
      }

      await refreshOrder()
      setFeedback('レビューを送信しました')
      setIsReviewModalOpen(false)
    } catch (error) {
      setErrorMessage((error as Error).message)
    } finally {
      setIsSubmittingReview(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-bold text-gray-900">レビューを書く</h3>
            <form onSubmit={handleReviewSubmit}>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">評価 (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-2xl transition-colors ${rating >= star ? 'text-amber-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">コメント (任意)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  rows={4}
                  placeholder="取引の感想を書いてください..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  disabled={isSubmittingReview}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSubmittingReview}
                >
                  {isSubmittingReview ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : '送信する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> 戻る
        </button>
        <button
          onClick={refreshOrder}
          disabled={isRefreshing}
          className="flex items-center rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRefreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<RefreshCw className="mr-1 h-4 w-4" /> 最新の状態を取得
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">注文番号</p>
                <h1 className="text-2xl font-bold text-gray-900">#{order.id.slice(-8)}</h1>
              </div>
              <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${statusColors[order.status]}`}>
                {statusLabels[order.status]}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center text-sm text-gray-500">
                  <ShoppingBag className="mr-2 h-4 w-4" /> 合計金額
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">¥{order.totalAmount.toLocaleString()}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center text-sm text-gray-500">
                  <CalendarClock className="mr-2 h-4 w-4" /> 納期
                </div>
                <p className="mt-2 text-lg font-medium text-gray-900">{formatDateTime(order.deadline)}</p>
              </div>
            </div>

            <dl className="mt-6 grid gap-4 text-sm text-gray-600 sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-gray-700">注文日時</dt>
                <dd>{formatDateTime(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">最終更新</dt>
                <dd>{formatDateTime(order.updatedAt)}</dd>
              </div>
              {order.message && (
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-gray-700">購入時メッセージ</dt>
                  <dd className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-gray-700">
                    {order.message}
                  </dd>
                </div>
              )}
            </dl>

            {statusDescriptions[order.status] && (
              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                {statusDescriptions[order.status]}
              </div>
            )}

            {canReview && (
              <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-6 text-center">
                <p className="mb-4 text-amber-800 font-medium">取引が完了しました！相手へのレビューを書きませんか？</p>
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-amber-600 transition-colors"
                >
                  レビューを書く
                </button>
              </div>
            )}
          </div>

          {order.service && (
            <div className="rounded-2xl bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">サービス情報</h2>
                <Link
                  href={`/services/${order.service.id}`}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  サービス詳細を見る
                </Link>
              </div>
              <div className="grid gap-6 md:grid-cols-[160px,1fr]">
                {order.service.images?.[0] ? (
                  <Image
                    src={order.service.images[0]}
                    alt={order.service.title}
                    width={640}
                    height={320}
                    className="h-40 w-full rounded-xl object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                    <ClipboardList className="h-8 w-8" />
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{order.service.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{order.service.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span className="rounded-full bg-gray-100 px-3 py-1">標準価格 ¥{order.service.price.toLocaleString()}</span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">納期 {order.service.deliveryDays}日</span>
                    {order.service.category && (
                      <span className="rounded-full bg-gray-100 px-3 py-1">カテゴリ: {order.service.category.name}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">メッセージ履歴</h2>
              <Link
                href={`/messages/${counterparty.id}?orderId=${order.id}`}
                className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <MessageCircle className="mr-2 h-4 w-4" /> メッセージを開く
              </Link>
            </div>

            {order.messages.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-500">
                メッセージはまだありません。相手に初回メッセージを送ってみましょう。
              </div>
            ) : (
              <ol className="space-y-4">
                {order.messages.map(msg => (
                  <li
                    key={msg.id}
                    className={`rounded-xl border px-4 py-3 text-sm ${msg.senderId === currentUserId
                      ? 'border-blue-100 bg-blue-50 text-blue-800'
                      : 'border-gray-100 bg-white text-gray-700'
                      }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        {msg.senderId === currentUserId ? 'あなた' : msg.sender.name || `@${msg.sender.username}`}
                      </span>
                      <span className="text-gray-500">{formatDateTime(msg.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {order.reviews.length > 0 && (
            <div className="rounded-2xl bg-white p-6 shadow-md">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">レビュー</h2>
              <div className="space-y-4">
                {order.reviews.map(review => (
                  <div key={review.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-700">
                        {review.reviewer.name || `@${review.reviewer.username}`}
                      </span>
                      <span className="text-gray-500">{formatDateTime(review.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-amber-500">評価: {review.rating} / 5</p>
                    {review.comment && (
                      <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">取引相手情報</h2>
            <div className="mt-4 flex items-center gap-4">
              <Image
                src={counterparty.image || '/images/default-avatar.svg'}
                alt={counterparty.name || counterparty.username}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
                unoptimized
              />
              <div>
                <p className="text-lg font-semibold text-gray-900">{counterparty.name || '未設定'}</p>
                <p className="text-sm text-gray-500">@{counterparty.username}</p>
              </div>
            </div>
            {counterparty.bio && (
              <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{counterparty.bio}</p>
            )}
            <Link
              href={`/profile?user=${counterparty.id}`}
              className="mt-4 inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <UserCircle className="mr-2 h-4 w-4" /> プロフィールを見る
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">取引アクション</h2>
            <p className="mt-2 text-sm text-gray-600">
              状況に応じてステータスを更新できます。更新すると相手に通知されます。
            </p>

            {/* Delivery Button for Seller */}
            {isSeller && order.status === 'IN_PROGRESS' && (
              <button
                onClick={() => setIsDeliveryModalOpen(true)}
                className="mb-3 flex w-full items-center justify-center rounded-full bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 transition shadow-md"
              >
                <ClipboardList className="mr-2 h-5 w-5" />
                作品を納品する
              </button>
            )}

            {availableStatusActions.length === 0 ? (
              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
                実行可能なアクションはありません。
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {availableStatusActions.map(nextStatus => (
                  <button
                    key={nextStatus}
                    onClick={() => handleStatusUpdate(nextStatus)}
                    disabled={!!updatingStatus}
                    className={`flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white transition ${nextStatus === 'CANCELLED'
                      ? 'bg-rose-500 hover:bg-rose-600'
                      : nextStatus === 'COMPLETED'
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {updatingStatus === nextStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {statusLabels[nextStatus]} に更新
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>安全な取引のために、すべてのやり取りはTalent Marche上で行ってください。</span>
            </div>
          </div>

          {feedback && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
              {feedback}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
