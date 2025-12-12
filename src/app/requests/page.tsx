'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

interface RequestListItem {
  id: string
  title: string
  description: string
  budget: number
  skills: string[]
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

      const response = await fetch(`/api/requests?${params.toString()}`)
      if (response.ok) {
        const data = (await response.json()) as { requests?: RequestListItem[] }
        setRequests(Array.isArray(data.requests) ? data.requests : [])
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleFilterChange = <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
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

  const formatCreatedAt = (createdAt: string) => {
    return new Date(createdAt).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 dark:text-gray-100">
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">依頼一覧</h1>
          <Link
            href="/requests/create"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            新しい依頼を作成
          </Link>
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow transition-colors duration-200">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">キーワード検索</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="依頼を検索..."
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">カテゴリ</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">必要スキル (カンマ区切り)</label>
              <input
                type="text"
                value={filters.skills}
                onChange={(e) => handleFilterChange('skills', e.target.value)}
                placeholder="例: React, Figma"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">並び替え</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value as SortOption)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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

      {loading ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">読み込み中...</div>
      ) : requests.length === 0 ? (
        <div className="rounded-lg bg-white dark:bg-gray-800 p-8 text-center shadow transition-colors duration-200">
          <div className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600">
            <svg className="h-full w-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">依頼が見つかりませんでした</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">検索条件を変更してもう一度お試しください。</p>
          <button
            onClick={() => setFilters({
              search: '',
              category: '',
              minBudget: '',
              maxBudget: '',
              skills: '',
              sortBy: 'recent',
            })}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            フィルターをリセット
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Link key={request.id} href={`/requests/${request.id}`}>
              <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow transition hover:shadow-lg dark:hover:bg-gray-750">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center">
                      <span className="mr-2 inline-flex rounded bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                        {request.category.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatCreatedAt(request.createdAt)}</span>
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">{request.title}</h3>
                    <p className="mb-4 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{request.description}</p>
                    {request.skills.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {request.skills.map((skill) => (
                          <span key={skill} className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Image
                        src={request.user.image || '/images/default-avatar.png'}
                        alt={request.user.name || 'request owner'}
                        width={24}
                        height={24}
                        className="mr-2 h-6 w-6 rounded-full object-cover"
                      />
                      <span>{request.user.name}</span>
                      {request.location && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{request.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="mb-2 text-2xl font-bold text-green-600 dark:text-green-400">¥{request.budget.toLocaleString()}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">納期: {formatDeadline(request.deadline)}</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      {(request.proposalCount ?? 0).toLocaleString()}件の提案
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RequestsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    }>
      <RequestsContent />
    </Suspense>
  )
}
