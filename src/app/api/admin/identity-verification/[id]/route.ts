import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface RouteParams {
    params: Promise<{ id: string }>
}

// PATCH: Approve or reject identity verification (admin only)
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const session = await getServerAuthSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        // Check admin role
        const admin = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        })
        if (admin?.role !== "ADMIN") {
            return NextResponse.json({ error: "管理者権限がありません" }, { status: 403 })
        }

        const { id } = await params
        const { status, adminNote } = await request.json()

        if (!status || !["APPROVED", "REJECTED"].includes(status)) {
            return NextResponse.json(
                { error: "無効なステータスです" },
                { status: 400 }
            )
        }

        const verification = await prisma.identityVerification.findUnique({
            where: { id },
        })

        if (!verification) {
            return NextResponse.json(
                { error: "申請が見つかりません" },
                { status: 404 }
            )
        }

        // Update verification status
        await prisma.identityVerification.update({
            where: { id },
            data: {
                status,
                adminNote: adminNote || null,
            },
        })

        // If approved, set user's identityVerified to true
        if (status === "APPROVED") {
            await prisma.user.update({
                where: { id: verification.userId },
                data: { identityVerified: true },
            })
        }

        // If rejected, ensure identityVerified stays false
        if (status === "REJECTED") {
            await prisma.user.update({
                where: { id: verification.userId },
                data: { identityVerified: false },
            })
        }

        return NextResponse.json({
            message: status === "APPROVED" ? "承認しました" : "却下しました",
        })
    } catch (error) {
        console.error("Identity verification review error:", error)
        return NextResponse.json(
            { error: "審査処理に失敗しました" },
            { status: 500 }
        )
    }
}
