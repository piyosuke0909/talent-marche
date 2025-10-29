'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface Request {
  id: string
  title: string
  description: string
  budget: number
  skills: string[]
  deadline: string | null
  location: string | null
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
  createdAt: string
  proposalCount?: number
}

interface Category {
  id: string
  name: string
  slug: string
}

export default function RequestsPage() {
  const searchParams = useSearchParams()
  const [requests, setRequests] = useState<Request[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: searchParams?.get('search') || '',
    category: searchParams?.get('category') || '',
    minBudget: '',
    maxBudget: '',
    skills: '',
    sortBy: 'recent'
  })

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
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
        const data = await response.json()
        setRequests(data.requests || [])
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

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return '指定なし'
    return new Date(deadline).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCreatedAt = (createdAt: string) => {
    return new Date(createdAt).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">依頼一覧</h1>
            <Link
              href="/requests/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              新しい依頼を作成
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  キーワード検索
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="依頼を検索..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリー
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべてのカテゴリー</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  予算範囲
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={filters.minBudget}
                    onChange={(e) => handleFilterChange('minBudget', e.target.value)}
                    placeholder="最低予算"
                    className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="self-center">〜</span>
                  <input
                    type="number"
                    value={filters.maxBudget}
                    onChange={(e) => handleFilterChange('maxBudget', e.target.value)}
                    placeholder="最高予算"
                    className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  並び順
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="recent">新着順</option>
                  <option value="budget_high">予算の高い順</option>
                  <option value="budget_low">予算の安い順</option>
                  <option value="deadline">締切の近い順</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">依頼が見つかりませんでした</h3>
            <p className="text-gray-500 mb-4">検索条件を変更してもう一度お試しください。</p>
            <button
              onClick={() => setFilters({
                search: '',
                category: '',
                minBudget: '',
                maxBudget: '',
                skills: '',
                sortBy: 'recent'
              })}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              フィルターをリセット
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Link key={request.id} href={`/requests/${request.id}`}>
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2">
                          {request.category.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatCreatedAt(request.createdAt)}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                        {request.title}
                      </h3>
                      
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {request.description}
                      </p>
                      
                      {request.skills && request.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {request.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <Image
                          src={request.user.image || '/images/default-avatar.png'}
                          alt={request.user.name}
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-full mr-2 object-cover"
                          unoptimized
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
                    
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        ¥{request.budget.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 mb-1">
                        納期: {formatDeadline(request.deadline)}
                      </div>
                      {request.proposalCount !== undefined && (
                        <div className="text-sm text-blue-600">
                          {request.proposalCount}件の提案
                        </div>
                      )}
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
