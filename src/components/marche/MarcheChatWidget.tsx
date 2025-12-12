'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, X, MessageCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { usePathname } from 'next/navigation'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export default function MarcheChatWidget() {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'こんにちは！Marche（マルシェ）です。何かお探しですか？'
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
        }
    }, [messages, isOpen])

    // Don't show widget on the dedicated chat page
    if (pathname === '/marche') return null

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
            const errorMessage = error instanceof Error ? error.message : 'エラーが発生しました。'
            setMessages(prev => [...prev, { role: 'assistant', content: `エラー: ${errorMessage}` }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 md:w-96 h-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                    {/* Header */}
                    <div className="bg-sky-400 p-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            <span className="font-bold">Marche AI</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-white/20 p-1 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex max-w-[85%] gap-2 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${message.role === 'user' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-blue-100 dark:bg-blue-900/30'
                                        }`}>
                                        {message.role === 'user' ? (
                                            <User className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                                        ) : (
                                            <Bot className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                        )}
                                    </div>
                                    <div className={`p-3 rounded-2xl shadow-sm text-sm ${message.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-700'
                                        }`}>
                                        <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed">
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
                                <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 dark:border-gray-700 ml-8">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        <form onSubmit={handleSubmit} className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="質問を入力..."
                                className="w-full pl-4 pr-10 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-full text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                <Send className="w-3 h-3" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${isOpen
                    ? 'bg-gray-600 text-white rotate-90'
                    : 'bg-sky-400 hover:bg-sky-500 text-white'
                    }`}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </button>
        </div>
    )
}
