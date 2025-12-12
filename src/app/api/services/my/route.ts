
import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
    try {
        const session = await getServerAuthSession()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "認証が必要です" },
                { status: 401 }
            )
        }

        const services = await prisma.service.findMany({
            where: {
                userId: session.user.id
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                _count: {
                    select: {
                        orders: true,
                        reviews: true,
                        favorites: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json({ services })

    } catch (error) {
        console.error("My Services fetch error:", error)
        return NextResponse.json(
            { error: "サービスの取得に失敗しました" },
            { status: 500 }
        )
    }
}
