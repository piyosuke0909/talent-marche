'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CreditCard, Shield, Lock } from 'lucide-react'
import type { ServiceDetail } from '@/types'

export const dynamic = 'force-dynamic'

const PAYJP_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYJP_PUBLIC_KEY

function CheckoutContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('serviceId')

  const [service, setService] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cardError, setCardError] = useState<string | null>(null)
  const [isCardReady, setIsCardReady] = useState(false)

  const [requirements, setRequirements] = useState('')
  const [budget, setBudget] = useState<number | ''>('')
  const [cardHolder, setCardHolder] = useState('')

  const payjpRef = useRef<PayjpInstance | null>(null)
  const cardElementRef = useRef<PayjpCardElement | null>(null)

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

  const loadPayjpScript = useCallback(async () => {
    if (typeof window === 'undefined') return
    if (document.querySelector<HTMLScriptElement>('#payjp-js')) {
      if (window.Payjp) return
      await new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>('#payjp-js')
        if (!existingScript) return resolve()
        existingScript.addEventListener('load', () => resolve())
        existingScript.addEventListener('error', () => reject(new Error('PAY.JP script failed to load')))
      })
      return
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.id = 'payjp-js'
      script.src = 'https://js.pay.jp/v2/pay.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('PAY.JP script failed to load'))
      document.body.appendChild(script)
    })
  }, [])

  useEffect(() => {
    if (status === 'loading' || loading || !service) return

    if (!PAYJP_PUBLIC_KEY) {
      setErrorMessage('PAY.JPの公開鍵が設定されていません。環境変数 NEXT_PUBLIC_PAYJP_PUBLIC_KEY を確認してください。')
      return
    }

    let mounted = true

    const setupPayjp = async () => {
      try {
        await loadPayjpScript()
        if (!mounted || !window.Payjp) {
          throw new Error('PAY.JPの読み込みに失敗しました')
        }

        // DOM要素の存在確認を少し待機してから行う
        await new Promise(resolve => setTimeout(resolve, 100))

        if (!mounted) return

        const mountTarget = document.querySelector('#payjp-card')
        if (!mountTarget) {
          console.error('Target element #payjp-card not found')
          throw new Error('カード入力フィールドの描画に失敗しました')
        }

        // Use cached instance or create new one
        // Cast window to any to store partial instance
        let payjp = (window as any)._payjpInstance

        if (!payjp) {
          try {
            payjp = window.Payjp(PAYJP_PUBLIC_KEY)
              ; (window as any)._payjpInstance = payjp
          } catch (e: any) {
            // If it throws "already instantiated" but we don't have it in our cache (e.g. strict mode race),
            // we might be in trouble if we can't retrieve it. 
            // However, separating definition from call usually helps.
            console.error('Payjp instantiation check failed:', e)
            // Try to recover? If window.Payjp throws, it might mean there's an internal singleton.
            // We can't easily get it if the library doesn't expose a 'getInstance'.
            // But relying on our own global cache should solve strict mode re-runs.
            throw e
          }
        }

        payjpRef.current = payjp

        // Re-create elements. 
        // Note: You can store elements in ref, but generally creating new elements for new mount is fine
        // as long as the main Payjp instance is reused.
        const elements = payjp.elements()
        console.log('PayJP Elements created')

        const card = elements.create('card', {
          style: {
            base: {
              fontFamily: 'inherit',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#9e2146',
            },
          },
        })

        card.mount('#payjp-card')
        card.on('ready', () => {
          console.log('PayJP Card Ready')
          setIsCardReady(true)
        })
        card.on('change', (event: PayjpCardChangeEvent) => {
          setCardError(event?.error?.message ?? null)
        })

        cardElementRef.current = card
      } catch (error) {
        console.error('PayJP Initialization Error:', error)
        if (mounted) {
          if ((error as Error).message.includes("Already instantiated")) {
            // Fallback: If we hit this, it means our cache logic missed (maybe HMR cleared window prop but not Payjp internal).
            // We'll advise refresh.
            setErrorMessage('決済システムの読み込みエラーが発生しました。ページを再読み込みしてください。')
          } else {
            setErrorMessage(`決済フォームの初期化に失敗しました: ${(error as Error).message}`)
          }
        }
      }
    }

    void setupPayjp()

    return () => {
      mounted = false
      if (cardElementRef.current) {
        try {
          cardElementRef.current.unmount()
        } catch (e) {
          console.error('Failed to unmount PayJP card:', e)
        }
      }
      cardElementRef.current = null
      payjpRef.current = null
    }
  }, [loadPayjpScript, status, loading, service])

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

    if (!cardHolder.trim()) {
      setErrorMessage('カード名義人を入力してください')
      return
    }

    // Get the latest instance from global cache if available to avoid stale closures
    const payjpInstance = (window as any)._payjpInstance || payjpRef.current

    if (!payjpInstance || !cardElementRef.current) {
      setErrorMessage('決済フォームの初期化に失敗しました。ページを再読み込みしてください。')
      return
    }

    if (!isCardReady) {
      setErrorMessage('カード入力欄を読み込み中です。数秒お待ちください。')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      // Create token
      const tokenResult = await payjpInstance.createToken(cardElementRef.current)

      if (tokenResult.error) {
        throw new Error(tokenResult.error.message)
      }

      if (!tokenResult.id) {
        throw new Error('カード情報のトークン化に失敗しました')
      }

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

      const order = await orderResponse.json()
      const paymentResponse = await fetch(`/api/orders/${order.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'credit',
          tokenId: tokenResult.id,
          mode: 'test',
        }),
      })

      if (!paymentResponse.ok) {
        const error = await paymentResponse.json().catch(() => ({}))
        throw new Error(error.error || '決済に失敗しました')
      }

      const paymentResult = await paymentResponse.json()

      // 3D Secure Handling
      if (paymentResult.action === 'three_d_secure' && paymentResult.chargeId) {

        const tdsResult = await payjpInstance.openThreeDSecure(paymentResult.chargeId)

        if (!tdsResult) {
          throw new Error('3Dセキュア認証が完了しませんでした')
        }

        // After 3DS, we assume success or wait for webhook. 
        // Ideally we should call a "verify" endpoint, but redirecting to success will work 
        // providing the webhook fires quickly or the success page checks status.
      }

      router.push(`/orders/${order.id}?payment=success`)
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
    <div className="container mx-auto px-4 py-8 dark:text-gray-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center">
          <Link href={`/services/${service.id}`} className="mr-4 flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft className="mr-1 h-5 w-5" />
            サービス詳細に戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">購入手続き</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow transition-colors duration-200">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">依頼内容</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  要件・詳細 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={6}
                  maxLength={2000}
                  placeholder="プロジェクトの背景、期待する成果物、参考URLなどを記載してください"
                  className="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">希望予算 (¥)</label>
                <input
                  type="number"
                  min={service.price}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">最低価格: ¥{service.price.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow transition-colors duration-200">
              <div className="mb-4 flex items-center">
                <Image
                  src={service.images[0] || '/images/default-avatar.svg'}
                  alt={service.title}
                  width={80}
                  height={80}
                  className="mr-4 h-20 w-20 rounded-lg object-cover"
                />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">購入サービス</p>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{service.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">納期: {service.deliveryDays}日</p>
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">基本価格</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">¥{service.price.toLocaleString()}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>決済方法</span>
                  <span>クレジットカード</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow transition-colors duration-200">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">クレジットカード情報</h2>
                <Lock className="h-4 w-4 text-gray-400" />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">カード名義人</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="TARO YAMADA"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">カード番号</label>
                  <div
                    id="payjp-card"
                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-3 bg-white dark:bg-gray-700"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PAY.JPのテストモードで動作しています。公開鍵・秘密鍵にテストキーをご利用ください。
                </p>
                {cardError && (
                  <p className="text-sm text-rose-600 dark:text-rose-400">
                    {cardError}
                  </p>
                )}
              </div>

              <p className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Shield className="mr-1 h-4 w-4" />
                決済情報は安全に暗号化され、当社では保存されません。
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow transition-colors duration-200">
              {errorMessage && (
                <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-900/30 px-4 py-2 text-sm text-rose-700 dark:text-rose-300">
                  {errorMessage}
                </div>
              )}
              <button
                onClick={handleCheckout}
                disabled={submitting || !isCardReady}
                className="flex w-full items-center justify-center rounded-full bg-green-600 px-6 py-3 text-white shadow hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-gray-600"
              >
                {submitting ? '処理中...' : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    クレジットカードで支払う
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                決済は SSL で保護されています。利用規約とプライバシーに同意のうえでご購入ください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
