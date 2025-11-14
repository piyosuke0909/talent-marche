'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CreditCard, Shield, Lock } from 'lucide-react'
import type { ServiceDetail } from '@/types'

type CardDetails = {
  name: string
  number: string
  expiry: string
  cvc: string
}

export default function CheckoutPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('serviceId')

  const [service, setService] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [requirements, setRequirements] = useState('')
  const [budget, setBudget] = useState<number | ''>('')
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    name: '',
    number: '',
    expiry: '',
    cvc: '',
  })

  const fetchService = useCallback(async () => {
    if (!serviceId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/services/${serviceId}`)
      if (response.ok) {
        const data = (await response.json()) as ServiceDetail
        setService(data)
        setBudget(data.price)
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
  }, [fetchService, router, serviceId, session, status])

  const isCardValid = () => {
    return (
      cardDetails.name.trim().length >= 2 &&
      /^\d{12,19}$/.test(cardDetails.number.replace(/\s+/g, '')) &&
      /^\d{2}\/\d{2}$/.test(cardDetails.expiry) &&
      /^\d{3,4}$/.test(cardDetails.cvc)
    )
  }

  const handleCheckout = async () => {
    if (!service || !session) return

    if (!requirements.trim()) {
      setErrorMessage('要件を入力してください')
      return
    }

    if (typeof budget !== 'number' || budget < service.price) {
      setErrorMessage('予算は最低価格以上で入力してください')
      return
    }

    if (!isCardValid()) {
      setErrorMessage('クレジットカード情報が正しくありません')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          message: requirements,
          customPrice: budget !== service.price ? budget : null,
        }),
      })

      if (!orderResponse.ok) {
        const error = await orderResponse.json().catch(() => ({}))
        throw new Error(error.error || '注文の作成に失敗しました')
      }

      const orderPayload = await orderResponse.json() as { order: { id: string } }
      const paymentResponse = await fetch(`/api/orders/${orderPayload.order.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'credit' }),
      })

      if (!paymentResponse.ok) {
        const error = await paymentResponse.json().catch(() => ({}))
        throw new Error(error.error || '決済に失敗しました')
      }

      router.push(`/orders/${orderPayload.order.id}?payment=success`)
    } catch (error) {
      setErrorMessage((error as Error).message)
    } finally {
      setSubmitting(false)
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
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center">
          <Link href={`/services/${service.id}`} className="mr-4 flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-1 h-5 w-5" />
            サービス詳細に戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">購入手続き</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">依頼内容</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  要件・詳細 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={6}
                  maxLength={2000}
                  placeholder="プロジェクトの背景、期待する成果物、参考URLなどを記載してください"
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">希望予算 (¥)</label>
                <input
                  type="number"
                  min={service.price}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">最低価格: ¥{service.price.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow">
              <div className="mb-4 flex items-center">
                <Image
                  src={service.images[0] || '/images/default-avatar.png'}
                  alt={service.title}
                  width={80}
                  height={80}
                  className="mr-4 h-20 w-20 rounded-lg object-cover"
                />
                <div>
                  <p className="text-sm text-gray-500">購入サービス</p>
                  <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
                  <p className="text-sm text-gray-500">納期: {service.deliveryDays}日</p>
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">基本価格</span>
                  <span className="text-lg font-semibold text-gray-900">¥{service.price.toLocaleString()}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                  <span>決済方法</span>
                  <span>クレジットカード</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">クレジットカード情報</h2>
                <Lock className="h-4 w-4 text-gray-400" />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">カード名義人</label>
                  <input
                    type="text"
                    value={cardDetails.name}
                    onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                    placeholder="TARO YAMADA"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">カード番号</label>
                  <input
                    type="text"
                    value={cardDetails.number}
                    onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value.replace(/[^\d]/g, '') })}
                    maxLength={19}
                    placeholder="4242 4242 4242 4242"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-gray-700">有効期限 (MM/YY)</label>
                    <input
                      type="text"
                      value={cardDetails.expiry}
                      onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                      placeholder="12/29"
                      maxLength={5}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-32">
                    <label className="mb-1 block text-sm font-medium text-gray-700">CVC</label>
                    <input
                      type="text"
                      value={cardDetails.cvc}
                      onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value.replace(/[^\d]/g, '') })}
                      maxLength={4}
                      placeholder="123"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <p className="mt-4 flex items-center text-xs text-gray-500">
                <Shield className="mr-1 h-4 w-4" />
                決済情報は安全に暗号化され、当社では保存されません。
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow">
              {errorMessage && (
                <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                  {errorMessage}
                </div>
              )}
              <button
                onClick={handleCheckout}
                disabled={submitting}
                className="flex w-full items-center justify-center rounded-full bg-green-600 px-6 py-3 text-white shadow hover:bg-green-700 disabled:bg-gray-400"
              >
                {submitting ? '処理中...' : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    クレジットカードで支払う
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-xs text-gray-500">
                決済は SSL で保護されています。利用規約とプライバシーに同意のうえでご購入ください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
