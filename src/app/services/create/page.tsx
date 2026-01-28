'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Category {
  id: string
  name: string
  slug: string
}

export default function CreateServicePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    price: '',
    description: '',
    deliveryDays: '',
    tags: [] as string[]
  })
  const [titleCount, setTitleCount] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const { data: session } = useSession() // We need session for user ID (path construction)

  useEffect(() => {
    const checkEligibility = async () => {
      try {
        // Categories
        const catRes = await fetch('/api/categories')
        if (catRes.ok) {
          const data = await catRes.json()
          setCategories(data)
        }

        // Payout Status
        const statusRes = await fetch('/api/user/payout-status')
        if (statusRes.ok) {
          const data = await statusRes.json()
          if (!data.isPayoutSetup) {
            setShowPayoutModal(true)
          }
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error)
      }
    }

    checkEligibility()
  }, [])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length <= 80) {
      setFormData({ ...formData, title: value })
      setTitleCount(value.length)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > 4) {
      alert('画像は最大4枚までアップロードできます')
      return
    }

    const newImages = [...images, ...files]
    setImages(newImages)

    // Generate previews (using ObjectURL for instant preview)
    files.forEach(file => {
      const url = URL.createObjectURL(file)
      setImagePreviews(prev => [...prev, url])
    })
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setImages(newImages)
    setImagePreviews(newPreviews)
  }

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirm(true)
  }

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      // Import the compression helper dynamically
      const { compressImageToBase64 } = await import('@/lib/image')

      const compressedImageStrings: string[] = []

      if (images.length > 0) {
        // Compress all images to Base64 in parallel
        const compressionPromises = images.map(file =>
          compressImageToBase64(file, 800, 0.6)
        )
        const results = await Promise.all(compressionPromises)
        compressedImageStrings.push(...results)
      }

      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          price: parseInt(formData.price),
          deliveryDays: parseInt(formData.deliveryDays) || 7,
          images: compressedImageStrings // Send compressed Base64 strings
        }),
      })

      if (response.ok) {
        router.push('/')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'サービスの作成に失敗しました')
      }
    } catch (error) {
      console.error('エラーが発生しました:', error)
      alert('エラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">出品内容の投稿</h1>
        <div className="max-w-2xl mx-auto">
          {!showConfirm ? (
            <form onSubmit={handleConfirm}>
              <div className="bg-white p-6 rounded-lg shadow-md mb-5">
                <div className="flex items-center mb-4">
                  <label className="font-bold mr-2">出品タイトル</label>
                  <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">必須</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={handleTitleChange}
                    placeholder="出品タイトルを記入してください"
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span className="absolute right-4 top-3 text-sm text-gray-500">
                    {titleCount}/80
                  </span>
                </div>
              </div>

              <div className="flex gap-5 mb-5">
                <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center mb-4">
                    <label className="font-bold mr-2">カテゴリを選択</label>
                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">必須</span>
                  </div>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">カテゴリを選択してください</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center mb-4">
                    <label className="font-bold mr-2">販売価格</label>
                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">必須</span>
                  </div>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="販売価格を記入してください"
                    min="1"
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md mb-5">
                <div className="flex items-center mb-4">
                  <label className="font-bold mr-2">出品概要</label>
                  <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">必須</span>
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="出品概要を記入してください"
                  rows={8}
                  className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-5 mb-5">
                <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center mb-4">
                    <label className="font-bold mr-2">納品日数</label>
                    <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded">任意</span>
                  </div>
                  <input
                    type="number"
                    value={formData.deliveryDays}
                    onChange={(e) => setFormData({ ...formData, deliveryDays: e.target.value })}
                    placeholder="納品日数を入力（例：7日）"
                    min="1"
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md mb-5">
                <div className="flex items-center mb-4">
                  <label className="font-bold mr-2">サービス画像</label>
                  <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded">任意</span>
                  <span className="text-sm text-gray-500 ml-2">（最大4枚まで）</span>
                </div>

                {/* ファイルアップロードエリア */}
                <div className="space-y-4">
                  {images.length < 4 && (
                    <div className="relative">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 bg-gray-50">
                        <svg className="w-8 h-8 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <div>
                          <p className="text-gray-600 font-medium">ファイルをアップロード</p>
                          <p className="text-sm text-gray-500">JPG, PNG, GIF形式（{4 - images.length}枚まで追加可能）</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 画像プレビュー */}
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <Image
                            src={preview}
                            alt="プレビュー画像"
                            width={200}
                            height={120}
                            className="h-24 w-full rounded border object-cover"
                            unoptimized
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center my-16">
                <button
                  type="submit"
                  className="w-full p-5 bg-black text-white text-xl font-bold rounded-lg shadow-md hover:bg-gray-800 transition-colors"
                >
                  確認画面に進む
                </button>
              </div>
            </form>
          ) : (
            /* 確認画面 */
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-6 text-center">出品内容の確認</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-2">サービス名</h3>
                  <p className="text-gray-700">{formData.title}</p>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-2">カテゴリ</h3>
                  <p className="text-gray-700">
                    {categories.find(c => c.id === formData.categoryId)?.name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-bold text-lg mb-2">価格</h3>
                    <p className="text-gray-700">¥{parseInt(formData.price).toLocaleString()}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">納品日数</h3>
                    <p className="text-gray-700">{formData.deliveryDays || 7}日</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-2">サービス内容</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{formData.description}</p>
                </div>

                {imagePreviews.length > 0 && (
                  <div>
                    <h3 className="font-bold text-lg mb-2">画像</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <Image
                          key={index}
                          src={preview}
                          alt="プレビュー画像"
                          width={200}
                          height={120}
                          className="h-24 w-full rounded border object-cover"
                          unoptimized
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-4 mt-8">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 p-4 bg-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-400 transition-colors"
                >
                  戻る
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1 p-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? '投稿中...' : '出品する'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="text-right max-w-6xl mx-auto px-4 pb-5">
        <div className="flex items-center justify-end gap-2">
          <input type="checkbox" className="mr-1" />
          <a href="#" className="text-blue-500">規約に同意して出品してください</a>
          <a href="#" className="text-blue-500 ml-2">ヘルプはこちら≫</a>
        </div>
      </footer>

      {/* Payout Requirement Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
              振込先口座の登録が必要です
            </h2>
            <p className="text-gray-600 mb-6 text-center leading-relaxed">
              サービスを出品して売上を受け取るには、<br />
              事前に「自動振込用の口座登録」を完了する必要があります。<br />
              <span className="text-xs text-gray-500 mt-2 block">※登録は決済代行会社PAY.JPを通じて行われます。</span>
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push('/dashboard/payout-settings')}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
              >
                口座登録へ進む
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-lg hover:bg-gray-200 transition"
              >
                トップページへ戻る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
