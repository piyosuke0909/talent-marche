
import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface RouteParams {
    params: Promise<{
        id: string // Proposal ID
    }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const session = await getServerAuthSession()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "認証が必要です" },
                { status: 401 }
            )
        }

        // Fetch proposal with request details
        const proposal = await prisma.proposal.findUnique({
            where: { id },
            include: {
                request: true
            }
        })

        if (!proposal) {
            return NextResponse.json(
                { error: "提案が見つかりません" },
                { status: 404 }
            )
        }

        // Verify currentUser is the Request Owner
        if (proposal.request.userId !== session.user.id) {
            return NextResponse.json(
                { error: "この提案を採用する権限がありません" },
                { status: 403 }
            )
        }

        // Check if request is still active
        if (!proposal.request.isActive) {
            return NextResponse.json(
                { error: "この依頼は既に締め切られています" },
                { status: 400 }
            )
        }

        // Create Order
        // NOTE: In a real app, this might redirect to a payment checkout page first.
        // Here, we'll create a PENDING order and assume the flow continues to payment.
        // Or, if it's a "Reverse Auction", the buyer (Request Owner) needs to pay the Seller (Proposer).

        const order = await prisma.order.create({
            data: {
                buyerId: session.user.id, // Request Owner pays
                sellerId: proposal.userId, // Proposer works
                // serviceId: ??? No serviceId, it's a request. 
                // We might need to make serviceId optional in Order or add requestId.
                // For now, let's leave serviceId null, or we can handle it.
                // Prisma schema says: serviceId String? @db.ObjectId

                // We might want to store the proposal/request link in the order for context.
                // For now, we will just use the message to indicate it's from a request.

                totalAmount: proposal.price,
                status: "PENDING", // Waiting for payment
                deadline: new Date(Date.now() + proposal.deliveryDays * 24 * 60 * 60 * 1000),
                message: `依頼「${proposal.request.title}」への提案からの注文です。`,
            }
        })

        // Optionally mark request as inactive? 
        // Or can you accept multiple proposals? Usually one.
        await prisma.request.update({
            where: { id: proposal.request.id },
            data: { isActive: false }
        })

        return NextResponse.json({
            message: "提案を採用し、注文を作成しました",
            orderId: order.id
        })

    } catch (error) {
        console.error("Proposal accept error:", error)
        return NextResponse.json(
            { error: "提案の採用処理に失敗しました" },
            { status: 500 }
        )
    }
}
