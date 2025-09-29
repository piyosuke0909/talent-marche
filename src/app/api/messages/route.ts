import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Prisma } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")
    const conversationId = searchParams.get("conversationId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const skip = (page - 1) * limit

    const where: Prisma.MessageWhereInput = {
      OR: [
        { senderId: session.user.id },
        { receiverId: session.user.id }
      ]
    }

    if (orderId) {
      where.orderId = orderId
    }

    if (conversationId) {
      // 特定のユーザーとの会話
      const otherUserId = conversationId
      where.OR = [
        { senderId: session.user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: session.user.id }
      ]
    }

    const messages = await prisma.message.findMany({
      where,
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
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    })

    // 受信したメッセージを既読にする
    const unreadMessageIds = messages
      .filter(msg => msg.receiverId === session.user.id && !msg.isRead)
      .map(msg => msg.id)

    if (unreadMessageIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadMessageIds } },
        data: { isRead: true }
      })
    }

    return NextResponse.json({
      messages: messages.map(msg => ({
        ...msg,
        isRead: msg.receiverId === session.user.id ? true : msg.isRead
      }))
    })

  } catch (error) {
    console.error("Messages fetch error:", error)
    return NextResponse.json(
      { error: "メッセージの取得に失敗しました" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const { receiverId, content, orderId } = await request.json()

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: "受信者IDとメッセージ内容が必要です" },
        { status: 400 }
      )
    }

    // 自分自身にメッセージは送れない
    if (receiverId === session.user.id) {
      return NextResponse.json(
        { error: "自分自身にメッセージは送信できません" },
        { status: 400 }
      )
    }

    // 受信者の存在確認
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    })

    if (!receiver) {
      return NextResponse.json(
        { error: "受信者が見つかりません" },
        { status: 404 }
      )
    }

    // 注文IDが指定されている場合、注文の関係者かチェック
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      })

      if (!order) {
        return NextResponse.json(
          { error: "注文が見つかりません" },
          { status: 404 }
        )
      }

      if (order.buyerId !== session.user.id && order.sellerId !== session.user.id) {
        return NextResponse.json(
          { error: "この注文に関連するメッセージを送信する権限がありません" },
          { status: 403 }
        )
      }

      if (order.buyerId !== receiverId && order.sellerId !== receiverId) {
        return NextResponse.json(
          { error: "指定された受信者はこの注文に関連していません" },
          { status: 400 }
        )
      }
    }

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content,
        orderId: orderId || null,
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
      }
    })

    return NextResponse.json(
      { 
        message: "メッセージを送信しました",
        data: message 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Message creation error:", error)
    return NextResponse.json(
      { error: "メッセージの送信に失敗しました" },
      { status: 500 }
    )
  }
}
