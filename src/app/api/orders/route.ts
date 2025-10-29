import { NextRequest, NextResponse } from "next/server"
import { Prisma, OrderStatus } from "@prisma/client"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // "buyer" | "seller"
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    const skip = (page - 1) * limit

    const where: Prisma.OrderWhereInput = {}

    if (type === "buyer") {
      where.buyerId = session.user.id
    } else if (type === "seller") {
      where.sellerId = session.user.id
    } else {
      // 両方を含む
      where.OR = [
        { buyerId: session.user.id },
        { sellerId: session.user.id }
      ]
    }

    if (status) {
      const normalizedStatus = status.toUpperCase() as OrderStatus
      if ((Object.values(OrderStatus) as string[]).includes(normalizedStatus)) {
        where.status = normalizedStatus
      }
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          service: {
            select: {
              id: true,
              title: true,
              price: true,
              images: true,
            }
          },
          seller: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
            }
          },
          buyer: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
            }
          },
          messages: {
            select: {
              id: true,
              content: true,
              isRead: true,
              createdAt: true,
              senderId: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
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
    return NextResponse.json(
      { error: "注文一覧の取得に失敗しました" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const { serviceId, message, customPrice } = await request.json()

    if (!serviceId) {
      return NextResponse.json(
        { error: "サービスIDが必要です" },
        { status: 400 }
      )
    }

    // サービスの存在確認
    const service = await prisma.service.findUnique({
      where: { 
        id: serviceId,
        isActive: true 
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          }
        }
      }
    })

    if (!service) {
      return NextResponse.json(
        { error: "サービスが見つかりません" },
        { status: 404 }
      )
    }

    // 自分のサービスは購入できない
    if (service.userId === session.user.id) {
      return NextResponse.json(
        { error: "自分のサービスは購入できません" },
        { status: 400 }
      )
    }

    // 注文を作成
    const order = await prisma.order.create({
      data: {
        serviceId,
        sellerId: service.userId,
        buyerId: session.user.id,
        totalAmount: customPrice || service.price,
        message: message || null,
        deadline: new Date(Date.now() + service.deliveryDays * 24 * 60 * 60 * 1000),
      },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            price: true,
            deliveryDays: true,
            images: true,
          }
        },
        seller: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          }
        },
        buyer: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          }
        }
      }
    })

    // 初期メッセージを送信（オプション）
    if (message) {
      await prisma.message.create({
        data: {
          orderId: order.id,
          senderId: session.user.id,
          receiverId: service.userId,
          content: message,
        }
      })
    }

    return NextResponse.json(
      { 
        message: "注文を作成しました",
        order 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Order creation error:", error)
    return NextResponse.json(
      { error: "注文の作成に失敗しました" },
      { status: 500 }
    )
  }
}
