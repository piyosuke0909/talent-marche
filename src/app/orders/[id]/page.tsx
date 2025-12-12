import { notFound, redirect } from 'next/navigation'
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import OrderDetailClient from '@/components/orders/OrderDetailClient'

interface RouteParams {
  params: {
    id: string
  }
}

export default async function OrderDetailPage({ params }: RouteParams) {
  const { id } = params
  const session = await getServerAuthSession()

  if (!session?.user?.id) {
    console.log("Session missing in OrderDetailPage, redirecting to signin. Session:", session)
    redirect(`/auth/signin?callbackUrl=/orders/${id}`)
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      service: {
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          deliveryDays: true,
          images: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      seller: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          bio: true,
        },
      },
      buyer: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          bio: true,
        },
      },
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      reviews: {
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      },
    },
  })

  if (!order) {
    notFound()
  }

  if (order.buyerId !== session.user.id && order.sellerId !== session.user.id) {
    notFound()
  }

  const serialisedOrder = JSON.parse(JSON.stringify(order))

  return (
    <OrderDetailClient initialOrder={serialisedOrder} currentUserId={session.user.id} />
  )
}
