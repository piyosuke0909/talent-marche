import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

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
    const body = await request.json()
    const { paymentMethod, amount } = body

    if (!paymentMethod || !amount) {
      return NextResponse.json(
        { error: "決済方法と金額は必須です" },
        { status: 400 }
      )
    }

    // 注文の存在確認
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        service: true,
        buyer: true,
        seller: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: "注文が見つかりません" },
        { status: 404 }
      )
    }

    // 購入者本人かチェック
    if (order.buyerId !== session.user.id) {
      return NextResponse.json(
        { error: "この注文にアクセスする権限がありません" },
        { status: 403 }
      )
    }

    // 注文がPENDING状態かチェック
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { error: "この注文は既に処理されています" },
        { status: 400 }
      )
    }

    // 実際の決済処理はここで行う（今回はシミュレーション）
    // Stripe, PayPal, 銀行API などを利用
    const paymentResult = await simulatePayment(paymentMethod, amount)

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error || "決済に失敗しました" },
        { status: 400 }
      )
    }

    // 注文状態を更新
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'IN_PROGRESS',
      },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            price: true,
            deliveryDays: true,
          }
        },
        seller: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true
          }
        },
        buyer: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true
          }
        }
      }
    })

    // 売り手に通知メッセージを作成
    await prisma.message.create({
      data: {
        orderId: orderId,
        senderId: 'system', // システムメッセージ
        receiverId: order.sellerId,
        content: `新しい注文が入りました！「${order.service?.title ?? 'サービス'}」の作業を開始してください。`,
        isRead: false,
      }
    })

    return NextResponse.json({
      message: "決済が完了しました",
      order: updatedOrder,
      paymentId: paymentResult.paymentId
    })

  } catch (error) {
    console.error("Payment processing error:", error)
    return NextResponse.json(
      { error: "決済処理に失敗しました" },
      { status: 500 }
    )
  }
}

// 決済処理のシミュレーション関数
async function simulatePayment(paymentMethod: string, amount: number) {
  // 実際のプロダクションでは、ここでStripe、PayPal、銀行APIなどを呼び出す
  
  // シミュレーション用の遅延
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // 成功率90%でシミュレーション（デモ用）
  const isSuccess = Math.random() > 0.1
  
  if (isSuccess) {
    return {
      success: true,
      paymentId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId: `txn_${Date.now()}`,
      amount: amount,
      currency: 'JPY',
      method: paymentMethod
    }
  } else {
    return {
      success: false,
      error: '決済処理中にエラーが発生しました。カード情報を確認してください。'
    }
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

    // 注文の支払い状況を取得
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        buyerId: true,
        sellerId: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: "注文が見つかりません" },
        { status: 404 }
      )
    }

    // アクセス権限チェック
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
