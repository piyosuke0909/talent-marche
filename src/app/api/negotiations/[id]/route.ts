
import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/mail"

// PUT: Accept or Reject Negotiation (Seller only, mostly)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerAuthSession()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { status } = body // ACCEPTED, REJECTED

        if (!['ACCEPTED', 'REJECTED'].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 })
        }

        const negotiation = await prisma.priceNegotiation.findUnique({
            where: { id },
            include: {
                service: true,
                user: true
            }
        })

        if (!negotiation) {
            return NextResponse.json({ error: "Negotiation not found" }, { status: 404 })
        }

        // Only the seller of the service can accept/reject
        if (negotiation.service.userId !== session.user.id) {
            return NextResponse.json({ error: "Only the seller can manage this negotiation" }, { status: 403 })
        }

        const updated = await prisma.priceNegotiation.update({
            where: { id },
            data: { status }
        })

        // If Accepted, create a PENDING Order and notify buyer
        if (status === 'ACCEPTED') {
            // Create Order
            const order = await prisma.order.create({
                data: {
                    serviceId: negotiation.serviceId,
                    sellerId: session.user.id,
                    buyerId: negotiation.userId,
                    totalAmount: negotiation.price,
                    status: 'PENDING',
                    isTenantPayment: false, // Default
                }
            })

            // Create System Message to Buyer
            await prisma.message.create({
                data: {
                    senderId: session.user.id,
                    receiverId: negotiation.userId,
                    content: `値下げ交渉が承認されました！\n\n対象サービス: ${negotiation.service.title}\n合意価格: ¥${negotiation.price.toLocaleString()}\n\n以下のリンクから購入手続きを進めてください。\n/orders/${order.id}`,
                    isRead: false
                    // No orderId linked to message? Maybe link it.
                }
            })

            // Create Notification
            await prisma.notification.create({
                data: {
                    userId: negotiation.userId,
                    type: 'SUCCESS',
                    title: '値下げ交渉が承認されました',
                    message: `${negotiation.service.title}の交渉が承認されました。`,
                    link: `/orders/${order.id}`
                }
            })

            // Send Email to Buyer
            if (negotiation.user.email) {
                await sendEmail({
                    to: negotiation.user.email,
                    subject: '【Talent Marche】値下げ交渉が承認されました！',
                    template: 'negotiation_accepted',
                    data: {
                        buyerName: negotiation.user.name || 'ユーザー',
                        sellerName: session.user.name || 'ユーザー',
                        serviceTitle: negotiation.service.title,
                        price: negotiation.price,
                        orderId: order.id
                    }
                }).catch((err: unknown) => console.error("Failed to send email:", err))
            }
        } else if (status === 'REJECTED') {
            // Create Notification for rejection
            await prisma.notification.create({
                data: {
                    userId: negotiation.userId,
                    type: 'INFO',
                    title: '値下げ交渉が拒否されました',
                    message: `${negotiation.service.title}の交渉が拒否されました。`,
                    link: `/services/${negotiation.serviceId}`
                }
            })
        }

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Error updating negotiation:", error)
        return NextResponse.json(
            { error: "交渉の更新に失敗しました" },
            { status: 500 }
        )
    }
}
