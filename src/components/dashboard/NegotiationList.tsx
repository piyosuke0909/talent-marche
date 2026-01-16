'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Negotiation {
    id: string
    price: number
    status: string
    createdAt: string
    service: {
        id: string
        title: string
        price: number
        images: string[]
    }
    user: {
        id: string
        name: string | null
        image: string | null
    }
}

export default function NegotiationList({ negotiations }: { negotiations: Negotiation[] }) {
    const [items, setItems] = useState(negotiations)
    const router = useRouter()

    const handleAction = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
        if (!confirm(status === 'ACCEPTED' ? 'この価格で承諾しますか？' : '拒否しますか？')) return

        try {
            const res = await fetch(`/api/negotiations/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            })

            if (res.ok) {
                alert(status === 'ACCEPTED' ? '承諾しました' : '拒否しました')
                // Optimistic update
                setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item))
                router.refresh()
            } else {
                const data = await res.json()
                alert(data.error || 'エラーが発生しました')
            }
        } catch (e) {
            console.error(e)
            alert('通信エラーが発生しました')
        }
    }

    if (items.length === 0) {
        return <div className="p-8 text-center text-gray-500">届いている値下げ交渉はありません</div>
    }

    return (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item) => (
                <div key={item.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start space-x-4">
                        <div className="relative h-16 w-16 flex-shrink-0">
                            <Image
                                src={item.service.images[0] || '/images/placeholder.svg'}
                                alt={item.service.title}
                                fill
                                className="object-cover rounded-md"
                            />
                        </div>
                        <div>
                            <Link href={`/services/${item.service.id}`} className="font-semibold text-blue-600 hover:underline">
                                {item.service.title}
                            </Link>
                            <div className="text-sm text-gray-500 mt-1">
                                希望者: {item.user.name ?? 'Unknown'}
                            </div>
                            <div className="mt-2 flex items-center gap-4">
                                <span className="text-gray-400 line-through text-sm">¥{item.service.price.toLocaleString()}</span>
                                <span className="font-bold text-lg text-red-600">¥{item.price.toLocaleString()}</span>
                                <span className="text-xs text-gray-500">
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {item.status === 'PENDING' ? (
                            <>
                                <button
                                    onClick={() => handleAction(item.id, 'ACCEPTED')}
                                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    承諾
                                </button>
                                <button
                                    onClick={() => handleAction(item.id, 'REJECTED')}
                                    className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    拒否
                                </button>
                            </>
                        ) : (
                            <span className={`px-4 py-2 rounded-full text-sm font-medium ${item.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {item.status === 'ACCEPTED' ? '承諾済み' : '拒否済み'}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
