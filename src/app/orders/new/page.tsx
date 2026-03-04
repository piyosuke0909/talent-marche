'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CreditCard, Shield, Clock } from 'lucide-react'
import type { ServiceDetail } from '@/types'

export const dynamic = 'force-dynamic'

function NewOrderContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('serviceId')

  const [service, setService] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderDetails, setOrderDetails] = useState({
    requirements: '',
    deadline: '',
    budget: 0
  })

  const fetchService = useCallback(async () => {
    if (!serviceId) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/services/${serviceId}`)
      if (response.ok) {
        const data = await response.json() as ServiceDetail
        setService(data)
        setOrderDetails(prev => ({ ...prev, budget: data.price }))
      } else {
        router.push('/services')
      }
    } catch (error) {
      console.error('Failed to fetch service:', error)
      router.push('/services')
    } finally {
      setLoading(false)
    }
  }, [serviceId, router])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!serviceId) {
      router.push('/services')
      return
    }

    fetchService()
  }, [session, status, serviceId, router, fetchService])

  const handleOrder = async () => {
    if (!service || !session) return

    setOrderLoading(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: service.id,
          message: orderDetails.requirements,
          customPrice: orderDetails.budget !== service.price ? orderDetails.budget : null
        }),
      })

      if (response.ok) {
        const result = await response.json()
        // 決済処理へリダイレクト
        router.push(`/orders/${result.order.id}/payment`)
      } else {
        const error = await response.json()
        alert(error.error || '注文の作成に失敗しました')
      }
    } catch (error) {
      console.error('Failed to create order:', error)
      alert('注文の作成に失敗しました')
    } finally {
      setOrderLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">サービスが見つかりませんでした</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Link href={`/services/${service.id}`} className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
            <ArrowLeft className="w-5 h-5 mr-1" />
            戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">注文の詳細</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* サービス情報 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">サービス詳細</h2>

            {service.images && service.images.length > 0 && (
              <Image
                src={service.images[0]}
                alt={service.title}
                width={768}
                height={384}
                className="w-full h-48 rounded-lg object-cover mb-4"
              />
            )}

            <h3 className="font-semibold text-lg mb-2">{service.title}</h3>
            <p className="text-gray-600 mb-4">{service.description}</p>

            <div className="flex items-center mb-4">
              <Image
                src={service.user.image || '/images/default-avatar.svg'}
                alt={service.user.name || service.user.username || 'ユーザー'}
                width={40}
                height={40}
                className="mr-3 h-10 w-10 rounded-full object-cover"
              />
              <div>
                <p className="font-medium">{service.user.name || service.user.username}</p>
                <p className="text-sm text-gray-600">@{service.user.username}</p>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-2xl font-bold text-green-600">¥{service.price.toLocaleString()}</p>
                <p className="text-sm text-gray-600 flex items-center mt-1">
                  <Clock className="w-4 h-4 mr-1" />
                  {service.deliveryDays}日で納品
                </p>
              </div>
            </div>
          </div>

          {/* 注文フォーム */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">注文内容</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  要件・詳細 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={orderDetails.requirements}
                  onChange={(e) => setOrderDetails({ ...orderDetails, requirements: e.target.value })}
                  placeholder="プロジェクトの詳細、要件、期待する成果物などを詳しく記載してください"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  希望納期
                </label>
                <input
                  type="date"
                  value={orderDetails.deadline}
                  onChange={(e) => setOrderDetails({ ...orderDetails, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={new Date(Date.now() + service.deliveryDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
                <p className="text-xs text-gray-500 mt-1">
                  最短納期: {new Date(Date.now() + service.deliveryDays * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  予算 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={orderDetails.budget}
                    onChange={(e) => setOrderDetails({ ...orderDetails, budget: Number(e.target.value) })}
                    className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={service.price}
                  />
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">¥</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  最低価格: ¥{service.price.toLocaleString()}
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  安全な取引
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 料金は成果物納品後に支払われます</li>
                  <li>• 24時間サポート対応</li>
                  <li>• 満足保証制度あり</li>
                </ul>
              </div>

              <button
                onClick={handleOrder}
                disabled={orderLoading || !orderDetails.requirements.trim()}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {orderLoading ? (
                  <>処理中...</>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    決済に進む
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                注文確定後、決済ページに進みます。決済完了まで料金は請求されません。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    }>
      <NewOrderContent />
    </Suspense>
  )
}
