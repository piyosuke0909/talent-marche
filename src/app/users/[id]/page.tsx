import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { prisma } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'
import { formatPrice } from '@/lib/utils'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

async function getPublicProfile(userId: string) {
  const [user, reviewStats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        website: true,
        location: true,
        image: true,
        createdAt: true,
        identityVerified: true,
        skills: true,
        _count: {
          select: {
            services: true,
            orders: true,
            reviews: true,
          },
        },
        services: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
            createdAt: true,
            category: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
        },
      },
    }),
    prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
    }),
  ])

  if (!user) {
    return null
  }

  return {
    user,
    averageRating: reviewStats._avg.rating ?? 0,
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { id } = await params
  const profile = await getPublicProfile(id)

  if (!profile) {
    notFound()
  }

  const session = await getServerAuthSession()
  const user = profile.user
  const isOwner = session?.user?.id === user.id
  const skills = user.skills ?? []
  const services = user.services

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">クリエイタープロフィール</p>
          <h1 className="text-3xl font-bold text-gray-900">{user.name || user.username}</h1>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-sm text-gray-500">@{user.username}</p>
            {user.identityVerified ? (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium border border-blue-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                本人確認済
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 px-2 py-0.5 rounded text-xs font-medium border border-gray-200">
                <ShieldAlert className="w-3.5 h-3.5" />
                本人未確認
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {!isOwner && session?.user?.id && (
            <Link
              href={`/messages/new?userId=${user.id}`}
              className="inline-flex items-center rounded-full border border-blue-500 px-5 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            >
              メッセージを送る
            </Link>
          )}
          <Link
            href={`/services?userId=${user.id}`}
            className="inline-flex items-center rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            この出品者のサービス
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <Image
              src={user.image || '/images/default-avatar.svg'}
              alt={user.name || user.username || 'ユーザー'}
              width={120}
              height={120}
              className="h-24 w-24 rounded-full object-cover"
            />
            <div>
              <p className="text-sm text-gray-500">メンバー登録日: {new Date(user.createdAt).toLocaleDateString('ja-JP')}</p>
              <p className="text-sm text-gray-500">所在地: {user.location || '未設定'}</p>
              {user.website && (
                <a href={user.website} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                  {user.website}
                </a>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-gray-900">自己紹介</h2>
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
              {user.bio || 'まだ自己紹介が登録されていません。'}
            </p>
          </div>

          {skills.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-900">スキル</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">実績</h3>
            <dl className="space-y-6">
              <div className="flex items-center justify-between">
                <dt className="text-base text-gray-600">出品サービス</dt>
                <dd className="text-xl font-bold text-gray-900">{user._count.services}件</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-base text-gray-600">取引回数</dt>
                <dd className="text-xl font-bold text-gray-900">{user._count.orders}件</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-base text-gray-600">レビュー</dt>
                <dd className="text-xl font-bold text-gray-900">
                  {user._count.reviews}件 / 平均 {profile.averageRating.toFixed(1)} ★
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">最近のサービス</h2>
          <Link href={`/services?userId=${user.id}`} className="text-sm text-blue-600 hover:underline">
            すべて見る
          </Link>
        </div>
        {services.length === 0 ? (
          <p className="text-sm text-gray-500">現在公開中のサービスはありません。</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link key={service.id} href={`/services/${service.id}`} className="rounded-xl border border-gray-100 p-4 hover:border-blue-300">
                <div className="mb-3 h-40 overflow-hidden rounded-lg bg-gray-100">
                  {service.images[0] ? (
                    <Image
                      src={service.images[0]}
                      alt={service.title}
                      width={400}
                      height={160}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">No Image</div>
                  )}
                </div>
                <p className="text-xs text-gray-500">{service.category?.name || 'カテゴリ未設定'}</p>
                <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900">{service.title}</h3>
                <p className="mt-2 text-lg font-bold text-gray-900">{formatPrice(service.price)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}