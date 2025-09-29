'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Paperclip,
  Reply,
  Send,
  ShieldAlert,
  UserCircle,
} from 'lucide-react'
import type {
  ConversationMessage,
  ConversationPreview,
  MessageUser,
  MessagesResponse,
  ConversationsResponse,
  OrderStatus,
} from '@/types'

const statusLabels: Record<OrderStatus, string> = {
  PENDING: '保留中',
  IN_PROGRESS: '進行中',
  COMPLETED: '完了',
  CANCELLED: 'キャンセル',
  DISPUTED: '異議あり',
}

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'text-amber-600',
  IN_PROGRESS: 'text-blue-600',
  COMPLETED: 'text-emerald-600',
  CANCELLED: 'text-rose-600',
  DISPUTED: 'text-purple-600',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ConversationPage({ params }: { params: { userId: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialOrderId = searchParams.get('orderId')

  const [partner, setPartner] = useState<MessageUser | null>(null)
  const [allMessages, setAllMessages] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messageBody, setMessageBody] = useState('')
  const [orderFilter, setOrderFilter] = useState<string>(initialOrderId || 'all')

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const loadConversation = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryRes, messagesRes] = await Promise.all([
        fetch('/api/messages/conversations'),
        fetch(`/api/messages?conversationId=${params.userId}&limit=200`),
      ])

      if (!messagesRes.ok) {
        const payload = await messagesRes.json().catch(() => ({}))
        throw new Error(payload.error || 'メッセージの取得に失敗しました')
      }

      const messagesPayload = await messagesRes.json() as MessagesResponse
      setAllMessages(Array.isArray(messagesPayload.messages) ? messagesPayload.messages : [])

      let resolvedPartner: MessageUser | null = null
      if (summaryRes.ok) {
        const summary = await summaryRes.json() as ConversationsResponse
        const target = summary.conversations?.find((conv: ConversationPreview) => conv.userId === params.userId)
        if (target) {
          resolvedPartner = target.user
        }
      }

      if (!resolvedPartner) {
        const userRes = await fetch(`/api/users/${params.userId}`)
        if (userRes.ok) {
          resolvedPartner = await userRes.json()
        }
      }

      if (resolvedPartner) {
        setPartner(resolvedPartner)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [params.userId])

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) {
      router.push(`/auth/signin?callbackUrl=/messages/${params.userId}`)
      return
    }
    loadConversation()
  }, [status, session?.user?.id, params.userId, router, loadConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages.length])

  const visibleMessages = useMemo(() => {
    if (orderFilter === 'all') return allMessages
    return allMessages.filter(msg => msg.order?.id === orderFilter)
  }, [allMessages, orderFilter])

  const relatedOrders = useMemo(() => {
    const map = new Map<string, { id: string; status: OrderStatus; title: string }>()
    allMessages.forEach(message => {
      if (message.order) {
        const key = message.order.id
        if (!map.has(key)) {
          map.set(key, {
            id: message.order.id,
            status: message.order.status,
            title: message.order.service?.title || 'カスタム注文',
          })
        }
      }
    })

    if (initialOrderId && !map.has(initialOrderId)) {
      map.set(initialOrderId, {
        id: initialOrderId,
        status: 'PENDING',
        title: '関連する注文',
      } as { id: string; status: OrderStatus; title: string })
    }

    return Array.from(map.values())
  }, [allMessages, initialOrderId])

  const handleSendMessage = async () => {
    if (!messageBody.trim()) return
    setSending(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        receiverId: params.userId,
        content: messageBody.trim(),
      }
      if (orderFilter !== 'all') {
        payload.orderId = orderFilter
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'メッセージの送信に失敗しました')
      }

      setMessageBody('')
      await loadConversation()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center text-gray-600">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 読み込み中...
        </div>
      </div>
    )
  }

  if (!session?.user?.id) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-full border border-gray-200 p-2 text-gray-600 hover:border-blue-400 hover:text-blue-600"
            aria-label="前のページに戻る"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-4">
            <Image
              src={partner?.image || '/images/default-avatar.svg'}
              alt={partner?.name || partner?.username || 'ユーザー'}
              width={56}
              height={56}
              className="h-14 w-14 rounded-full object-cover"
            />
            <div>
              <p className="text-lg font-semibold text-gray-900">{partner?.name || '未設定'}</p>
              <p className="text-sm text-gray-500">@{partner?.username || 'unknown'}</p>
            </div>
          </div>
        </div>
        <Link
          href={`/profile?user=${partner?.id || params.userId}`}
          className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <UserCircle className="mr-2 h-4 w-4" /> プロフィールを見る
        </Link>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
        <section className="flex h-[70vh] flex-col rounded-2xl bg-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MessageCircle className="h-4 w-4" /> メッセージ履歴
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Paperclip className="h-4 w-4" /> 添付ファイルには現在対応していません
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            {visibleMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
                <Reply className="mb-3 h-10 w-10 text-gray-300" />
                <p className="font-medium">まだメッセージがありません</p>
                <p className="mt-1 text-sm">最初のメッセージを送信してコミュニケーションを始めましょう。</p>
              </div>
            ) : (
              visibleMessages.map(message => {
                const isMine = message.senderId === session.user.id
                return (
                  <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xl rounded-2xl px-4 py-3 text-sm shadow ${
                        isMine
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {message.order && (
                        <Link
                          href={`/orders/${message.order.id}`}
                          className={`mb-2 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold ${
                            isMine ? 'text-white' : 'text-gray-600'
                          }`}
                        >
                          注文 #{message.order.id.slice(-6)} ・ {message.order.service?.title || 'カスタム'}
                        </Link>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      <p className={`mt-2 text-right text-[11px] ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatDateTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-100 p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <ShieldAlert className="h-4 w-4" />
              <span>個人情報や決済情報はメッセージで共有しないでください。</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                placeholder="メッセージを入力"
                rows={2}
                className="h-24 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !messageBody.trim()}
                className="flex h-12 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}送信
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">関連する注文</h2>
            <p className="mt-1 text-sm text-gray-500">絞り込みたい注文を選択できます。</p>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => setOrderFilter('all')}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                  orderFilter === 'all'
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-blue-200 hover:text-blue-600'
                }`}
              >
                すべてのメッセージ
              </button>
              {relatedOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => setOrderFilter(order.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    orderFilter === order.id
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-blue-200 hover:text-blue-600'
                  }`}
                >
                  <p className="font-semibold">注文 #{order.id.slice(-6)}</p>
                  <p className="text-xs text-gray-500">{order.title}</p>
                  <span className={`text-xs font-semibold ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
                </button>
              ))}
            </div>
          </div>

          {partner?.bio && (
            <div className="rounded-2xl bg-white p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900">自己紹介</h3>
              <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{partner.bio}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
