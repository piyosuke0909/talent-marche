import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Star, Clock, User, MessageCircle, ShieldCheck, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import NegotiationButton from '@/components/services/NegotiationButton'
import MobileActionBar from '@/components/services/MobileActionBar'
import FavoriteButton from '@/components/FavoriteButton'
import { prisma } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'
import type { ServiceDetail, ServiceReviewSummary } from '@/types'

interface ServicePageProps {
  params: Promise<{
    id: string
  }>
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
          identityVerified: true,
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
      identityVerified: service.user.identityVerified,
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
  const { id } = await params
  const session = await getServerAuthSession()
  const service = await getService(id)

  if (!service) {
    notFound()
  }

  const isOwner = session?.user?.id === service.userId

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Service Images */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden mb-6">
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
                <div className="aspect-video bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                  <svg className="w-24 h-24 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm1 1h10v10H7V7zm1 1v8h8V8H8z" />
                  </svg>
                </div>
              )}

              {/* Additional Images */}
              {service.images.length > 1 && (
                <div className="p-4 grid grid-cols-4 gap-2">
                  {service.images.slice(1, 5).map((image, index) => (
                    <div key={index} className="aspect-square">
                      <Image
                        src={image}
                        alt={`${service.title} ${index + 2}`}
                        width={256}
                        height={256}
                        className="w-full h-full object-cover rounded"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Service Details */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 mb-6 transition-colors duration-200">
              <div className="mb-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 break-words">{service.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                  <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                    {service.category.name}
                  </span>
                  {service.averageRating > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="font-medium">{service.averageRating}</span>
                      <span>({service._count.reviews})</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{service._count.orders}フォロー</span>
                  </div>
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none">
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">サービス概要</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{service.description}</p>
              </div>

              {service.tags.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">タグ</h4>
                  <div className="flex flex-wrap gap-2">
                    {service.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm"
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
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 mb-6 transition-colors duration-200">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">レビュー ({service._count.reviews})</h3>
                <div className="space-y-4">
                  {service.reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 dark:border-gray-800 pb-4 last:border-b-0">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {review.reviewer.image ? (
                            <Image
                              src={review.reviewer.image}
                              alt={review.reviewer.name || review.reviewer.username || 'ユーザー'}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {review.reviewer.name || review.reviewer.username}
                            </span>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < review.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300 dark:text-gray-600'
                                    }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(review.createdAt).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-gray-700 dark:text-gray-300 text-sm">{review.comment}</p>
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
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 mb-6 transition-colors duration-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">販売者情報</h3>
              <div className="flex items-center space-x-3 mb-4">
                <Link href={`/users/${service.user.id}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
                  {service.user.image ? (
                    <Image
                      src={service.user.image}
                      alt={service.user.name || service.user.username || 'ユーザー'}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                    </div>
                  )}
                </Link>
                <div>
                  <div className="flex flex-col">
                    <Link href={`/users/${service.user.id}`} className="font-medium text-gray-900 dark:text-white hover:underline">
                      {service.user.name || service.user.username}
                    </Link>
                    <div className="mt-1">
                      {service.user.identityVerified ? (
                        <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-medium border border-blue-200 dark:border-blue-800">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          本人確認済
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded text-xs font-medium border border-gray-200 dark:border-gray-700">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          本人未確認
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">@{service.user.username}</span>
                </div>
              </div>

              {service.user.bio && (
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">{service.user.bio}</p>
              )}

              <div className="text-sm text-gray-600 dark:text-gray-400">
                メンバー登録日: {new Date(service.user.createdAt).toLocaleDateString('ja-JP')}
              </div>
            </div>

            {/* Order Card */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 sticky top-4 transition-colors duration-200">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  ¥{service.price.toLocaleString()}
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <Clock className="w-4 h-4" />
                  <span>納期: {service.deliveryDays}日</span>
                </div>
              </div>

              <div className="space-y-3">
                {!isOwner ? (
                  <>
                    <Link href={`/checkout?serviceId=${service.id}`}>
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                        注文する
                      </Button>
                    </Link>
                    <Link href={`/messages/new?userId=${service.userId}`}>
                      <Button variant="outline" className="w-full dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:hover:bg-gray-700">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        質問する
                      </Button>
                    </Link>
                    <NegotiationButton
                      serviceId={service.id}
                      currentPrice={service.price}
                      sellerId={service.userId}
                      currentUserId={session?.user?.id}
                    />
                  </>
                ) : (
                  <div className="space-y-2">
                    <Link href={`/services/${service.id}/edit`}>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        編集する
                      </Button>
                    </Link>
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">これはあなたのサービスです</p>
                  </div>
                )}

                <FavoriteButton 
                  serviceId={service.id} 
                  showText={true}
                  className="w-full flex items-center justify-center border border-gray-200 dark:border-gray-700 py-4 hover:border-red-200 dark:hover:border-red-900/50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Action Bar */}
      {!isOwner && (
        <MobileActionBar price={service.price}>
          <Link href={`/checkout?serviceId=${service.id}`} className="flex-1">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
              注文する
            </Button>
          </Link>
          <div className="flex-1">
            <NegotiationButton
              serviceId={service.id}
              currentPrice={service.price}
              sellerId={service.userId}
              currentUserId={session?.user?.id}
            />
          </div>
        </MobileActionBar>
      )}
    </div>
  )
}
