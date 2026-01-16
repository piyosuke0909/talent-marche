import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/db'
import { formatPrice } from '@/lib/utils'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

async function getCategoryWithServices(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 24,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          images: true,
          deliveryDays: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              orders: true,
            },
          },
        },
      },
    },
  })
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params
  const category = await getCategoryWithServices(slug)

  if (!category) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-wide text-gray-500">カテゴリー</p>
        <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-sm text-gray-600">{category.description}</p>
        )}
      </div>

      {category.services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-gray-800">まだサービスがありません</p>
          <p className="mt-2 text-sm text-gray-500">新しいサービスが登録されるまでお待ちください。</p>
          <Link
            href="/services/create"
            className="mt-4 inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            このカテゴリで出品する
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {category.services.map((service) => (
            <Link key={service.id} href={`/services/${service.id}`}>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="mb-3 h-40 overflow-hidden rounded-lg bg-gray-100">
                  {service.images[0] ? (
                    <Image
                      src={service.images[0]}
                      alt={service.title}
                      width={400}
                      height={160}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">No Image</div>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{service.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{service.description}</p>
                <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <Image
                      src={service.user.image || '/images/default-avatar.svg'}
                      alt={service.user.name || service.user.username || 'User'}
                      width={24}
                      height={24}
                      className="mr-2 h-6 w-6 rounded-full object-cover"
                    />
                    <span>{service.user.name || service.user.username}</span>
                  </div>
                  <span>{service.deliveryDays}日で納品</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xl font-bold text-gray-900">{formatPrice(service.price)}</p>
                  <p className="text-xs text-gray-500">
                    注文 {service._count.orders} / レビュー {service._count.reviews}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
