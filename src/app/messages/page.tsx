'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { MessageCircle, Plus } from 'lucide-react'
import type { ConversationPreview, ConversationsResponse } from '@/types'

function formatTimestamp(value: string) {
  const date = new Date(value)
  return date.toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function useConversations() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch('/api/messages/conversations')
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || '会話一覧の取得に失敗しました')
      }

      const payload = (await response.json()) as ConversationsResponse
      setConversations(Array.isArray(payload.conversations) ? payload.conversations : [])
    } catch (err) {
      setError((err as Error).message)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.replace('/auth/signin?callbackUrl=/messages')
      return
    }

    setLoading(true)
    void fetchConversations()

    const interval = setInterval(() => {
      void fetchConversations()
    }, 5000)

    return () => clearInterval(interval)
  }, [fetchConversations, router, session, status])

  return useMemo(
    () => ({ conversations, loading, error }),
    [conversations, error, loading],
  )
}

export default function MessagesPage() {
  const router = useRouter()
  const { conversations, loading, error } = useConversations()

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200 animate-pulse" />
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="h-14 w-full rounded-xl bg-gray-100 animate-pulse" />
            <div className="mt-4 h-14 w-full rounded-xl bg-gray-100 animate-pulse" />
            <div className="mt-4 h-14 w-full rounded-xl bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-7 w-7 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">メッセージ</h1>
            <p className="text-sm text-gray-500">取引相手とのやり取りを確認できます</p>
          </div>
        </div>
        <Link
          href="/messages/new"
          className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
        >
          <Plus className="h-4 w-4" />
          新しいメッセージ
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-500">
            <MessageCircle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">まだメッセージはありません</h2>
          <p className="mt-2 text-sm text-gray-500">
            サービスを依頼するか、プロフィールから「メッセージを送る」でやり取りを始めましょう。
          </p>
          <Link
            href="/services"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-blue-500 px-6 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
          >
            サービスを探す
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-sm">
          {conversations.map((conversation) => (
            <button
              key={conversation.userId}
              type="button"
              onClick={() => router.push(`/messages/${conversation.userId}`)}
              className="flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-gray-50"
            >
              <div className="relative h-14 w-14 flex-shrink-0">
                <Image
                  src={conversation.user.image || '/images/default-avatar.svg'}
                  alt={conversation.user.name || conversation.user.username}
                  fill
                  sizes="56px"
                  className="rounded-full object-cover"
                />
                {conversation.unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {conversation.user.name || conversation.user.username}
                  </p>
                  {conversation.lastMessage && (
                    <span className="flex-shrink-0 text-xs text-gray-400">
                      {formatTimestamp(conversation.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-gray-600">
                  {conversation.lastMessage ? conversation.lastMessage.content : 'まだメッセージがありません'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
