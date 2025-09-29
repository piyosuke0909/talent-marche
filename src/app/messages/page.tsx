'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { ConversationPreview, ConversationsResponse } from '@/types'

export default function MessagesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchConversations()
  }, [session, status, router])

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations')
      if (response.ok) {
        const data = await response.json() as ConversationsResponse
        setConversations(Array.isArray(data.conversations) ? data.conversations : [])
      } else {
        setConversations([])
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">読み込み中...</div>
        </div>
    )
  }

  return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">メッセージ</h1>
        
        {conversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-700 mb-2">メッセージがありません</h3>
              <p className="text-gray-500">
                サービスの購入や依頼を通じて、他のユーザーとやり取りを始めましょう。
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {conversations.map((conversation) => (
              <div
                key={conversation.userId}
                className="flex items-center p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/messages/${conversation.userId}`)}
              >
                <div className="mr-4 flex-shrink-0">
                  <Image
                    src={conversation.user.image || '/images/default-avatar.svg'}
                    alt={conversation.user.name || conversation.user.username}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {conversation.user.name || conversation.user.username}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {conversation.lastMessage && new Date(conversation.lastMessage.createdAt).toLocaleDateString('ja-JP', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate max-w-xs">
                      {conversation.lastMessage ? conversation.lastMessage.content : 'まだメッセージがありません'}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-500 rounded-full">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  )
}
