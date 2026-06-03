// メッセージAPI: メッセージ一覧取得（GET）・送信（POST）処理

import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

// ページサイズ設定
const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

// メッセージ取得時に含めるリレーション定義
const messageInclude = {
  sender:   { select: { id: true, username: true, name: true, image: true } },
  receiver: { select: { id: true, username: true, name: true, image: true } },
  order: {
    select: {
      id: true,
      status: true,
      service: { select: { id: true, title: true } },
    },
  },
} as const

type MessageWithRelations = Prisma.MessageGetPayload<{ include: typeof messageInclude }>

// メッセージオブジェクト整形処理: 閲覧者が受信者の場合は既読扱いにする
function mapMessage(message: MessageWithRelations, viewerId: string) {
  return {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    isRead: message.receiverId === viewerId ? true : message.isRead, // 閲覧者＝受信者なら既読
    senderId: message.senderId,
    receiverId: message.receiverId,
    sender: message.sender,
    receiver: message.receiver,
    order: message.order
      ? {
          id: message.order.id,
          status: message.order.status,
          service: message.order.service
            ? { id: message.order.service.id, title: message.order.service.title }
            : null,
        }
      : null,
  }
}

// メッセージ一覧取得処理: 会話・注文単位でフィルタリング、カーソルページネーション対応
export async function GET(request: NextRequest) {
  try {
    // 認証チェック処理
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const viewerId = session.user.id
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId") // 特定ユーザーとの会話ID
    const orderId        = searchParams.get("orderId")        // 注文内メッセージの絞り込み
    const cursor         = searchParams.get("cursor")         // カーソルページネーション用
    const parsedLimit    = Number.parseInt(searchParams.get("limit") || "", 10)

    // ページサイズの正規化（1〜MAX_PAGE_SIZE の範囲に収める）
    const take = Number.isNaN(parsedLimit)
      ? DEFAULT_PAGE_SIZE
      : Math.min(Math.max(parsedLimit, 1), MAX_PAGE_SIZE)

    // 自分が関わるメッセージのみ取得するフィルター
    const where: Prisma.MessageWhereInput = {
      OR: [{ senderId: viewerId }, { receiverId: viewerId }],
    }

    // 特定ユーザーとの会話に絞り込む処理
    if (conversationId) {
      where.OR = [
        { senderId: viewerId, receiverId: conversationId },
        { senderId: conversationId, receiverId: viewerId },
      ]
    }

    // 注文内メッセージに絞り込む処理
    if (orderId) {
      where.orderId = orderId
    }

    // カーソルページネーションを使ったメッセージ取得処理（1件多く取得してhasMoreを判定）
    const messages = await prisma.message.findMany({
      where,
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    // 次ページ判定・並び替え処理（古い順に戻す）
    const hasMore = messages.length > take
    const trimmed = hasMore ? messages.slice(0, take) : messages
    const ordered = trimmed.slice().reverse() // 降順→昇順に並び替え

    // 未読メッセージの既読更新処理
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
      nextCursor: hasMore ? trimmed[trimmed.length - 1].id : null, // 次ページ用カーソル
    })
  } catch (error) {
    console.error("Messages fetch error:", error)
    return NextResponse.json({ error: "メッセージの取得に失敗しました" }, { status: 500 })
  }
}

// メッセージ送信処理: 指定ユーザーへメッセージを送る（注文に紐づけることも可）
export async function POST(request: NextRequest) {
  try {
    // 認証チェック処理
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const viewerId = session.user.id
    const { receiverId, content, orderId } = await request.json()

    // 必須項目バリデーション処理
    if (!receiverId || typeof receiverId !== "string") {
      return NextResponse.json({ error: "受信者が指定されていません" }, { status: 400 })
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "メッセージ内容を入力してください" }, { status: 400 })
    }
    // 自己送信防止チェック処理
    if (receiverId === viewerId) {
      return NextResponse.json({ error: "自分自身には送信できません" }, { status: 400 })
    }

    // 受信者存在確認処理
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    })
    if (!receiver) {
      return NextResponse.json({ error: "受信者が見つかりません" }, { status: 404 })
    }

    // 注文ID指定時: 注文への参加確認処理
    let relatedOrderId: string | null = null
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, buyerId: true, sellerId: true },
      })
      if (!order) {
        return NextResponse.json({ error: "指定された取引が見つかりません" }, { status: 404 })
      }
      // 送受信者が注文の当事者かチェック
      if (![order.buyerId, order.sellerId].includes(viewerId)) {
        return NextResponse.json({ error: "この取引に参加していません" }, { status: 403 })
      }
      if (![order.buyerId, order.sellerId].includes(receiverId)) {
        return NextResponse.json({ error: "受信者はこの取引に参加していません" }, { status: 400 })
      }
      relatedOrderId = order.id
    }

    // メッセージ作成処理
    const message = await prisma.message.create({
      data: {
        senderId: viewerId,
        receiverId,
        content: content.trim(),
        orderId: relatedOrderId,
      },
      include: messageInclude,
    })

    return NextResponse.json({ message: mapMessage(message, viewerId) }, { status: 201 })
  } catch (error) {
    console.error("Message creation error:", error)
    return NextResponse.json({ error: "メッセージの送信に失敗しました" }, { status: 500 })
  }
}
