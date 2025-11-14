'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Loader2, MessageCircle, Send } from 'lucide-react'
import type {
  ConversationMessage,
  ConversationPreview,
  MessageOrderSummary,
  MessageUser,
  MessagesResponse,
  ConversationsResponse,
} from '@/types'

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type OrderOption = {
  id: string
  label: string
  order: MessageOrderSummary
}

export default function ConversationPage() {
  const params = useParams<{ userId: string }>()
  const userIdParam = Array.isArray(params.userId) ? params.userId[0] : params.userId
  const userId = userIdParam || ''

  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialOrderFilter = searchParams.get('orderId') || 'all'

  const [partner, setPartner] = useState<MessageUser | null>(null)
  const partnerRef = useRef<MessageUser | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [messageBody, setMessageBody] = useState('')
  const [orderFilter, setOrderFilter] = useState(initialOrderFilter)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement | null>(null)

  const currentUserId =
    session?.user && typeof session.user === 'object' && 'id' in session.user
      ? (session.user as { id?: string }).id ?? null
      : null

  const relatedOrders: OrderOption[] = useMemo(() => {
    const map = new Map<string, OrderOption>()
    messages.forEach((message) => {
      if (message.order) {
        const { id, service, status } = message.order
        if (!map.has(id)) {
          map.set(id, {
            id,
            label: `${service?.title ?? '取引'}（${status}）`,
            order: message.order,
          })
        }
      }
    })
    return Array.from(map.values())
  }, [messages])

  const visibleMessages = useMemo(() => {
    if (orderFilter === 'all') return messages
    return messages.filter((message) => message.order?.id === orderFilter)
  }, [messages, orderFilter])

  const loadConversation = useCallback(
    async (options: { refreshOnly?: boolean } = {}) => {
      if (!currentUserId || !userId) return

      const abortController = new AbortController()
      const handle = setTimeout(() => abortController.abort(), 20000)

      if (!options.refreshOnly) {
        setLoading(true)
        setError(null)
      }

      try {
        const conversationsPromise = fetch('/api/messages/conversations', {
          signal: abortController.signal,
        })
        const messagesPromise = fetch(`/api/messages?conversationId=${userId}&limit=100`, {
          signal: abortController.signal,
        })

        const [conversationsRes, messagesRes] = await Promise.all([conversationsPromise, messagesPromise])

        if (!messagesRes.ok) {
          const payload = await messagesRes.json().catch(() => ({}))
          throw new Error(payload.error || 'メッセージの取得に失敗しました')
        }

        const messagesPayload = (await messagesRes.json()) as MessagesResponse
        const safeMessages = Array.isArray(messagesPayload.messages) ? messagesPayload.messages : []
        setMessages(safeMessages)
        setNextCursor(messagesPayload.nextCursor ?? null)

        let resolvedPartner: MessageUser | null = partnerRef.current

        if (conversationsRes.ok) {
          const data = (await conversationsRes.json()) as ConversationsResponse
          const target = data.conversations?.find((item: ConversationPreview) => item.userId === userId)
          if (target) {
            resolvedPartner = target.user
          }
        }

        if (!resolvedPartner) {
          const profileRes = await fetch(`/api/users/${userId}`, {
            signal: abortController.signal,
          })
          if (profileRes.ok) {
            resolvedPartner = (await profileRes.json()) as MessageUser
          }
        }

        partnerRef.current = resolvedPartner
        setPartner(resolvedPartner)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message)
          if (!options.refreshOnly) {
            setMessages([])
            setNextCursor(null)
          }
        }
      } finally {
        clearTimeout(handle)
        if (!options.refreshOnly) {
          setLoading(false)
        }
      }
    },
    [currentUserId, userId],
  )

  useEffect(() => {
    if (status === 'loading') return
    if (!currentUserId) {
      router.replace(`/auth/signin?callbackUrl=/messages/${userId}`)
      return
    }

    void loadConversation()
  }, [currentUserId, loadConversation, router, status, userId])

  useEffect(() => {
    if (!currentUserId || !userId) return undefined

    const interval = setInterval(() => {
      void loadConversation({ refreshOnly: true })
    }, 5000)

    return () => clearInterval(interval)
  }, [currentUserId, loadConversation, userId])

  useEffect(() => {
    if (visibleMessages.length === 0) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleMessages.length])

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    setError(null)
    try {
      const query = new URLSearchParams({
        conversationId: userId,
        limit: '100',
        cursor: nextCursor,
      })
      const response = await fetch(`/api/messages?${query.toString()}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || '過去のメッセージの取得に失敗しました')
      }
      const payload = (await response.json()) as MessagesResponse
      const incoming = Array.isArray(payload.messages) ? payload.messages : []
      setMessages((prev) => [...incoming, ...prev])
      setNextCursor(payload.nextCursor ?? null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSendMessage = async () => {
    if (!messageBody.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const payload: Record<string, string> = {
        receiverId: userId,
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

      const data = (await response.json()) as { message: ConversationMessage }
      setMessages((prev) => [...prev, data.message])
      setMessageBody('')
      setNextCursor(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          読み込み中です…
        </div>
      </div>
    )
  }

  if (!currentUserId) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          戻る
        </button>
        <Link
          href="/messages"
          className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
        >
          会話一覧へ
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="flex h-[70vh] flex-col rounded-2xl border border-gray-100 bg-white shadow-sm lg:h-[75vh]">
          <header className="flex items-center gap-4 border-b border-gray-100 px-5 py-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
              {partner ? (
                <Image
                  src={partner.image || '/images/default-avatar.svg'}
                  alt={partner.name || partner.username}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <MessageCircle className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {partner ? partner.name || partner.username : 'ユーザー'}
              </h1>
              <p className="text-xs text-gray-500">
                {partner ? `@${partner.username}` : 'ユーザー情報を取得できませんでした'}
              </p>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {nextCursor && (
              <div className="mb-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-full border border-gray-200 px-4 py-1 text-xs font-semibold text-gray-600 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore ? '読み込み中…' : '以前のメッセージを表示'}
                </button>
              </div>
            )}

            {visibleMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                表示するメッセージがありません
              </div>
            ) : (
              <div className="space-y-4">
                {visibleMessages.map((message) => {
                  const isMine = message.senderId === currentUserId
                  return (
                    <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-md rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          isMine
                            ? 'rounded-br-sm bg-blue-500 text-white'
                            : 'rounded-bl-sm bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <div className="mt-2 flex items-center justify-between text-xs opacity-70">
                          <span>{formatTimestamp(message.createdAt)}</span>
                          {message.order && (
                            <Link
                              href={`/orders/${message.order.id}`}
                              className={`ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                                isMine
                                  ? 'border-white/60 text-white hover:border-white hover:text-white'
                                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
                              }`}
                            >
                              {message.order.service?.title ?? '関連取引'}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <footer className="border-t border-gray-100 px-5 py-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <label htmlFor="orderFilter" className="text-xs font-semibold text-gray-500">
                表示範囲
              </label>
              <select
                id="orderFilter"
                value={orderFilter}
                onChange={(event) => setOrderFilter(event.target.value)}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="all">すべてのメッセージ</option>
                {relatedOrders.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-3">
              <textarea
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                placeholder="メッセージを入力してください"
                rows={3}
                className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={sending || !messageBody.trim()}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          </footer>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">取引リンク</h2>
            {relatedOrders.length === 0 ? (
              <p className="text-xs text-gray-500">関連する取引はまだありません。</p>
            ) : (
              <ul className="space-y-2 text-sm text-gray-700">
                {relatedOrders.map((option) => (
                  <li key={option.id}>
                    <Link
                      href={`/orders/${option.id}`}
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      • {option.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {partner && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">相手のプロフィール</h2>
              <div className="flex items-center gap-3">
                <Image
                  src={partner.image || '/images/default-avatar.svg'}
                  alt={partner.name || partner.username}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {partner.name || partner.username}
                  </p>
                  <p className="text-xs text-gray-500">@{partner.username}</p>
                </div>
              </div>
              <Link
                href={`/users/${partner.id}`}
                className="mt-4 inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:border-blue-400 hover:text-blue-600"
              >
                プロフィールを見る
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
