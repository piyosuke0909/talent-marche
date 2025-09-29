import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    // ユーザーが関わっている全てのメッセージから、会話相手を抽出
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          }
        },
        order: {
          select: {
            id: true,
            status: true,
            service: {
              select: {
                id: true,
                title: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 会話相手ごとに最新のメッセージをグループ化
    const conversationsMap = new Map()

    messages.forEach(message => {
      const otherUserId = message.senderId === session.user.id 
        ? message.receiverId 
        : message.senderId
      
      const otherUser = message.senderId === session.user.id 
        ? message.receiver 
        : message.sender

      // まだこのユーザーとの会話が記録されていない場合のみ追加
      if (!conversationsMap.has(otherUserId)) {
        const unreadCount = messages.filter(m => 
          m.senderId === otherUserId && 
          m.receiverId === session.user.id && 
          !m.isRead
        ).length

        conversationsMap.set(otherUserId, {
          userId: otherUserId,
          user: otherUser,
          lastMessage: message,
          unreadCount,
          updatedAt: message.createdAt
        })
      }
    })

    // Map を配列に変換し、最新のメッセージ順にソート
    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    return NextResponse.json({ conversations })

  } catch (error) {
    console.error("Conversations fetch error:", error)
    return NextResponse.json(
      { error: "会話一覧の取得に失敗しました" },
      { status: 500 }
    )
  }
}

// 未読メッセージ数を取得
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const unreadCount = await prisma.message.count({
      where: {
        receiverId: session.user.id,
        isRead: false
      }
    })

    return NextResponse.json({ unreadCount })

  } catch (error) {
    console.error("Unread count fetch error:", error)
    return NextResponse.json(
      { error: "未読数の取得に失敗しました" },
      { status: 500 }
    )
  }
}
