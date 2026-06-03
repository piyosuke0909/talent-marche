// 注文API: 注文一覧取得（GET）・注文作成（POST）処理

import { NextRequest, NextResponse } from "next/server"
import { Prisma, OrderStatus } from "@prisma/client"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createNotification } from "@/lib/notifications"

// 注文一覧取得処理: ログインユーザーの注文を取得（買い手・売り手フィルター対応）
export async function GET(request: NextRequest) {
  try {
    // 認証チェック処理
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    // クエリパラメータ取得処理
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")   // "buyer"=購入した注文 / "seller"=受けた注文
    const status = searchParams.get("status") // ステータスフィルター
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    // フィルター条件の組み立て処理
    const where: Prisma.OrderWhereInput = {}

    if (type === "buyer") {
      where.buyerId = session.user.id   // 購入した注文のみ
    } else if (type === "seller") {
      where.sellerId = session.user.id  // 受注した注文のみ
    } else {
      // 未指定の場合は自分が関わる全注文を取得
      where.OR = [
        { buyerId: session.user.id },
        { sellerId: session.user.id }
      ]
    }

    // ステータスフィルター処理（有効な値のみ適用）
    if (status) {
      const normalizedStatus = status.toUpperCase() as OrderStatus
      if ((Object.values(OrderStatus) as string[]).includes(normalizedStatus)) {
        where.status = normalizedStatus
      }
    }

    // 注文一覧・総件数の並列取得処理
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          service: {
            select: { id: true, title: true, price: true, images: true }
          },
          seller: {
            select: { id: true, username: true, name: true, image: true }
          },
          buyer: {
            select: { id: true, username: true, name: true, image: true }
          },
          messages: {
            select: { id: true, content: true, isRead: true, createdAt: true, senderId: true },
            orderBy: { createdAt: "desc" },
            take: 1, // 最新のメッセージのみ取得
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where })
    ])

    return NextResponse.json({
      orders,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    })

  } catch (error) {
    console.error("Orders fetch error:", error)
    return NextResponse.json({ error: "注文一覧の取得に失敗しました" }, { status: 500 })
  }
}

// 注文作成処理: サービスを購入して注文レコードを生成する
export async function POST(request: NextRequest) {
  try {
    // 認証チェック処理
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { serviceId, message, customPrice } = await request.json()

    if (!serviceId) {
      return NextResponse.json({ error: "サービスIDが必要です" }, { status: 400 })
    }

    // サービス存在確認処理（非公開サービスは購入不可）
    const service = await prisma.service.findUnique({
      where: { id: serviceId, isActive: true },
      include: {
        user: { select: { id: true, username: true, name: true, email: true } }
      }
    })

    if (!service) {
      return NextResponse.json({ error: "サービスが見つかりません" }, { status: 404 })
    }

    // 自己購入防止チェック処理
    if (service.userId === session.user.id) {
      return NextResponse.json({ error: "自分のサービスは購入できません" }, { status: 400 })
    }

    // 注文レコード作成処理
    // 納品期限 = 現在時刻 + 納品日数
    const order = await prisma.order.create({
      data: {
        serviceId,
        sellerId: service.userId,
        buyerId: session.user.id,
        totalAmount: customPrice || service.price, // 価格交渉済みの場合は customPrice を使用
        message: message || null,
        deadline: new Date(Date.now() + service.deliveryDays * 24 * 60 * 60 * 1000),
      },
      include: {
        service: { select: { id: true, title: true, price: true, deliveryDays: true, images: true } },
        seller: { select: { id: true, username: true, name: true, image: true } },
        buyer:  { select: { id: true, username: true, name: true } }
      }
    })

    // 出品者への注文通知送信処理
    try {
      await createNotification({
        userId: service.userId,
        title: '商品が購入されました',
        message: `${session.user.name || session.user.username || '購入者'}さんが「${service.title}」を購入しました。`,
        type: 'ORDER',
        link: `/orders/${order.id}`
      })
    } catch (e) {
      console.error('Notification failed', e)
    }

    return NextResponse.json(order, { status: 201 })

  } catch (error) {
    console.error("Order creation error:", error)
    return NextResponse.json({ error: "注文の作成に失敗しました" }, { status: 500 })
  }
}
