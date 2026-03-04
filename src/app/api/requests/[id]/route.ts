
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
        const { id } = await params
        const session = await getServerAuthSession()

        const requestDetail = await prisma.request.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        image: true,
                        bio: true,
                        identityVerified: true,
                        createdAt: true,
                    }
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    }
                },
                _count: {
                    select: {
                        proposals: true
                    }
                }
            }
        })

        if (!requestDetail) {
            return NextResponse.json(
                { error: "依頼が見つかりません" },
                { status: 404 }
            )
        }

        // Check if the current user has already proposed
        let myProposal = null
        if (session?.user?.id) {
            myProposal = await prisma.proposal.findUnique({
                where: {
                    requestId_userId: {
                        requestId: id,
                        userId: session.user.id
                    }
                }
            })
        }

        return NextResponse.json({
            ...requestDetail,
            myProposal
        })

    } catch (error) {
        console.error("Request fetch error:", error)
        return NextResponse.json(
            { error: "依頼の取得に失敗しました" },
            { status: 500 }
        )
    }
}
