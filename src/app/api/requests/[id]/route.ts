
import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface RouteParams {
    params: Promise<{
        id: string
    }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const session = await getServerAuthSession()
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const existing = await prisma.request.findUnique({ where: { id } })
        if (!existing) return NextResponse.json({ error: '依頼が見つかりません' }, { status: 404 })
        if (existing.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const body = await request.json()
        const { title, description, budget, categoryId, skills, deadline, location, images, isActive } = body

        const updated = await prisma.request.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(budget !== undefined && { budget: budget ? Math.round(Number(budget)) : null }),
                ...(categoryId !== undefined && { categoryId }),
                ...(skills !== undefined && { skills: Array.isArray(skills) ? skills : [] }),
                ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
                ...(location !== undefined && { location: location || null }),
                ...(images !== undefined && { images: Array.isArray(images) ? images : [] }),
                ...(isActive !== undefined && { isActive }),
            },
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Request update error:', error)
        return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const session = await getServerAuthSession()
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const existing = await prisma.request.findUnique({ where: { id } })
        if (!existing) return NextResponse.json({ error: '依頼が見つかりません' }, { status: 404 })
        if (existing.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        await prisma.request.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Request delete error:', error)
        return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
    }
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
