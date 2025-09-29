import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { prisma } from '@/lib/db'
import FavoriteButton from '@/components/FavoriteButton'

async function getRecommendedServices() {
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
    orderBy: { createdAt: 'desc' },
    take: 4,
  })

  return services.map(service => {
    const averageRating = service.reviews.length > 0
      ? service.reviews.reduce((sum, review) => sum + review.rating, 0) / service.reviews.length
      : 0

    return {
      ...service,
      averageRating: Math.round(averageRating * 10) / 10,
      reviews: undefined,
    }
  })
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
    <div className="bg-gray-100 font-sans">
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
      <main className="container mx-auto px-4 py-8">
        {/* Featured Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
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
        <h2 className="text-2xl font-bold mb-4">あなたにおすすめ</h2>
        <div className="grid grid-cols-1 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white p-4 rounded-lg shadow-md flex items-center space-x-4">
              <div className="bg-gray-200 w-24 h-24 flex-shrink-0 flex items-center justify-center rounded-lg overflow-hidden">
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
                    <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm1 1h10v10H7V7zm1 1v8h8V8H8z"/>
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <Link href={`/services/${service.id}`} className="hover:underline">
                  <h3 className="text-lg font-bold">{service.title}</h3>
                </Link>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{service.description}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="text-green-600 font-semibold">¥{service.price.toLocaleString()}〜</div>
                  {service.averageRating > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{service.averageRating}</span>
                      <span className="text-sm text-gray-500">({service._count.reviews})</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  by {service.user.name || service.user.username} • {service.category.name}
                </div>
                
                <div className="flex items-center space-x-2 mt-2">
                  <Link href={`/services/${service.id}`}>
                    <Button size="sm" className="bg-red-500 hover:bg-red-600">
                      詳細を見る
                    </Button>
                  </Link>
                  <FavoriteButton serviceId={service.id} />
                </div>
              </div>
            </div>
          ))}
          
          {services.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              まだサービスが登録されていません
            </div>
          )}
        </div>

        {/* Categories Section */}
        <section className="bg-gray-100 -mx-4 px-4 py-16 mt-8">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">カテゴリから探す</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category, index) => (
                <Link key={category.id} href={`/categories/${category.slug}`}>
                  <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center mb-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                        index % 6 === 0 ? 'bg-blue-100' :
                        index % 6 === 1 ? 'bg-green-100' :
                        index % 6 === 2 ? 'bg-purple-100' :
                        index % 6 === 3 ? 'bg-red-100' :
                        index % 6 === 4 ? 'bg-yellow-100' :
                        'bg-indigo-100'
                      }`}>
                        {category.icon ? (
                          <span className="text-2xl">{category.icon}</span>
                        ) : (
                          <svg className={`w-6 h-6 ${
                            index % 6 === 0 ? 'text-blue-600' :
                            index % 6 === 1 ? 'text-green-600' :
                            index % 6 === 2 ? 'text-purple-600' :
                            index % 6 === 3 ? 'text-red-600' :
                            index % 6 === 4 ? 'text-yellow-600' :
                            'text-indigo-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                          </svg>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                    </div>
                    <p className="text-gray-600 text-sm">{category.description || 'カテゴリの詳細はこちら'}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
