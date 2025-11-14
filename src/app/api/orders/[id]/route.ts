import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const { id } = await params

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
            tags: true,
          }
        },
        seller: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            bio: true,
          }
        },
        buyer: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            bio: true,
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              }
            }
          },
          orderBy: { createdAt: "asc" },
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: "注文が見つかりません" },
        { status: 404 }
      )
    }

    // 注文の関係者かチェック
    if (order.buyerId !== session.user.id && order.sellerId !== session.user.id) {
      return NextResponse.json(
        { error: "この注文を閲覧する権限がありません" },
        { status: 403 }
      )
    }

    return NextResponse.json(order)

  } catch (error) {
    console.error("Order fetch error:", error)
    return NextResponse.json(
      { error: "注文の取得に失敗しました" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const { status } = await request.json()

    if (!status) {
      return NextResponse.json(
        { error: "ステータスが必要です" },
        { status: 400 }
      )
    }

    const { id } = await params

    // 注文の存在確認と権限チェック
    const existingOrder = await prisma.order.findUnique({
      where: { id }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: "注文が見つかりません" },
        { status: 404 }
      )
    }

    // ステータス変更権限をチェック
    const canUpdateStatus = (
      (existingOrder.sellerId === session.user.id && 
       ["IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) ||
      (existingOrder.buyerId === session.user.id && 
       ["CANCELLED"].includes(status) && existingOrder.status === "PENDING")
    )

    if (!canUpdateStatus) {
      return NextResponse.json(
        { error: "このステータス変更を行う権限がありません" },
        { status: 403 }
      )
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        service: {
          select: {
            id: true,
            title: true,
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

    return NextResponse.json({
      message: "注文ステータスを更新しました",
      order
    })

  } catch (error) {
    console.error("Order update error:", error)
    return NextResponse.json(
      { error: "注文の更新に失敗しました" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const { id } = await params

    // 注文の存在確認と権限チェック
    const existingOrder = await prisma.order.findUnique({
      where: { id }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: "注文が見つかりません" },
        { status: 404 }
      )
    }

    // 注文のキャンセル（削除ではなくステータス変更）
    if (existingOrder.buyerId !== session.user.id && existingOrder.sellerId !== session.user.id) {
      return NextResponse.json(
        { error: "この注文をキャンセルする権限がありません" },
        { status: 403 }
      )
    }

    if (existingOrder.status === "COMPLETED") {
      return NextResponse.json(
        { error: "完了した注文はキャンセルできません" },
        { status: 400 }
      )
    }

    await prisma.order.update({
      where: { id },
      data: { status: "CANCELLED" }
    })

    return NextResponse.json({
      message: "注文をキャンセルしました"
    })

  } catch (error) {
    console.error("Order cancel error:", error)
    return NextResponse.json(
      { error: "注文のキャンセルに失敗しました" },
      { status: 500 }
    )
  }
}
