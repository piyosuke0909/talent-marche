'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { SvgIconProps } from '@mui/material'
import PaletteOutlined from '@mui/icons-material/PaletteOutlined'
import CodeOutlined from '@mui/icons-material/CodeOutlined'
import BrushOutlined from '@mui/icons-material/BrushOutlined'
import CreateOutlined from '@mui/icons-material/CreateOutlined'
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined'
import MovieOutlined from '@mui/icons-material/MovieOutlined'
import AnalyticsOutlined from '@mui/icons-material/AnalyticsOutlined'
import TranslateOutlined from '@mui/icons-material/TranslateOutlined'
import CategoryOutlined from '@mui/icons-material/CategoryOutlined'

type IconComponent = React.ComponentType<SvgIconProps>

const categoryIconMap: Record<string, { Icon: IconComponent; color: string; bg: string }> = {
  'web-design':     { Icon: PaletteOutlined,   color: '#3b82f6', bg: 'bg-blue-50' },
  'programming':    { Icon: CodeOutlined,       color: '#10b981', bg: 'bg-emerald-50' },
  'graphic-design': { Icon: BrushOutlined,      color: '#8b5cf6', bg: 'bg-violet-50' },
  'writing':        { Icon: CreateOutlined,     color: '#f59e0b', bg: 'bg-amber-50' },
  'marketing':      { Icon: TrendingUpOutlined, color: '#ef4444', bg: 'bg-red-50' },
  'video-audio':    { Icon: MovieOutlined,      color: '#ec4899', bg: 'bg-pink-50' },
  'data':           { Icon: AnalyticsOutlined,  color: '#06b6d4', bg: 'bg-cyan-50' },
  'translation':    { Icon: TranslateOutlined,  color: '#6366f1', bg: 'bg-indigo-50' },
}

interface Category {
  id: string
  name: string
  description: string | null
  icon: string | null
  slug: string
  _count: {
    services: number
  }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">カテゴリー</h1>
        <p className="text-xl text-gray-600">あなたに最適なサービスを見つけよう</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((category) => {
          const mapped = categoryIconMap[category.slug]
          const Icon = mapped?.Icon ?? CategoryOutlined
          const color = mapped?.color ?? '#6b7280'
          const bg = mapped?.bg ?? 'bg-gray-50'

          return (
            <Link
              key={category.id}
              href={`/services?category=${category.slug}`}
              className="group"
            >
              <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-6 hover:scale-105">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${bg} mb-4`}>
                    <Icon sx={{ fontSize: 32, color }} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                  <div className="flex items-center justify-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {category._count.services}件のサービス
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">カテゴリーが見つかりませんでした</h3>
          <p className="text-gray-500">現在、カテゴリーが設定されていません。</p>
        </div>
      )}

      <div className="mt-12 text-center">
        <Link
          href="/services"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          すべてのサービスを見る
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
