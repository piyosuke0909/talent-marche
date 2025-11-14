import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

const PAYMENT_METHODS = ["credit", "bank", "paypal"] as const
type PaymentMethod = typeof PAYMENT_METHODS[number]

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: orderId } = await params
    const body = (await request.json().catch(() => ({}))) as { paymentMethod?: PaymentMethod }
    const paymentMethod = body.paymentMethod

    if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { error: "有効な決済方法を指定してください" },
        { status: 400 }
      )
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        service: true,
        buyer: true,
        seller: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "注文が見つかりません" },
        { status: 404 }
      )
    }

    if (order.buyerId !== session.user.id) {
      return NextResponse.json(
        { error: "この注文にアクセスする権限がありません" },
        { status: 403 }
      )
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "この注文は既に処理されています" },
        { status: 400 }
      )
    }

    const paymentResult = await simulatePayment(paymentMethod, order.totalAmount)

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error || "決済に失敗しました" },
        { status: 400 }
      )
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: "IN_PROGRESS" },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            price: true,
            deliveryDays: true,
          },
        },
        seller: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
        buyer: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
      },
    })

    await prisma.message.create({
      data: {
        orderId,
        senderId: session.user.id,
        receiverId: order.sellerId,
        content: `購入者が「${order.service?.title ?? "サービス"}」の支払いを完了しました。作業を開始してください。`,
        isRead: false,
      },
    })

    return NextResponse.json(
      {
        message: "決済が完了しました",
        order: updatedOrder,
        paymentId: paymentResult.paymentId,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Payment processing error:", error)
    return NextResponse.json(
      { error: "決済処理に失敗しました" },
      { status: 500 }
    )
  }
}

async function simulatePayment(paymentMethod: PaymentMethod, amount: number) {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const isSuccess = Math.random() > 0.1

  if (isSuccess) {
    return {
      success: true,
      paymentId: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      transactionId: `txn_${Date.now()}`,
      amount,
      currency: "JPY",
      method: paymentMethod,
    }
  }

  return {
    success: false,
    error: "決済にエラーが発生しました。カード情報を確認してください。",
  }
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: orderId } = await params

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        buyerId: true,
        sellerId: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "注文が見つかりません" },
        { status: 404 }
      )
    }

    if (order.buyerId !== session.user.id && order.sellerId !== session.user.id) {
      return NextResponse.json(
        { error: "この注文にアクセスする権限がありません" },
        { status: 403 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Payment status fetch error:", error)
    return NextResponse.json(
      { error: "決済状況の取得に失敗しました" },
      { status: 500 }
    )
  }
}