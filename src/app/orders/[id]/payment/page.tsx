'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CreditCard, Shield, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface Order {
  id: string
  totalAmount: number
  status: string
  createdAt: string
  deadline: string
  message: string | null
  service: {
    id: string
    title: string
    price: number
    deliveryDays: number
    images: string[]
  }
  seller: {
    id: string
    username: string
    name: string
    image: string | null
  }
  buyer: {
    id: string
    username: string
    name: string
    image: string | null
  }
}

export default function PaymentPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'bank' | 'paypal'>('credit')

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
        
        // 既に支払い済みまたは完了している場合はリダイレクト
        if (data.status !== 'PENDING') {
          router.push(`/orders/${orderId}`)
        }
      } else {
        router.push('/orders')
      }
    } catch (error) {
      console.error('Failed to fetch order:', error)
      router.push('/orders')
    } finally {
      setLoading(false)
    }
  }, [orderId, router])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (!orderId) {
      router.push('/orders')
      return
    }

    fetchOrder()
  }, [session, status, orderId, router, fetchOrder])

  const handlePayment = async () => {
    if (!order || !session) return

    setPaymentLoading(true)
    try {
      // 決済処理のシミュレーション
      const response = await fetch(`/api/orders/${orderId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethod: paymentMethod,
          amount: order.totalAmount
        }),
      })

      if (response.ok) {
        await response.json()

        // 決済成功後、注文詳細ページにリダイレクト
        router.push(`/orders/${orderId}?payment=success`)
      } else {
        const error = await response.json()
        alert(error.message || '決済に失敗しました')
      }
    } catch (error) {
      console.error('Payment failed:', error)
      alert('決済処理でエラーが発生しました')
    } finally {
      setPaymentLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">注文が見つかりませんでした</div>
      </div>
    )
  }

  const serviceFee = Math.round(order.totalAmount * 0.05) // 5%の手数料
  const totalWithFee = order.totalAmount + serviceFee

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Link href={`/orders/${orderId}`} className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
            <ArrowLeft className="w-5 h-5 mr-1" />
            戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">決済</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 注文詳細 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">注文内容</h2>
            
            {order.service.images && order.service.images.length > 0 && (
              <Image
                src={order.service.images[0]}
                alt={order.service.title}
                width={512}
                height={256}
                className="w-full h-32 object-cover rounded-lg mb-4"
                unoptimized
              />
            )}
            
            <h3 className="font-semibold text-lg mb-2">{order.service.title}</h3>
            
            <div className="flex items-center mb-4">
              <Image
                src={order.seller.image || '/images/default-avatar.svg'}
                alt={order.seller.name}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full mr-2 object-cover"
                unoptimized
              />
              <span className="text-sm font-medium">{order.seller.name}</span>
            </div>

            {order.message && (
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-gray-600">要件:</p>
                <p className="text-sm">{order.message}</p>
              </div>
            )}

            <div className="flex items-center text-sm text-gray-600 mb-4">
              <Clock className="w-4 h-4 mr-1" />
              納期: {new Date(order.deadline).toLocaleDateString('ja-JP')}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span>サービス料金</span>
                <span>¥{order.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                <span>サービス手数料 (5%)</span>
                <span>¥{serviceFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                <span>合計</span>
                <span>¥{totalWithFee.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 決済方法 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">決済方法</h2>
            
            <div className="space-y-4 mb-6">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'credit' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onClick={() => setPaymentMethod('credit')}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="payment"
                    value="credit"
                    checked={paymentMethod === 'credit'}
                    onChange={() => setPaymentMethod('credit')}
                    className="mr-3"
                  />
                  <CreditCard className="w-5 h-5 mr-2" />
                  <span className="font-medium">クレジットカード</span>
                </div>
                <p className="text-sm text-gray-600 ml-10 mt-1">
                  Visa, Mastercard, JCB, AMEX
                </p>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'bank' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onClick={() => setPaymentMethod('bank')}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="payment"
                    value="bank"
                    checked={paymentMethod === 'bank'}
                    onChange={() => setPaymentMethod('bank')}
                    className="mr-3"
                  />
                  <span className="font-medium">銀行振込</span>
                </div>
                <p className="text-sm text-gray-600 ml-6 mt-1">
                  1-2営業日で処理されます
                </p>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'paypal' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onClick={() => setPaymentMethod('paypal')}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="payment"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={() => setPaymentMethod('paypal')}
                    className="mr-3"
                  />
                  <span className="font-medium">PayPal</span>
                </div>
                <p className="text-sm text-gray-600 ml-6 mt-1">
                  PayPalアカウントから決済
                </p>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-green-800 mb-2 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                安全な決済
              </h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  エスクロー決済で安心
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  成果物納品後に支払い
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  SSL暗号化で保護
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">決済に関する注意</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    決済完了後、売り手が作業を開始します。成果物の納品・承認後に売り手に料金が支払われます。
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={paymentLoading}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {paymentLoading ? (
                <>処理中...</>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  ¥{totalWithFee.toLocaleString()} を支払う
                </>
              )}
            </button>
            
            <p className="text-xs text-gray-500 text-center mt-3">
              決済処理は安全に暗号化されています
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
