import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Star, Heart, Clock, User, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { ServiceDetail, ServiceReviewSummary } from '@/types'

interface ServicePageProps {
  params: {
    id: string
  }
}

async function getService(id: string): Promise<ServiceDetail | null> {
  const service = await prisma.service.findUnique({
    where: { 
      id,
      isActive: true 
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          bio: true,
          isVerified: true,
          createdAt: true,
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
        include: {
          reviewer: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: {
        select: {
          orders: true,
          reviews: true,
          favorites: true,
        }
      }
    }
  })

  if (!service) {
    return null
  }

  const averageRating = service.reviews.length > 0
    ? service.reviews.reduce((sum, review) => sum + review.rating, 0) / service.reviews.length
    : 0

  const totalReviews = service.reviews.length
  const normalizedReviews: ServiceReviewSummary[] = service.reviews.map(review => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    reviewer: {
      id: review.reviewer.id,
      username: review.reviewer.username,
      name: review.reviewer.name,
      image: review.reviewer.image,
    },
  }))

  return {
    id: service.id,
    title: service.title,
    description: service.description,
    price: service.price,
    images: service.images,
    deliveryDays: service.deliveryDays,
    user: {
      id: service.user.id,
      username: service.user.username,
      name: service.user.name,
      image: service.user.image,
      bio: service.user.bio,
      isVerified: service.user.isVerified,
      createdAt: service.user.createdAt.toISOString(),
    },
    category: {
      id: service.category.id,
      name: service.category.name,
      slug: service.category.slug,
    },
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews,
    orderCount: service._count.orders,
    favoriteCount: service._count.favorites,
    tags: service.tags,
    isActive: service.isActive,
    userId: service.userId,
    categoryId: service.categoryId,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
    reviews: normalizedReviews,
    _count: {
      orders: service._count.orders,
      reviews: service._count.reviews,
      favorites: service._count.favorites,
    },
  }
}

export default async function ServicePage({ params }: ServicePageProps) {
  const session = await getServerSession(authOptions)
  const service = await getService(params.id)

  if (!service) {
    notFound()
  }

  const isOwner = session?.user?.id === service.userId

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Service Images */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              {service.images.length > 0 ? (
                <div className="relative aspect-video">
                  <Image
                    src={service.images[0]}
                    alt={service.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-200 flex items-center justify-center">
                  <svg className="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm1 1h10v10H7V7zm1 1v8h8V8H8z"/>
                  </svg>
                </div>
              )}
              
              {/* Additional Images */}
              {service.images.length > 1 && (
                <div className="p-4 grid grid-cols-4 gap-2">
                  {service.images.slice(1, 5).map((image, index) => (
                    <div key={index} className="aspect-square">
                      <img 
                        src={image} 
                        alt={`${service.title} ${index + 2}`}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Service Details */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="mb-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{service.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {service.category.name}
                  </span>
                  {service.averageRating > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="font-medium">{service.averageRating}</span>
                      <span>({service._count.reviews}件のレビュー)</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{service._count.orders}件の受注実績</span>
                  </div>
                </div>
              </div>

              <div className="prose max-w-none">
                <h3 className="text-lg font-semibold mb-2">サービス内容</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{service.description}</p>
              </div>

              {service.tags.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">タグ</h4>
                  <div className="flex flex-wrap gap-2">
                    {service.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reviews */}
            {service.reviews.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">レビュー ({service._count.reviews})</h3>
                <div className="space-y-4">
                  {service.reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {review.reviewer.image ? (
                            <Image
                              src={review.reviewer.image}
                              alt={review.reviewer.name || review.reviewer.username}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {review.reviewer.name || review.reviewer.username}
                            </span>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating 
                                      ? 'text-yellow-400 fill-current' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-gray-700 text-sm">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Seller Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">販売者情報</h3>
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  {service.user.image ? (
                    <Image
                      src={service.user.image}
                      alt={service.user.name || service.user.username}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {service.user.name || service.user.username}
                    </span>
                    {service.user.isVerified && (
                      <svg className="w-5 h-5 text-blue-500 fill-current" viewBox="0 0 20 20">
                        <path d="M10 18l-8-5 8-8 8 8-8 5z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">@{service.user.username}</span>
                </div>
              </div>
              
              {service.user.bio && (
                <p className="text-gray-700 text-sm mb-4">{service.user.bio}</p>
              )}
              
              <div className="text-sm text-gray-600">
                メンバー登録: {new Date(service.user.createdAt).toLocaleDateString('ja-JP')}
              </div>
            </div>

            {/* Order Card */}
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  ¥{service.price.toLocaleString()}
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>納期: {service.deliveryDays}日</span>
                </div>
              </div>

              <div className="space-y-3">
                {!isOwner ? (
                  <>
                    <Link href={`/orders/new?serviceId=${service.id}`}>
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        注文する
                      </Button>
                    </Link>
                    <Link href={`/messages/new?userId=${service.userId}`}>
                      <Button variant="outline" className="w-full">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        質問する
                      </Button>
                    </Link>
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    あなたのサービスです
                  </div>
                )}
                
                <button className="w-full flex items-center justify-center space-x-2 text-gray-600 hover:text-red-500 py-2">
                  <Heart className="w-4 h-4" />
                  <span>お気に入りに追加</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
