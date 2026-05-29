'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 8 // 横4 × 縦2

interface RequestListItem {
  id: string
  title: string
  description: string
  budget: number
  skills: string[]
  images?: string[]
  deadline: string | null
  location: string | null
  createdAt: string
  proposalCount?: number
  user: {
    id: string
    name: string
    image: string | null
  }
  category: {
    id: string
    name: string
    slug: string
  }
}

interface CategorySummary {
  id: string
  name: string
  slug: string
}

interface RequestsResponse {
  requests: RequestListItem[]
  totalCount: number
  totalPages: number
  currentPage: number
}

type SortOption = 'recent' | 'budget_high' | 'budget_low' | 'deadline'

type FiltersState = {
  search: string
  category: string
  minBudget: string
  maxBudget: string
  skills: string
  sortBy: SortOption
}

function RequestsContent() {
  const searchParams = useSearchParams()
  const [requests, setRequests] = useState<RequestListItem[]>([])
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [filters, setFilters] = useState<FiltersState>({
    search: searchParams?.get('search') || '',
    category: searchParams?.get('category') || '',
    minBudget: '',
    maxBudget: '',
    skills: '',
    sortBy: 'recent',
  })

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = (await response.json()) as CategorySummary[]
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }, [])

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.category) params.append('category', filters.category)
      if (filters.minBudget) params.append('minBudget', filters.minBudget)
      if (filters.maxBudget) params.append('maxBudget', filters.maxBudget)
      if (filters.skills) params.append('skills', filters.skills)
      params.append('sortBy', filters.sortBy)
      params.append('page', currentPage.toString())
      params.append('limit', PAGE_SIZE.toString())

      const response = await fetch(`/api/requests?${params.toString()}`)
      if (response.ok) {
        const data = (await response.json()) as RequestsResponse
        setRequests(Array.isArray(data.requests) ? data.requests : [])
        setTotalPages(data.totalPages || 1)
        setTotalCount(data.totalCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }, [filters, currentPage])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // フィルター変更時はページを1に戻す
  const handleFilterChange = <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
    setCurrentPage(1)
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return '指定なし'
    return new Date(deadline).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // ページ番号リスト生成（最大7枠）
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages: (number | '...')[] = []
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages)
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
    }
    return pages
  }

  return (
    <div className="container mx-auto px-6 py-12">
      {/* ヘッダー */}
      <div className="mb-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">依頼一覧</h1>
          <Link
            href="/requests/create"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            新しい依頼を作成
          </Link>
        </div>

        {/* フィルター */}
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">キーワード検索</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="依頼を検索..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">カテゴリ</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">すべてのカテゴリ</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">予算の下限</label>
              <input
                type="number"
                min={0}
                value={filters.minBudget}
                onChange={(e) => handleFilterChange('minBudget', e.target.value)}
                placeholder="例: 10000"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">予算の上限</label>
              <input
                type="number"
                min={0}
                value={filters.maxBudget}
                onChange={(e) => handleFilterChange('maxBudget', e.target.value)}
                placeholder="例: 50000"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">必要スキル (カンマ区切り)</label>
              <input
                type="text"
                value={filters.skills}
                onChange={(e) => handleFilterChange('skills', e.target.value)}
                placeholder="例: React, Figma, Python"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">並び替え</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value as SortOption)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="recent">新着順</option>
                <option value="budget_high">予算が高い順</option>
                <option value="budget_low">予算が安い順</option>
                <option value="deadline">締切が近い順</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      {loading ? (
        <div className="py-16 text-center text-gray-500 dark:text-gray-400">読み込み中...</div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-gray-800 p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600">
            <svg className="h-full w-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">依頼が見つかりませんでした</h3>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">検索条件を変更してもう一度お試しください。</p>
          <button
            onClick={() => {
              setCurrentPage(1)
              setFilters({ search: '', category: '', minBudget: '', maxBudget: '', skills: '', sortBy: 'recent' })
            }}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            フィルターをリセット
          </button>
        </div>
      ) : (
        <>
          {/* 件数表示 */}
          <p className="text-sm text-gray-500 mb-4">
            全 <span className="font-semibold text-gray-700">{totalCount}</span> 件
            （{(currentPage - 1) * PAGE_SIZE + 1}〜{Math.min(currentPage * PAGE_SIZE, totalCount)} 件表示）
          </p>

          {/* カードグリッド: 横4 × 縦2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {requests.map((request) => (
              <div
                key={request.id}
                className="relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 group"
              >
                <Link href={`/requests/${request.id}`} className="block h-full">

                  {/* サムネイル（サービスカードと同じ aspect-video） */}
                  <div className="aspect-video bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    {request.images && request.images.length > 0 ? (
                      <Image
                        src={request.images[0]}
                        alt={request.title}
                        width={400}
                        height={225}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <svg className="w-10 h-10 text-blue-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* カード本文 */}
                  <div className="p-4 flex flex-col h-[calc(100%-56.25%)]">

                    {/* 投稿者 */}
                    <div className="flex items-center mb-2 shrink-0">
                      <Image
                        src={request.user.image || '/images/default-avatar.svg'}
                        alt={request.user.name || 'ユーザー'}
                        width={24}
                        height={24}
                        className="mr-2 h-6 w-6 rounded-full object-cover"
                        unoptimized
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{request.user.name}</span>
                    </div>

                    {/* タイトル */}
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 line-clamp-2 shrink-0">
                      {request.title}
                    </h3>

                    {/* 下部ステータス */}
                    <div className="mt-auto">
                      {/* カテゴリ ＋ 提案数 */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded truncate max-w-[55%]">
                          {request.category.name}
                        </span>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 shrink-0">
                          <svg className="w-4 h-4 text-blue-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          {(request.proposalCount ?? 0)}件
                        </div>
                      </div>

                      {/* 予算 ＋ 納期 */}
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900 dark:text-white truncate">
                          ¥{request.budget.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                          {formatDeadline(request.deadline)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-12">
              {/* 前へ */}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="前のページ"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* ページ番号 */}
              {getPageNumbers().map((page, idx) =>
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="w-10 h-10 flex items-center justify-center text-gray-400 text-sm">
                    …
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page as number)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              {/* 次へ */}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="次のページ"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function RequestsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-6 py-12">
        <div className="text-center text-gray-500">読み込み中...</div>
      </div>
    }>
      <RequestsContent />
    </Suspense>
  )
}
