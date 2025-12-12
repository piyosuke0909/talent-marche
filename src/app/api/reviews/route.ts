import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
    try {
        const session = await getServerAuthSession()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { orderId, rating, comment } = body

        if (!orderId || !rating) {
            return NextResponse.json({ error: "OrderId and rating are required" }, { status: 400 })
        }

        // Verify order exists and user is involved
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: true,
                seller: true,
                service: true
            }
        })

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }

        // Determine roles
        const isBuyer = order.buyerId === session.user.id
        const isSeller = order.sellerId === session.user.id

        if (!isBuyer && !isSeller) {
            return NextResponse.json({ error: "You are not a party to this order" }, { status: 403 })
        }

        // Determine reviewee
        const revieweeId = isBuyer ? order.sellerId : order.buyerId

        // Check if review already exists
        const existingReview = await prisma.review.findUnique({
            where: {
                orderId_reviewerId: {
                    orderId,
                    reviewerId: session.user.id
                }
            }
        })

        if (existingReview) {
            return NextResponse.json({ error: "You have already reviewed this order" }, { status: 409 })
        }

        // Create review
        const review = await prisma.review.create({
            data: {
                orderId,
                serviceId: order.serviceId, // associated service
                reviewerId: session.user.id,
                revieweeId,
                rating: Number(rating),
                comment: comment || ""
            }
        })

        return NextResponse.json(review, { status: 201 })

    } catch (error) {
        console.error("Review creation error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
