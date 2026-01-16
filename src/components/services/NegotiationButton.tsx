'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface NegotiationButtonProps {
    serviceId: string
    currentPrice: number
    sellerId: string // To avoid self-negotiation validation on client too
    currentUserId?: string
}

export default function NegotiationButton({ serviceId, currentPrice, sellerId, currentUserId }: NegotiationButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [offerPrice, setOfferPrice] = useState<number | ''>('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    if (!currentUserId || currentUserId === sellerId) {
        return null
    }

    const handleNegotiate = async () => {
        if (!offerPrice || typeof offerPrice !== 'number') {
            alert('金額を入力してください')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/negotiations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceId, price: offerPrice })
            })

            if (res.ok) {
                alert('値下げ交渉を送信しました。出品者からの回答をお待ちください。')
                setIsOpen(false)
                setOfferPrice('')
            } else {
                const data = await res.json()
                alert(data.error || '交渉の送信に失敗しました')
            }
        } catch (e) {
            console.error(e)
            alert('エラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full mt-2 flex items-center justify-center space-x-2 text-blue-600 border border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 py-2 rounded-md transition-colors"
            >
                <span>値下げ交渉をする</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">値下げ交渉</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                            現在の価格: <span className="font-bold">¥{currentPrice.toLocaleString()}</span>
                            <br />
                            希望する価格を入力してください。出品者が承諾した場合、その価格で購入できます。
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                希望価格 (円)
                            </label>
                            <input
                                type="number"
                                value={offerPrice}
                                onChange={(e) => setOfferPrice(Number(e.target.value))}
                                placeholder="例: 3000"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div className="flex space-x-4">
                            <button
                                onClick={handleNegotiate}
                                disabled={loading}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? '送信中...' : '交渉を送る'}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                disabled={loading}
                                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
