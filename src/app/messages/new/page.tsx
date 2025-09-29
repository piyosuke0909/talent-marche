'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import { Button } from '@/components/ui/Button'
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  MailPlus,
  MessageCircle,
  Send,
  UserPlus,
} from 'lucide-react'
import type {
  ConversationPreview,
  ConversationsResponse,
  MessageUser,
} from '@/types'

interface UserResponse extends MessageUser {
  bio?: string | null
  location?: string | null
  website?: string | null
  isVerified?: boolean
}

export default function NewMessagePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialUserId = searchParams.get('userId')
  const initialOrderId = searchParams.get('orderId')

  const [recipient, setRecipient] = useState<MessageUser | null>(null)
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [messageBody, setMessageBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagePlaceholder = 'はじめまして！\n取引したい内容や質問があればここに入力してください。'

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) {
      router.push('/auth/signin?callbackUrl=/messages/new')
      return
    }

    const loadPage = async () => {
      try {
        setLoading(true)
        const convPromise = fetch('/api/messages/conversations')
        const userPromise = initialUserId ? fetch('/api/users/' + initialUserId) : Promise.resolve(null)
        const [convRes, userRes] = await Promise.all([convPromise, userPromise])

        if (convRes.ok) {
          const convData = await convRes.json() as ConversationsResponse
          setConversations(Array.isArray(convData.conversations) ? convData.conversations : [])
        } else {
          setConversations([])
        }

        if (userRes && userRes.ok) {
          const userData = await userRes.json() as UserResponse
          setRecipient({
            id: userData.id,
            username: userData.username,
            name: userData.name ?? null,
            image: userData.image ?? null,
            bio: userData.bio ?? null,
          })
        }
      } catch (err) {
        console.error('Failed to prepare new message page:', err)
        setError('ページの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [session?.user?.id, status, initialUserId, router])

  const recentContacts = useMemo(() => conversations.slice(0, 6), [conversations])

  const handleSelectRecipient = (user: MessageUser) => {
    setRecipient(user)
    setError(null)
    const params = new URLSearchParams(searchParams.toString())
    params.set('userId', user.id)
    if (initialOrderId) {
      params.set('orderId', initialOrderId)
    }
    router.replace('/messages/new?' + params.toString())
  }

  const handleSendMessage = async () => {
    if (!recipient || !messageBody.trim()) {
      setError('メッセージ内容を入力してください')
      return
    }

    setSending(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
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
      const nextUrl = initialOrderId
        ? '/messages/' + recipient.id + '?orderId=' + initialOrderId
        : '/messages/' + recipient.id
      router.push(nextUrl)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='flex items-center justify-center text-gray-600'>
          <Loader2 className='mr-2 h-5 w-5 animate-spin' /> 読み込み中...
        </div>
      </div>
    )
  }

  if (!session?.user?.id) {
    return null
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-6 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Button variant='ghost' className='flex items-center gap-2' onClick={() => router.back()}>
            <ArrowLeft className='h-4 w-4' /> 戻る
          </Button>
          <h1 className='text-2xl font-bold text-gray-900 flex items-center gap-2'>
            <MailPlus className='h-6 w-6 text-blue-500' /> 新しいメッセージ
          </h1>
        </div>
        <Link href='/messages' className='text-sm text-blue-600 hover:text-blue-700'>
          メッセージ一覧を見る
        </Link>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='lg:col-span-2 space-y-6'>
          <section className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
            <div className='flex items-center gap-3 mb-4'>
              <UserPlus className='h-5 w-5 text-blue-500' />
              <h2 className='text-lg font-semibold text-gray-900'>宛先</h2>
            </div>

            {recipient ? (
              <div className='flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4'>
                <Image
                  src={recipient.image || '/images/default-avatar.svg'}
                  alt={recipient.name || recipient.username}
                  width={56}
                  height={56}
                  className='h-14 w-14 rounded-full object-cover'
                />
                <div className='flex-1'>
                  <p className='text-base font-semibold text-gray-900'>
                    {recipient.name || recipient.username}
                  </p>
                  <p className='text-sm text-gray-500'>@{recipient.username}</p>
                  {recipient.bio && (
                    <p className='mt-1 text-sm text-gray-600 line-clamp-2'>{recipient.bio}</p>
                  )}
                </div>
                <button
                  className='text-sm text-blue-600 hover:text-blue-700'
                  onClick={() => setRecipient(null)}
                >
                  変更する
                </button>
              </div>
            ) : (
              <div className='rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500'>
                宛先を選択してください。サービス詳細ページから「質問する」を押すと自動入力されます。
              </div>
            )}
          </section>

          <section className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
            <div className='flex items-center gap-3 mb-4'>
              <MessageCircle className='h-5 w-5 text-blue-500' />
              <h2 className='text-lg font-semibold text-gray-900'>メッセージ内容</h2>
            </div>

            <textarea
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              placeholder={messagePlaceholder}
              rows={8}
              className='w-full rounded-xl border border-gray-200 p-4 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100'
              disabled={!recipient || sending}
            />

            {initialOrderId && (
              <p className='mt-3 text-xs text-gray-500'>
                このメッセージは注文ID <span className='font-semibold text-gray-700'>{initialOrderId}</span> に紐づきます。
              </p>
            )}

            {error && (
              <div className='mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600'>
                <AlertCircle className='h-4 w-4' />
                {error}
              </div>
            )}

            <div className='mt-6 flex items-center justify-end gap-3'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setMessageBody('')}
                disabled={sending || !messageBody}
              >
                クリア
              </Button>
              <Button
                type='button'
                onClick={handleSendMessage}
                disabled={sending || !recipient || !messageBody.trim()}
                className='flex items-center gap-2'
              >
                {sending ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Send className='h-4 w-4' />
                )}
                メッセージを送信
              </Button>
            </div>
          </section>
        </div>

        <aside className='space-y-6'>
          <section className='rounded-2xl border border-gray-100 bg-white p-6'>
            <h3 className='mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500'>
              最近やり取りしたユーザー
            </h3>
            {recentContacts.length === 0 ? (
              <p className='text-sm text-gray-500'>
                まだメッセージの履歴がありません。サービスを購入・出品してみましょう。
              </p>
            ) : (
              <ul className='space-y-3'>
                {recentContacts.map((contact) => (
                  <li key={contact.userId}>
                    <button
                      className={clsx(
                        'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition',
                        recipient?.id === contact.userId
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50',
                      )}
                      onClick={() => handleSelectRecipient(contact.user)}
                    >
                      <Image
                        src={contact.user.image || '/images/default-avatar.svg'}
                        alt={contact.user.name || contact.user.username}
                        width={40}
                        height={40}
                        className='h-10 w-10 rounded-full object-cover'
                      />
                      <div>
                        <p className='text-sm font-medium text-gray-900'>
                          {contact.user.name || contact.user.username}
                        </p>
                        <p className='text-xs text-gray-500'>@{contact.user.username}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className='rounded-2xl border border-gray-100 bg-white p-6'>
            <h3 className='mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500'>
              メッセージ利用のコツ
            </h3>
            <ul className='space-y-2 text-sm text-gray-600'>
              <li>• 取引に関する詳細はできるだけ具体的に伝えましょう。</li>
              <li>• 急ぎの場合は希望の納期を添えて連絡するとスムーズです。</li>
              <li>• 連絡先の交換は規約に沿って安全に行いましょう。</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
