'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

interface MyRequest {
    id: string
    title: string
    description: string
    budget: number | null
    deadline: string | null
    isActive: boolean
    createdAt: string
    location: string | null
    skills: string[]
    category: { id: string; name: string }
    _count: { proposals: number }
}

export default function MyRequestsPage() {
    const [requests, setRequests] = useState<MyRequest[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchRequests()
    }, [])

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/requests/my')
            if (!res.ok) throw new Error('Failed to fetch')
            const data = await res.json()
            setRequests(data.requests)
        } catch {
            setError('依頼の取得に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('本当に削除しますか？\nこの操作は元に戻せません。')) return
        try {
            const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            setRequests(prev => prev.filter(r => r.id !== id))
        } catch {
            alert('削除に失敗しました')
        }
    }

    const handleToggleActive = async (id: string, current: boolean) => {
        try {
            const res = await fetch(`/api/requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !current }),
            })
            if (!res.ok) throw new Error()
            setRequests(prev => prev.map(r => r.id === id ? { ...r, isActive: !current } : r))
        } catch {
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
                <h1 className="text-2xl font-bold">依頼管理</h1>
                <Link
                    href="/requests/create"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    新規依頼
                </Link>
            </div>

            {requests.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-4">投稿した依頼はありません</p>
                    <Link href="/requests/create" className="text-blue-600 hover:underline">
                        最初の依頼を投稿する
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">依頼タイトル</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">予算 / カテゴリ</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">提案数</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">投稿日</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {requests.map((req) => (
                                <tr key={req.id} className={!req.isActive ? 'bg-gray-50' : ''}>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={req.title}>
                                            {req.title}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {req.skills.length > 0 && req.skills.slice(0, 3).join(' · ')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {req.budget ? `¥${req.budget.toLocaleString()}` : '未設定'}
                                        </div>
                                        <div className="text-xs text-gray-500">{req.category.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleToggleActive(req.id, req.isActive)}
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                                                req.isActive
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                            }`}
                                        >
                                            {req.isActive ? (
                                                <><Eye className="w-3 h-3 mr-1" />募集中</>
                                            ) : (
                                                <><EyeOff className="w-3 h-3 mr-1" />クローズ</>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {req._count.proposals}件
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(req.createdAt).toLocaleDateString('ja-JP')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-3">
                                            <Link
                                                href={`/requests/${req.id}`}
                                                className="text-gray-400 hover:text-gray-600"
                                                title="詳細"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </Link>
                                            <Link
                                                href={`/requests/${req.id}/edit`}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                title="編集"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(req.id)}
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
