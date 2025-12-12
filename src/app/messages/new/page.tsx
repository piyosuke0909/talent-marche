'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Loader2, MailPlus, Search, Send, UserPlus, Users } from 'lucide-react'
import type { ConversationPreview, ConversationsResponse, MessageUser } from '@/types'

export const dynamic = 'force-dynamic'

interface UserLookup extends MessageUser {
  bio?: string | null
}

function NewMessageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialUserId = searchParams.get('userId')
  const initialOrderId = searchParams.get('orderId')

  const currentUserId =
    session?.user && typeof session.user === 'object' && 'id' in session.user
      ? (session.user as { id?: string }).id ?? null
      : null

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [recipient, setRecipient] = useState<UserLookup | null>(null)
  const [conversations, setConversations] = useState<ConversationPreview[]>([])

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<UserLookup[]>([])
  const [searching, setSearching] = useState(false)

  const [messageBody, setMessageBody] = useState('')

  const recentContacts = useMemo(
    () => conversations.slice(0, 6).map((conversation) => conversation.user),
    [conversations],
  )

  useEffect(() => {
    if (status === 'loading') return
    if (!currentUserId) {
      router.replace('/auth/signin?callbackUrl=/messages/new')
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [conversationsRes, initialUserRes] = await Promise.all([
          fetch('/api/messages/conversations'),
          initialUserId ? fetch(`/api/users/${initialUserId}`) : Promise.resolve(null),
        ])

        if (conversationsRes.ok) {
          const data = (await conversationsRes.json()) as ConversationsResponse
          setConversations(Array.isArray(data.conversations) ? data.conversations : [])
        }

        if (initialUserRes && initialUserRes.ok) {
          const user = (await initialUserRes.json()) as UserLookup
          setRecipient({
            id: user.id,
            username: user.username,
            name: user.name ?? null,
            image: user.image ?? null,
            bio: user.bio ?? null,
          })
        }
      } catch (err) {
        setError('ページの読み込みに失敗しました')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [currentUserId, initialUserId, router, status])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    const controller = new AbortController()

    const run = async () => {
      setSearching(true)
      setError(null)
      try {
        const query = new URLSearchParams({ q: searchTerm.trim() })
        const response = await fetch(`/api/users/search?${query.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || 'ユーザー検索に失敗しました')
        }
        const data = (await response.json()) as { users: UserLookup[] }
        setSearchResults(Array.isArray(data.users) ? data.users : [])
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message)
        }
      } finally {
        setSearching(false)
      }
    }

    const timer = setTimeout(() => {
      void run()
    }, 300)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [searchTerm])

  const handleSelectRecipient = (user: UserLookup) => {
    setRecipient(user)
    setError(null)
    const params = new URLSearchParams(searchParams.toString())
    params.set('userId', user.id)
    if (initialOrderId) {
      params.set('orderId', initialOrderId)
    }
    router.replace(`/messages/new?${params.toString()}`)
  }

  const handleSend = async () => {
    if (!recipient || !messageBody.trim() || sending) {
      setError('宛先とメッセージを入力してください')
      return
    }

    setSending(true)
    setError(null)
    try {
      const payload: Record<string, string> = {
        receiverId: recipient.id,
        content: messageBody.trim(),
      }
      if (initialOrderId) {
        payload.orderId = initialOrderId
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
      router.push(
        initialOrderId
          ? `/messages/${recipient.id}?orderId=${initialOrderId}`
          : `/messages/${recipient.id}`,
      )
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          戻る
        </button>
        <Link href="/messages" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          メッセージ一覧へ
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <header className="flex items-center gap-3">
            <UserPlus className="h-6 w-6 text-blue-500" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">宛先を選択</h1>
              <p className="text-sm text-gray-500">ユーザーを検索するか、最近のやり取りから選択できます</p>
            </div>
          </header>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ユーザー名・名前で検索"
                className="w-full rounded-full border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            {searchTerm && (
              <div className="mt-4 space-y-2">
                {searching ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    検索中です…
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectRecipient(user)}
                      className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-white px-3 py-2 text-left text-sm text-gray-700 transition hover:border-blue-200 hover:bg-blue-50"
                    >
                      <Image
                        src={user.image || '/images/default-avatar.svg'}
                        alt={user.name || user.username}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{user.name || user.username}</p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                        {user.bio && (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500">{user.bio}</p>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">該当するユーザーが見つかりませんでした。</p>
                )}
              </div>
            )}
          </div>

          {recipient ? (
            <div className="flex items-center gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <Image
                src={recipient.image || '/images/default-avatar.svg'}
                alt={recipient.name || recipient.username}
                width={56}
                height={56}
                className="h-14 w-14 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="text-base font-semibold text-gray-900">
                  {recipient.name || recipient.username}
                </p>
                <p className="text-sm text-gray-500">@{recipient.username}</p>
                {recipient.bio && (
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{recipient.bio}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setRecipient(null)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                変更
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
              宛先を選択すると、ここに表示されます。
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 p-4">
            <textarea
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              rows={5}
              placeholder="はじめまして。取引したい内容や質問があればこちらに入力してください。"
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !recipient || !messageBody.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                送信する
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-900">最近やり取りした相手</h2>
            </div>
            {recentContacts.length === 0 ? (
              <p className="text-xs text-gray-500">最近のメッセージ履歴はありません。</p>
            ) : (
              <ul className="space-y-3">
                {recentContacts.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectRecipient({
                          id: user.id,
                          username: user.username,
                          name: user.name ?? null,
                          image: user.image ?? null,
                          bio: user.bio ?? null,
                        })
                      }
                      className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-sm text-gray-700 transition hover:border-blue-200 hover:bg-blue-50"
                    >
                      <Image
                        src={user.image || '/images/default-avatar.svg'}
                        alt={user.name || user.username}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{user.name || user.username}</p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-xs text-gray-500">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">メッセージ送信のヒント</h2>
            <ul className="space-y-2 leading-relaxed">
              <li>・最初のメッセージでは、依頼内容や目的をできるだけ具体的に伝えましょう。</li>
              <li>・予算や納期が決まっている場合は合わせて共有するとスムーズです。</li>
              <li>・個人情報や機密情報の取り扱いには十分ご注意ください。</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function NewMessagePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          読み込み中です…
        </div>
      </div>
    }>
      <NewMessageContent />
    </Suspense>
  )
}
