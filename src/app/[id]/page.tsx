import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { formatPrice } from '@/lib/utils'
import { getServerAuthSession } from '@/lib/auth'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

async function getRequest(id: string) {
  return prisma.request.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      proposals: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })
}

export default async function RequestDetailPage({ params }: PageProps) {
  const { id } = await params
  const request = await getRequest(id)

  if (!request) {
    notFound()
  }

  const session = await getServerAuthSession()
  const isOwner = session?.user?.id === request.userId

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">カテゴリ: {request.category?.name || '未設定'}</p>
          <h1 className="text-3xl font-bold text-gray-900">{request.title}</h1>
          <p className="text-sm text-gray-500">投稿日: {request.createdAt.toLocaleDateString('ja-JP')}</p>
        </div>
        {!isOwner && session?.user?.id && (
          <Link
            href={`/messages/new?userId=${request.user.id}&requestId=${request.id}`}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            この依頼について相談する
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">依頼概要</h2>
          <p className="mt-4 whitespace-pre-wrap text-gray-700">{request.description}</p>

          {request.skills.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900">必要スキル</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {request.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">条件</h3>
            <dl className="mt-3 space-y-2 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <dt>予算</dt>
                <dd className="text-lg font-bold text-gray-900">{formatPrice(request.budget)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>締切</dt>
                <dd>{request.deadline ? new Date(request.deadline).toLocaleDateString('ja-JP') : '指定なし'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>募集状況</dt>
                <dd>{request.isActive ? '募集中' : 'クローズ'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>所在地</dt>
                <dd>{request.location || '未設定'}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">依頼者</h3>
            <div className="mt-3 flex items-center">
              <Image
                src={request.user.image || '/images/default-avatar.png'}
                alt={request.user.name || '依頼者'}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
              <div className="ml-3">
                <p className="font-semibold text-gray-900">{request.user.name || '匿名ユーザー'}</p>
                <p className="text-sm text-gray-500">@{request.user.username}</p>
              </div>
            </div>
            {!isOwner && session?.user?.id && (
              <Link
                href={`/messages/new?userId=${request.user.id}`}
                className="mt-4 inline-flex items-center rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-600"
              >
                メッセージを送る
              </Link>
            )}
          </div>
        </div>
      </div>

      {request.proposals.length > 0 && (
        <div className="mt-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">最新の提案</h3>
          <ul className="mt-4 space-y-4">
            {request.proposals.map((proposal) => (
              <li key={proposal.id} className="rounded-xl border border-gray-100 p-4">
                <div className="mb-2 flex items-center">
                  <Image
                    src={proposal.user.image || '/images/default-avatar.png'}
                    alt={proposal.user.name || '提案者'}
                    width={32}
                    height={32}
                    className="mr-2 h-8 w-8 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{proposal.user.name || '提案者'}</p>
                    <p className="text-xs text-gray-500">{new Date(proposal.createdAt).toLocaleDateString('ja-JP')}</p>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{proposal.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
