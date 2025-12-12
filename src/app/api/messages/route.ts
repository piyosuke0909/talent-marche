import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

const messageInclude = {
  sender: {
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
    },
  },
  receiver: {
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
    },
  },
  order: {
    select: {
      id: true,
      status: true,
      service: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  },
} as const

type MessageWithRelations = Prisma.MessageGetPayload<{ include: typeof messageInclude }>

function mapMessage(message: MessageWithRelations, viewerId: string) {
  return {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    isRead: message.receiverId === viewerId ? true : message.isRead,
    senderId: message.senderId,
    receiverId: message.receiverId,
    sender: message.sender,
    receiver: message.receiver,
    order: message.order
      ? {
        id: message.order.id,
        status: message.order.status,
        service: message.order.service
          ? {
            id: message.order.service.id,
            title: message.order.service.title,
          }
          : null,
      }
      : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const viewerId = session.user.id
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId")
    const orderId = searchParams.get("orderId")
    const cursor = searchParams.get("cursor")
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "", 10)

    const take = Number.isNaN(parsedLimit)
      ? DEFAULT_PAGE_SIZE
      : Math.min(Math.max(parsedLimit, 1), MAX_PAGE_SIZE)

    const where: Prisma.MessageWhereInput = {
      OR: [{ senderId: viewerId }, { receiverId: viewerId }],
    }

    if (conversationId) {
      where.OR = [
        { senderId: viewerId, receiverId: conversationId },
        { senderId: conversationId, receiverId: viewerId },
      ]
    }

    if (orderId) {
      where.orderId = orderId
    }

    const queryOptions = {
      where,
      include: messageInclude,
      orderBy: { createdAt: "desc" as const },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }

    const messages = await prisma.message.findMany(queryOptions)
    const hasMore = messages.length > take
    const trimmed = hasMore ? messages.slice(0, take) : messages
    const ordered = trimmed.slice().reverse()

    const unreadIds = ordered
      .filter((message) => message.receiverId === viewerId && !message.isRead)
      .map((message) => message.id)

    if (unreadIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadIds } },
        data: { isRead: true },
      })
    }

    return NextResponse.json({
      messages: ordered.map((message) => mapMessage(message, viewerId)),
      nextCursor: hasMore ? trimmed[trimmed.length - 1].id : null,
    })
  } catch (error) {
    console.error("Messages fetch error:", error)
    return NextResponse.json({ error: "メッセージの取得に失敗しました" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const viewerId = session.user.id
    const { receiverId, content, orderId } = await request.json()

    if (!receiverId || typeof receiverId !== "string") {
      return NextResponse.json({ error: "受信者が指定されていません" }, { status: 400 })
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "メッセージ内容を入力してください" }, { status: 400 })
    }

    if (receiverId === viewerId) {
      return NextResponse.json({ error: "自分自身には送信できません" }, { status: 400 })
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    })

    if (!receiver) {
      return NextResponse.json({ error: "受信者が見つかりません" }, { status: 404 })
    }

    let relatedOrderId: string | null = null

    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, buyerId: true, sellerId: true },
      })

      if (!order) {
        return NextResponse.json({ error: "指定された取引が見つかりません" }, { status: 404 })
      }

      if (![order.buyerId, order.sellerId].includes(viewerId)) {
        return NextResponse.json({ error: "この取引に参加していません" }, { status: 403 })
      }

      if (![order.buyerId, order.sellerId].includes(receiverId)) {
        return NextResponse.json({ error: "受信者はこの取引に参加していません" }, { status: 400 })
      }

      relatedOrderId = order.id
    }

    const message = await prisma.message.create({
      data: {
        senderId: viewerId,
        receiverId,
        content: content.trim(),
        orderId: relatedOrderId,
      },
      include: messageInclude,
    })

    return NextResponse.json(
      {
        message: mapMessage(message, viewerId),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Message creation error:", error)
    return NextResponse.json({ error: "メッセージの送信に失敗しました" }, { status: 500 })
  }
}
