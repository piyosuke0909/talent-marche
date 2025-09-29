'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Filter, Loader2, MessageCircle, PackageSearch } from 'lucide-react'

type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'

interface OrderUser {
  id: string
  name: string | null
  username: string
  image: string | null
}

interface OrderListItem {
  id: string
  status: OrderStatus
  totalAmount: number
  message: string | null
  createdAt: string
  service: {
    id: string
    title: string
    price: number
    images: string[]
  } | null
  seller: OrderUser
  buyer: OrderUser
  messages: Array<{
    id: string
    content: string
    isRead: boolean
    createdAt: string
    senderId: string
  }>
}

interface OrdersResponse {
  orders: OrderListItem[]
  totalCount: number
  totalPages: number
  currentPage: number
}

const statusLabels: Record<OrderStatus, string> = {
  PENDING: '保留中',
  IN_PROGRESS: '進行中',
  COMPLETED: '完了',
  CANCELLED: 'キャンセル',
  DISPUTED: '異議あり',
}

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  DISPUTED: 'bg-purple-100 text-purple-700',
}

type OrderTypeFilter = 'all' | 'buyer' | 'seller'

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [orderType, setOrderType] = useState<OrderTypeFilter>('all')
  const [orderStatus, setOrderStatus] = useState<OrderStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id) {
      router.push('/auth/signin?callbackUrl=/orders')
      return
    }
    setLoading(false)
  }, [session, status, router])

  useEffect(() => {
    if (!session?.user?.id) return

    const controller = new AbortController()
    const fetchOrders = async () => {
      setFetching(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          type: orderType === 'all' ? '' : orderType,
          status: orderStatus === 'all' ? '' : orderStatus,
          limit: '10',
        })

        // remove blank params to avoid sending ""
        for (const key of ['type', 'status']) {
          if (!params.get(key)) params.delete(key)
        }

        const response = await fetch(`/api/orders?${params.toString()}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || '注文の取得に失敗しました')
        }

        const data: OrdersResponse = await response.json()
        setOrders(data.orders)
        setTotalPages(data.totalPages || 1)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setOrders([])
        setError((err as Error).message)
      } finally {
        setFetching(false)
      }
    }

    fetchOrders()

    return () => controller.abort()
  }, [session?.user?.id, orderType, orderStatus, page])

  useEffect(() => {
    setPage(1)
  }, [orderType, orderStatus])

  const userId = session?.user?.id

  const heading = useMemo(() => {
    switch (orderType) {
      case 'buyer':
        return '購入した注文'
      case 'seller':
        return '受注した注文'
      default:
        return 'すべての注文'
    }
  }, [orderType])

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center text-gray-600">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 読み込み中...
        </div>
      </div>
    )
  }

  if (!userId) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">注文管理</h1>
          <p className="text-gray-600">進捗や取引相手を一覧で確認しましょう</p>
        </div>
        <Link
          href="/services"
          className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          サービスを探す
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </header>

      <section className="grid gap-4 rounded-xl bg-white p-6 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center text-sm font-semibold text-gray-700">
            <Filter className="mr-2 h-4 w-4" /> 表示切替
          </span>
          {([
            { value: 'all', label: 'すべて' },
            { value: 'buyer', label: '購入' },
            { value: 'seller', label: '販売' },
          ] as const).map(option => (
            <button
              key={option.value}
              onClick={() => setOrderType(option.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                orderType === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED'] as const).map(option => (
            <button
              key={option}
              onClick={() => setOrderStatus(option)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                orderStatus === option
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option === 'all' ? 'すべてのステータス' : statusLabels[option]}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">{heading}</h2>
          <span className="text-sm text-gray-500">{orders.length} 件表示</span>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {fetching && !orders.length ? (
          <div className="flex items-center justify-center rounded-lg bg-white p-8 text-gray-600 shadow">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 更新中...
          </div>
        ) : null}

        {!fetching && orders.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-white p-12 text-center text-gray-500 shadow">
            <PackageSearch className="mb-4 h-10 w-10 text-gray-400" />
            <p className="text-lg font-medium">該当する注文はありません</p>
            <p className="mt-1 text-sm">フィルター条件を変更するか、新しい取引を開始してください。</p>
          </div>
        ) : null}

        <div className="grid gap-4">
          {orders.map(order => {
            const counterparty = order.buyer.id === userId ? order.seller : order.buyer
            const lastMessage = order.messages[0]
            return (
              <article key={order.id} className="rounded-xl bg-white p-6 shadow-md transition hover:shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    {order.service?.images?.[0] ? (
                      <Image
                        src={order.service.images[0]}
                        alt={order.service.title}
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded-lg object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                        <PackageSearch className="h-8 w-8" />
                      </div>
                    )}
                    <div>
                      <Link href={`/orders/${order.id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                        {order.service?.title ?? 'カスタム注文'}
                      </Link>
                      <p className="mt-1 text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString('ja-JP')}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <span className="flex items-center">
                          相手: {counterparty.name || `@${counterparty.username}`}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                          合計 ¥{order.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                    <div className="flex gap-2">
                      <Link
                        href={`/messages/${counterparty.id}?orderId=${order.id}`}
                        className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-600"
                      >
                        <MessageCircle className="mr-1 h-4 w-4" /> メッセージ
                      </Link>
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        詳細を見る
                      </Link>
                    </div>
                  </div>
                </div>

                {lastMessage ? (
                  <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    <p className="mb-1 text-xs text-gray-400">
                      最終メッセージ ({new Date(lastMessage.createdAt).toLocaleString('ja-JP')})
                    </p>
                    <p className="line-clamp-2">{lastMessage.content}</p>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              disabled={page === 1 || fetching}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              前へ
            </button>
            <span className="text-sm text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages || fetching}
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              次へ
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

