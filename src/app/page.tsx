import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { prisma } from '@/lib/db'
import FavoriteButton from '@/components/FavoriteButton'
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
  'web-design':     { Icon: PaletteOutlined,   color: '#3b82f6', bg: 'bg-blue-100' },
  'programming':    { Icon: CodeOutlined,       color: '#10b981', bg: 'bg-green-100' },
  'graphic-design': { Icon: BrushOutlined,      color: '#8b5cf6', bg: 'bg-purple-100' },
  'writing':        { Icon: CreateOutlined,     color: '#f59e0b', bg: 'bg-yellow-100' },
  'marketing':      { Icon: TrendingUpOutlined, color: '#ef4444', bg: 'bg-red-100' },
  'video-audio':    { Icon: MovieOutlined,      color: '#ec4899', bg: 'bg-pink-100' },
  'data':           { Icon: AnalyticsOutlined,  color: '#06b6d4', bg: 'bg-cyan-100' },
  'translation':    { Icon: TranslateOutlined,  color: '#6366f1', bg: 'bg-indigo-100' },
}

async function getRecommendedServices() {
  // スコアでソートするため、多めに取得してJS側でソート
  const services = await prisma.service.findMany({
    where: { isActive: true },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
        }
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      },
      reviews: {
        select: {
          rating: true,
        }
      },
      _count: {
        select: {
          orders: true,
          reviews: true,
          favorites: true,
        }
      }
    },
    take: 100,
  })

  return services
    .map(service => {
      const averageRating = service.reviews.length > 0
        ? service.reviews.reduce((sum, review) => sum + review.rating, 0) / service.reviews.length
        : 0
      // 注文数 + お気に入り数 でスコア計算
      const score = service._count.orders + service._count.favorites

      return {
        ...service,
        averageRating: Math.round(averageRating * 10) / 10,
        score,
        reviews: undefined,
      }
    })
    // スコア降順（同スコアは新着順）
    .sort((a, b) => b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 4)
    .map(({ score, ...rest }) => rest)
}

async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
    take: 6,
  })
}

export default async function HomePage() {
  const [services, categories] = await Promise.all([
    getRecommendedServices(),
    getCategories(),
  ])
  return (
    <div className="bg-gray-100 dark:bg-gray-950 font-sans min-h-screen transition-colors duration-200">
      {/* Hero Section */}
      <section
        className="hero-section relative h-96 bg-cover bg-center"
        style={{
          backgroundImage: "linear-gradient(rgba(37,99,235,0.25), rgba(37,99,235,0.25)), url('https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1600&auto=format&fit=crop')"
        }}
      >
        <div className="absolute inset-0 bg-blue-500 opacity-10"></div>
        <div className="relative z-10 flex items-center justify-center h-full">
          <h1 className="text-white text-5xl md:text-6xl tracking-widest drop-shadow">
            Talent Marche
          </h1>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Featured Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="relative h-64 rounded-lg shadow-md overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop"
              alt="プロフェッショナルな作業環境"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
              <div className="p-6 text-white">
                <h3 className="text-xl font-bold mb-2">プロフェッショナルと繋がろう</h3>
                <p className="text-sm opacity-90">
                  経験豊富な専門家があなたのプロジェクトを成功に導きます
                </p>
              </div>
            </div>
          </div>
          <div className="relative h-64 rounded-lg shadow-md overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop"
              alt="チームワークとコラボレーション"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
              <div className="p-6 text-white">
                <h3 className="text-xl font-bold mb-2">理想のプロジェクトを実現</h3>
                <p className="text-sm opacity-90">
                  あなたのアイデアを形にする最適なサービスが見つかります
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Services */}
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">あなたにおすすめ</h2>
        <div className="grid grid-cols-1 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md flex items-center space-x-4 transition-colors duration-200">
              <div className="bg-gray-200 dark:bg-gray-800 w-24 h-24 flex-shrink-0 flex items-center justify-center rounded-lg overflow-hidden">
                {service.images[0] ? (
                  <Image
                    src={service.images[0]}
                    alt={service.title}
                    width={96}
                    height={96}
                    className="h-full w-full rounded-lg object-cover"
                    unoptimized
                  />
                ) : (
                  <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm1 1h10v10H7V7zm1 1v8h8V8H8z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/services/${service.id}`} className="hover:underline">
                  <h3 className="text-lg font-bold truncate text-gray-900 dark:text-white">{service.title}</h3>
                </Link>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{service.description}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="text-green-600 dark:text-green-400 font-semibold">¥{service.price.toLocaleString()}〜</div>
                  {service.averageRating > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{service.averageRating}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">({service._count.reviews})</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  by {service.user.name || service.user.username} • {service.category.name}
                </div>

                <div className="flex items-center space-x-2 mt-2">
                  <Link href={`/services/${service.id}`}>
                    <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white border-none">
                      詳細を見る
                    </Button>
                  </Link>
                  <FavoriteButton serviceId={service.id} />
                </div>
              </div>
            </div>
          ))}

          {services.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              まだサービスが登録されていません
            </div>
          )}
        </div>

        {/* Categories Section */}
        <section className="bg-gray-100 dark:bg-gray-950 -mx-6 px-6 py-16 mt-16 transition-colors duration-200">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center text-gray-800 dark:text-white">カテゴリから探す</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => {
                const mapped = categoryIconMap[category.slug]
                const Icon = mapped?.Icon ?? CategoryOutlined
                const color = mapped?.color ?? '#6b7280'
                const bg = mapped?.bg ?? 'bg-gray-100'

                return (
                  <Link key={category.id} href={`/categories/${category.slug}`}>
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-center mb-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${bg} dark:bg-opacity-20`}>
                          <Icon sx={{ fontSize: 24, color }} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{category.name}</h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">{category.description || 'カテゴリの詳細はこちら'}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
