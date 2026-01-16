
import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/mail"

// GET: List negotiations for the current user (either as buyer or seller)
export async function GET(request: Request) {
    try {
        const session = await getServerAuthSession()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // 'sent' or 'received'

        let whereClause: any = {}

        if (type === 'received') {
            // As seller: find negotiations for my services
            whereClause = {
                service: {
                    userId: session.user.id
                }
            }
        } else {
            // As buyer: find my sent negotiations (default)
            whereClause = {
                userId: session.user.id
            }
        }

        const negotiations = await prisma.priceNegotiation.findMany({
            where: whereClause,
            include: {
                service: {
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        images: true,
                        userId: true, // Seller ID
                        user: {
                            select: {
                                name: true,
                                image: true
                            }
                        }
                    }
                },
                user: { // Buyer info (for seller view)
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(negotiations)
    } catch (error) {
        console.error("Error fetching negotiations:", error)
        return NextResponse.json(
            { error: "交渉一覧の取得に失敗しました" },
            { status: 500 }
        )
    }
}

// POST: Create a new negotiation offer
export async function POST(request: Request) {
    try {
        const session = await getServerAuthSession()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { serviceId, price } = body

        if (!serviceId || !price) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Check if service exists
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: { user: true }
        })

        if (!service) {
            return NextResponse.json({ error: "Service not found" }, { status: 404 })
        }

        // Prevent negotiating own service
        if (service.userId === session.user.id) {
            return NextResponse.json({ error: "Cannot negotiate your own service" }, { status: 400 })
        }

        // Check if existing negotiation exists
        const existing = await prisma.priceNegotiation.findUnique({
            where: {
                serviceId_userId: {
                    serviceId,
                    userId: session.user.id
                }
            }
        })

        if (existing) {
            if (existing.status === 'PENDING') {
                return NextResponse.json({ error: "Already have a pending negotiation" }, { status: 400 })
            }
            // If rejected or accepted, maybe allow new one? For now, update existing if not pending?
            // Let's simpler: Update existing to new price and set status PENDING if not ACCEPTED.
            if (existing.status !== 'ACCEPTED') {
                const updated = await prisma.priceNegotiation.update({
                    where: { id: existing.id },
                    data: {
                        price,
                        status: 'PENDING'
                    }
                })
                return NextResponse.json(updated)
            }
            return NextResponse.json({ error: "Already accepted" }, { status: 400 })
        }

        const negotiation = await prisma.priceNegotiation.create({
            data: {
                serviceId,
                userId: session.user.id,
                price,
                status: 'PENDING'
            }
        })

        // Send email to seller
        if (service.user.email) {
            await sendEmail({
                to: service.user.email,
                subject: '【Talent Marche】値下げ交渉が届きました',
                template: 'negotiation_received',
                data: {
                    sellerName: service.user.name || 'ユーザー',
                    buyerName: session.user.name || 'ユーザー',
                    serviceTitle: service.title,
                    currentPrice: service.price,
                    offerPrice: price
                }
            }).catch(err => console.error("Failed to send email:", err))
        }

        return NextResponse.json(negotiation)
    } catch (error) {
        console.error("Error creating negotiation:", error)
        return NextResponse.json(
            { error: "交渉の送信に失敗しました" },
            { status: 500 }
        )
    }
}
