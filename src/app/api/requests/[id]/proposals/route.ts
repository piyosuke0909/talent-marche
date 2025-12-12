
import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface RouteParams {
    params: Promise<{
        id: string
    }>
}

// GET: List proposals (Owner sees all, others?? Maybe just owner for now)
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const session = await getServerAuthSession()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "認証が必要です" },
                { status: 401 }
            )
        }

        // Fetch the request to check ownership
        const requestDetail = await prisma.request.findUnique({
            where: { id },
            select: { userId: true }
        })

        if (!requestDetail) {
            return NextResponse.json(
                { error: "依頼が見つかりません" },
                { status: 404 }
            )
        }

        // Only owner can view all proposals
        if (requestDetail.userId !== session.user.id) {
            return NextResponse.json(
                { error: "権限がありません" },
                { status: 403 }
            )
        }

        const proposals = await prisma.proposal.findMany({
            where: { requestId: id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        image: true,
                        bio: true,
                        isVerified: true,
                        createdAt: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ proposals })

    } catch (error) {
        console.error("Proposals fetch error:", error)
        return NextResponse.json(
            { error: "提案の取得に失敗しました" },
            { status: 500 }
        )
    }
}

// POST: Submit a proposal
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

        const { message, price, deliveryDays } = await request.json()

        if (!message || !price || !deliveryDays) {
            return NextResponse.json(
                { error: "必須項目が入力されていません" },
                { status: 400 }
            )
        }

        // Verify request exists
        const requestDetail = await prisma.request.findUnique({
            where: { id }
        })

        if (!requestDetail) {
            return NextResponse.json(
                { error: "依頼が見つかりません" },
                { status: 404 }
            )
        }

        // Prevent owner from proposing to themselves
        if (requestDetail.userId === session.user.id) {
            return NextResponse.json(
                { error: "自分自身の依頼には提案できません" },
                { status: 400 }
            )
        }

        // Check if already proposed
        const existing = await prisma.proposal.findUnique({
            where: {
                requestId_userId: {
                    requestId: id,
                    userId: session.user.id
                }
            }
        })

        if (existing) {
            return NextResponse.json(
                { error: "既に提案済みです" },
                { status: 400 }
            )
        }

        const proposal = await prisma.proposal.create({
            data: {
                requestId: id,
                userId: session.user.id,
                message,
                price: parseInt(price),
                deliveryDays: parseInt(deliveryDays),
            }
        })

        return NextResponse.json({
            message: "提案を送信しました",
            proposal
        }, { status: 201 })

    } catch (error) {
        console.error("Proposal submission error:", error)
        return NextResponse.json(
            { error: "提案の送信に失敗しました" },
            { status: 500 }
        )
    }
}
