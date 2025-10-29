import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

const DEFAULT_LIMIT = 40
const MAX_LIMIT = 100

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

function mapConversation(
  lastMessage: MessageWithRelations,
  unreadCount: number,
  viewerId: string,
) {
  const isViewerSender = lastMessage.senderId === viewerId
  const partner = isViewerSender ? lastMessage.receiver : lastMessage.sender

  return {
    userId: partner.id,
    user: partner,
    lastMessage: {
      id: lastMessage.id,
      content: lastMessage.content,
      createdAt: lastMessage.createdAt.toISOString(),
      isRead: lastMessage.receiverId === viewerId ? true : lastMessage.isRead,
      senderId: lastMessage.senderId,
      receiverId: lastMessage.receiverId,
      order: lastMessage.order
        ? {
            id: lastMessage.order.id,
            status: lastMessage.order.status,
            service: lastMessage.order.service
              ? {
                  id: lastMessage.order.service.id,
                  title: lastMessage.order.service.title,
                }
              : null,
          }
        : null,
    },
    unreadCount,
    updatedAt: lastMessage.createdAt.toISOString(),
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
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "", 10)
    const take = Number.isNaN(parsedLimit)
      ? DEFAULT_LIMIT
      : Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)

    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: viewerId }, { receiverId: viewerId }],
      },
      orderBy: { createdAt: "desc" },
      take: take * 3, // grab extra rows to build summaries without additional queries
      include: messageInclude,
    })

    const unreadCountByUser = new Map<string, number>()
    const conversationByUser = new Map<string, MessageWithRelations>()

    for (const message of messages) {
      const otherUserId = message.senderId === viewerId ? message.receiverId : message.senderId

      if (!conversationByUser.has(otherUserId)) {
        conversationByUser.set(otherUserId, message)
      }

      if (message.receiverId === viewerId && !message.isRead) {
        unreadCountByUser.set(otherUserId, (unreadCountByUser.get(otherUserId) ?? 0) + 1)
      }
    }

    const conversations = Array.from(conversationByUser.values())
      .map((lastMessage) =>
        mapConversation(
          lastMessage,
          unreadCountByUser.get(
            lastMessage.senderId === viewerId ? lastMessage.receiverId : lastMessage.senderId,
          ) ?? 0,
          viewerId,
        ),
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, take)

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error("Conversations fetch error:", error)
    return NextResponse.json({ error: "会話一覧の取得に失敗しました" }, { status: 500 })
  }
}

export async function POST() {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const unreadCount = await prisma.message.count({
      where: {
        receiverId: session.user.id,
        isRead: false,
      },
    })

    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error("Unread count fetch error:", error)
    return NextResponse.json({ error: "未読数の取得に失敗しました" }, { status: 500 })
  }
}
