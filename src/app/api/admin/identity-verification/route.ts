import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET: List all identity verification requests (admin only)
export async function GET(request: Request) {
    try {
        const session = await getServerAuthSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const admin = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        })
        if (admin?.role !== "ADMIN") {
            return NextResponse.json({ error: "管理者権限がありません" }, { status: 403 })
        }

        const url = new URL(request.url)
        const statusFilter = url.searchParams.get("status") || "PENDING"

        const verifications = await prisma.identityVerification.findMany({
            where: { status: statusFilter },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        name: true,
                        image: true,
                        identityVerified: true,
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        })

        return NextResponse.json({ verifications })
    } catch (error) {
        console.error("Admin identity verification list error:", error)
        return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 })
    }
}
