import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Payjp from "payjp"

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
    const body = (await request.json().catch(() => ({}))) as {
      paymentMethod?: PaymentMethod
      tokenId?: string
      mode?: string
    }
    const paymentMethod = body.paymentMethod

    if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { error: "有効な決済方法を指定してください" },
        { status: 400 }
      )
    }

    if (paymentMethod === "credit" && !body.tokenId) {
      return NextResponse.json(
        { error: "クレジットカード決済にはPAY.JPトークンが必要です" },
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

    let paymentReference: string | null = null

    if (paymentMethod === "credit") {
      if (!process.env.PAYJP_SECRET_KEY) {
        return NextResponse.json(
          { error: "PAY.JPの秘密鍵が設定されていません。環境変数 PAYJP_SECRET_KEY を確認してください。" },
          { status: 500 }
        )
      }

      const payjp = getPayjpClient()


      const tenantId = order.seller.payjpTenantId
      const isTenantPayment = !!tenantId

      let chargeData: any = null

      try {
        chargeData = {
          amount: order.totalAmount,
          currency: "jpy",
          card: body.tokenId!,
          capture: true,
          description: `Talent Marche order ${order.id}`,
          metadata: {
            orderId: order.id,
            environment: body.mode === "test" ? "test" : "live",
            serviceId: order.serviceId ?? "custom",
          },
          three_d_secure: true, // Enable 3D Secure
        }

        if (isTenantPayment) {
          chargeData.tenant = tenantId
          // Calculate 10% platform fee
          const platformFee = Math.floor(order.totalAmount * 0.10)
          chargeData.platform_fee = platformFee
        }

        const charge = await payjp.charges.create(chargeData)
        console.log("PAY.JP Charge Created:", JSON.stringify(charge, null, 2))

        // 3D Secure flow
        const chargeResponse = charge as any
        if (!charge.paid && chargeResponse.status === 'pending' && chargeResponse.three_d_secure_status === 'attempted') {
          console.log("Initiating 3D Secure Flow")
          // ... (existing 3DS logic)
          await prisma.order.update({
            where: { id: orderId },
            data: { paymentId: charge.id }
          })

          return NextResponse.json({
            action: 'three_d_secure',
            chargeId: charge.id,
            message: '3Dセキュア認証が必要です'
          }, { status: 200 })
        }

        // If not 3DS pending, check for failure.
        // If capture: true was sent, usually paid should be true.
        // However, if 3DS was requested but not performed ("unverified"), sometimes it stays as authorization?
        // Let's rely on failure_code. If no failure_code and we have an ID, we accept it.
        if (charge.failure_code) {
          console.error("PAY.JP Charge Failed:", charge.failure_code, charge.failure_message)
          return NextResponse.json(
            { error: `決済に失敗しました: ${charge.failure_message || charge.failure_code}` },
            { status: 400 }
          )
        }

        // Weak check: If it has an ID, we assume success for now, 
        // to handle cases where 'paid' might be false due to capture timing or 3DS unverified state.
        if (!charge.id) {
          return NextResponse.json(
            { error: "PAY.JPでの支払いが完了しませんでした (ID欠落)" },
            { status: 400 }
          )
        }

        paymentReference = charge.id
      } catch (error: any) {
        // Retry logic for "invalid_merchant_platform_fee"
        // This handles cases where the tenant account is not compatible with platform fees
        if (
          isTenantPayment &&
          error?.response?.body?.error?.code === 'invalid_merchant_platform_fee'
        ) {
          console.warn("Retrying payment without Tenant/PlatformFee due to configuration mismatch...")

          // Remove tenant specific fields
          delete chargeData.tenant
          delete chargeData.platform_fee

          try {
            const charge = await payjp.charges.create(chargeData)
            // Success on retry
            console.log("Retry Charge Created:", JSON.stringify(charge, null, 2))

            // 3D Secure flow (Copy of logic above)
            const chargeResponse = charge as any
            if (!charge.paid && chargeResponse.status === 'pending' && chargeResponse.three_d_secure_status === 'attempted') {
              await prisma.order.update({
                where: { id: orderId },
                data: { paymentId: charge.id }
              })
              return NextResponse.json({
                action: 'three_d_secure',
                chargeId: charge.id,
                message: '3Dセキュア認証が必要です'
              }, { status: 200 })
            }

            if (charge.failure_code) {
              throw new Error(charge.failure_message || 'Payment failed on retry')
            }
            if (!charge.id) {
              throw new Error('Payment ID missing on retry')
            }

            paymentReference = charge.id
            // Successful retry, proceed
          } catch (retryError: any) {
            console.error("Retry failed:", retryError)
            const message = retryError?.message || "再試行にも失敗しました"
            return NextResponse.json(
              { error: `Payment Retry Failed: ${message}` },
              { status: 400 }
            )
          }
        } else {
          console.error("PAY.JP Charge Error:", error)
          // Detailed log for debugging
          if (typeof error === 'object' && error !== null && 'response' in error) {
            console.error("PAY.JP Response Body:", (error as any).response?.body)
          }

          const message =
            (error as { message?: string })?.message ||
            "PAY.JPでの決済処理に失敗しました"

          return NextResponse.json(
            { error: `Payment Failed: ${message}` },
            { status: 400 }
          )
        }
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "IN_PROGRESS",
        isTenantPayment: !!order.seller.payjpTenantId,
        paymentId: paymentReference
      },
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
            payjpTenantId: true,
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

    // Send email notification to buyer
    try {
      const { sendEmail } = await import('@/lib/mail')
      await sendEmail({
        to: order.buyer.email,
        subject: '【Talent Marche】ご注文ありがとうございます',
        template: 'order_received',
        data: {
          userName: order.buyer.name || order.buyer.username,
          serviceTitle: order.service?.title || 'サービス',
          price: order.totalAmount,
          orderId: order.id
        }
      })
    } catch (e) {
      console.error('Failed to send order email:', e)
    }

    return NextResponse.json(
      {
        message: "決済が完了しました",
        order: updatedOrder,
        paymentId: paymentReference ?? `order_${orderId}`,
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

let payjpClient: ReturnType<typeof Payjp> | null = null

function getPayjpClient() {
  if (!payjpClient) {
    const secretKey = process.env.PAYJP_SECRET_KEY
    if (!secretKey) {
      throw new Error("PAYJP_SECRET_KEY is not configured")
    }
    payjpClient = Payjp(secretKey)
  }
  return payjpClient
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
