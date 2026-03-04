
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle, Ban, CheckCircle, Search, Shield, ShieldAlert, User } from 'lucide-react'
import Image from 'next/image'

interface UserData {
    id: string
    name: string | null
    email: string
    username: string
    image: string | null
    role: string
    isVerified: boolean
    identityVerified: boolean
    isBanned: boolean
    createdAt: string
    _count: {
        services: number
        orders: number
    }
}

function AdminUsersContent() {
    const [users, setUsers] = useState<UserData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [totalPages, setTotalPages] = useState(1)
    const searchParams = useSearchParams()
    const router = useRouter()

    const page = parseInt(searchParams?.get('page') || '1')
    const query = searchParams?.get('q') || ''

    useEffect(() => {
        fetchUsers()
    }, [page, query])

    const fetchUsers = async () => {
        setIsLoading(true)
        setError('')
        try {
            const params = new URLSearchParams()
            if (page) params.set('page', page.toString())
            if (query) params.set('q', query)

            const res = await fetch(`/api/admin/users?${params.toString()}`)
            if (res.status === 403 || res.status === 401) {
                setError('管理者権限がありません')
                setIsLoading(false)
                return
            }
            if (!res.ok) throw new Error('Failed to fetch users')

            const data = await res.json()
            setUsers(data.users)
            setTotalPages(data.pages)
        } catch (err) {
            console.error(err)
            setError('データの取得に失敗しました')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const q = formData.get('q') as string
        router.push(`/admin/users?q=${encodeURIComponent(q)}`)
    }

    const handleAction = async (userId: string, action: 'ban' | 'unban' | 'verify' | 'unverify') => {
        const confirmMsg = {
            ban: 'このユーザーを停止(BAN)しますか？',
            unban: 'このユーザーの停止を解除しますか？',
            verify: 'このユーザーの本人確認を承認しますか？',
            unverify: 'このユーザーの本人確認を取り消しますか？'
        }

        if (!confirm(confirmMsg[action])) return

        try {
            const body = {
                isBanned: action === 'ban' ? true : action === 'unban' ? false : undefined,
                identityVerified: action === 'verify' ? true : action === 'unverify' ? false : undefined
            }

            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (!res.ok) throw new Error('Action failed')

            // Refresh
            fetchUsers()
        } catch (err) {
            alert('操作に失敗しました')
        }
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen text-red-600 gap-2">
                <AlertCircle className="w-6 h-6" />
                {error}
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Shield className="w-8 h-8 text-indigo-600" />
                ユーザー管理
            </h1>

            {/* Search */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            name="q"
                            defaultValue={query}
                            placeholder="ユーザー名、メールアドレス、IDで検索"
                            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                        検索
                    </button>
                </form>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ユーザー</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">実績</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">登録日</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id} className={user.isBanned ? 'bg-red-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0">
                                                {user.image ? (
                                                    <Image src={user.image} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                        <User className="h-6 w-6 text-gray-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                                    {user.username}
                                                    {user.role === 'ADMIN' && <span className="text-xs bg-purple-100 text-purple-800 px-1 rounded">ADMIN</span>}
                                                </div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                                <div className="text-xs text-gray-400">ID: {user.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            {user.isBanned ? (
                                                <span className="inline-flex items-center text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full w-fit">
                                                    <ShieldAlert className="w-3 h-3 mr-1" /> 停止中
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full w-fit">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> 有効
                                                </span>
                                            )}
                                            {user.identityVerified ? (
                                                <span className="inline-flex items-center text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full w-fit">
                                                    本人確認済
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full w-fit">
                                                    未確認
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>出品: {user._count.services}</div>
                                        <div>注文: {user._count.orders}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            {user.isBanned ? (
                                                <button onClick={() => handleAction(user.id, 'unban')} className="text-green-600 hover:text-green-900 text-xs border border-green-200 px-2 py-1 rounded">解除</button>
                                            ) : (
                                                <button onClick={() => handleAction(user.id, 'ban')} className="text-red-600 hover:text-red-900 text-xs border border-red-200 px-2 py-1 rounded">BAN</button>
                                            )}

                                            {user.identityVerified ? (
                                                <span className="inline-flex items-center text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full w-fit">本人確認済</span>
                                            ) : (
                                                <Link href="/admin/identity-verification" className="inline-flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full w-fit hover:bg-gray-200">
                                                    未確認 → 審査へ
                                                </Link>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            <div className="mt-4 flex justify-center gap-2">
                <button
                    disabled={page <= 1}
                    onClick={() => router.push(`/admin/users?page=${page - 1}&q=${query}`)}
                    className="px-4 py-2 border rounded disabled:opacity-50"
                >
                    前へ
                </button>
                <span className="px-4 py-2">Page {page} of {totalPages}</span>
                <button
                    disabled={page >= totalPages}
                    onClick={() => router.push(`/admin/users?page=${page + 1}&q=${query}`)}
                    className="px-4 py-2 border rounded disabled:opacity-50"
                >
                    次へ
                </button>
            </div>
        </div>
    )
}

export default function AdminUsersPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AdminUsersContent />
        </Suspense>
    )
}
