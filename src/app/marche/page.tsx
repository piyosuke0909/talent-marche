'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

function MarchePageContent() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'こんにちは！Talent MarcheのAIアシスタント、Marche（マルシェ）です。サービス探しや出品について、何かお手伝いできることはありますか？'
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setIsLoading(true)

        try {
            const response = await fetch('/api/marche', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    history: messages.map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to fetch response')
            }

            const data = await response.json()
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        } catch (error) {
            console.error('Error:', error)
            const errorMessage = error instanceof Error ? error.message : '申し訳ありません。エラーが発生しました。'
            setMessages(prev => [...prev, { role: 'assistant', content: `エラー: ${errorMessage}` }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-center shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-full">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">Marche AI</h1>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex max-w-[80%] gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-blue-100 dark:bg-blue-900/30'
                                }`}>
                                {message.role === 'user' ? (
                                    <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                ) : (
                                    <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                )}
                            </div>
                            <div className={`p-4 rounded-2xl shadow-sm ${message.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-700'
                                }`}>
                                <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                                    <ReactMarkdown
                                        components={{
                                            a: ({ node, ...props }) => (
                                                <a {...props} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" />
                                            )
                                        }}
                                    >
                                        {message.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="flex max-w-[80%] gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Marcheに質問する..."
                        className="w-full pl-4 pr-12 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-full focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function MarchePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MarchePageContent />
        </Suspense>
    )
}
