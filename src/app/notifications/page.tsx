'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import DeleteSweep from '@mui/icons-material/DeleteSweep'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined'
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined'
import ErrorOutlined from '@mui/icons-material/ErrorOutlined'
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined'
import MessageOutlined from '@mui/icons-material/MessageOutlined'

interface NotificationItem {
  id: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
  type: string
}

const typeConfig: Record<string, { Icon: React.ComponentType<{ sx?: object }>, color: string, bg: string }> = {
  INFO:    { Icon: InfoOutlined,          color: '#3b82f6', bg: 'bg-blue-50' },
  SUCCESS: { Icon: CheckCircleOutlined,   color: '#10b981', bg: 'bg-emerald-50' },
  WARNING: { Icon: WarningAmberOutlined,  color: '#f59e0b', bg: 'bg-amber-50' },
  ERROR:   { Icon: ErrorOutlined,         color: '#ef4444', bg: 'bg-red-50' },
  ORDER:   { Icon: ShoppingBagOutlined,   color: '#8b5cf6', bg: 'bg-violet-50' },
  MESSAGE: { Icon: MessageOutlined,       color: '#06b6d4', bg: 'bg-cyan-50' },
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?history=1')
      if (res.status === 401) {
        router.push('/auth/signin')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      })
      setNotifications(prev =>
        prev.map(item => item.id === n.id ? { ...item, isRead: true } : item)
      )
    }
    if (n.link) router.push(n.link)
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm('すべてのお知らせを削除しますか？この操作は取り消せません。')) return
    setDeletingAll(true)
    try {
      const res = await fetch('/api/notifications', { method: 'DELETE' })
      if (res.ok) {
        setNotifications([])
      }
    } finally {
      setDeletingAll(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12 text-center text-gray-500">
        読み込み中...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NotificationsOutlined sx={{ fontSize: 28, color: '#374151' }} />
            <h1 className="text-xl font-bold text-gray-900">お知らせ履歴</h1>
            <span className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
              {notifications.length}件
            </span>
          </div>
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <DeleteSweep sx={{ fontSize: 18 }} />
              すべて削除
            </button>
          )}
        </div>

        {/* List */}
        {notifications.length === 0 ? (
          <div className="rounded-2xl bg-white p-16 text-center shadow-sm border border-gray-100">
            <NotificationsOutlined sx={{ fontSize: 48, color: '#d1d5db', display: 'block', margin: '0 auto 12px' }} />
            <p className="text-gray-500">お知らせはありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const cfg = typeConfig[n.type] ?? typeConfig.INFO
              const Icon = cfg.Icon

              return (
                <div
                  key={n.id}
                  className={`group flex items-start gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all ${
                    n.isRead ? 'border-gray-100 opacity-70' : 'border-blue-100'
                  }`}
                >
                  {/* Type icon */}
                  <div className={`mt-0.5 flex-shrink-0 rounded-full p-2 ${cfg.bg}`}>
                    <Icon sx={{ fontSize: 20, color: cfg.color }} />
                  </div>

                  {/* Content */}
                  <button
                    className="flex-1 text-left"
                    onClick={() => handleClick(n)}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">{n.message}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(n.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(n.id)}
                    disabled={deleting === n.id}
                    className="flex-shrink-0 rounded-full p-1.5 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
                    title="削除"
                  >
                    <DeleteOutlined sx={{ fontSize: 18 }} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
