
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

interface Service {
    id: string
    title: string
    price: number
    isActive: boolean
    images: string[]
    createdAt: string
    category: {
        id: string
        name: string
    }
    _count: {
        orders: number
        reviews: number
        favorites: number
    }
}

export default function MyServicesPage() {
    const [services, setServices] = useState<Service[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const router = useRouter()

    useEffect(() => {
        fetchServices()
    }, [])

    const fetchServices = async () => {
        try {
            const res = await fetch('/api/services/my')
            if (!res.ok) throw new Error('Failed to fetch services')
            const data = await res.json()
            setServices(data.services)
        } catch (err) {
            console.error(err)
            setError('サービスの取得に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('本当に削除しますか？\n（削除すると元に戻せませんが、データ上は「非公開」として残ります）')) return

        try {
            const res = await fetch(`/api/services/${id}`, {
                method: 'DELETE'
            })
            if (!res.ok) throw new Error('Delete failed')

            // UI update: remove or mark inactive?
            // API DELETE sets isActive=false. 
            // We should probably just refresh or update local state.
            fetchServices()
        } catch (err) {
            alert('削除に失敗しました')
        }
    }

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/services/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus })
            })
            if (!res.ok) throw new Error('Update failed')

            // Optimistic update
            setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: !currentStatus } : s))
        } catch (err) {
            alert('ステータスの更新に失敗しました')
        }
    }

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>

    if (error) return (
        <div className="flex flex-col items-center justify-center py-20 text-red-600">
            <AlertCircle className="w-12 h-12 mb-4" />
            <p>{error}</p>
        </div>
    )

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">出品サービス管理</h1>
                <Link
                    href="/services/create"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    新規出品
                </Link>
            </div>

            {services.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-4">出品中のサービスはありません</p>
                    <Link href="/services/create" className="text-blue-600 hover:underline">
                        初めてのサービスを出品する
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">サービス</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">価格 / カテゴリ</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">実績</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {services.map((service) => (
                                <tr key={service.id} className={!service.isActive ? 'bg-gray-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-16 w-16 flex-shrink-0 relative rounded overflow-hidden bg-gray-200">
                                                {service.images[0] ? (
                                                    <Image
                                                        src={service.images[0]}
                                                        alt={service.title}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-xs text-gray-400">No Image</div>
                                                )}
                                            </div>
                                            <div className="ml-4 max-w-xs">
                                                <div className="text-sm font-medium text-gray-900 truncate" title={service.title}>
                                                    {service.title}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    ID: {service.id}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">¥{service.price.toLocaleString()}</div>
                                        <div className="text-xs text-gray-500">{service.category.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleToggleActive(service.id, service.isActive)}
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${service.isActive
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                }`}
                                        >
                                            {service.isActive ? (
                                                <><Eye className="w-3 h-3 mr-1" /> 公開中</>
                                            ) : (
                                                <><EyeOff className="w-3 h-3 mr-1" /> 非公開</>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div title="注文数">📦 {service._count.orders}</div>
                                        <div title="お気に入り数">❤️ {service._count.favorites}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-3">
                                            <Link href={`/services/${service.id}`} className="text-gray-400 hover:text-gray-600" title="プレビュー">
                                                <Eye className="w-5 h-5" />
                                            </Link>
                                            <Link href={`/services/${service.id}/edit`} className="text-indigo-600 hover:text-indigo-900" title="編集">
                                                <Edit2 className="w-5 h-5" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(service.id)}
                                                className="text-red-600 hover:text-red-900"
                                                title="削除"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
