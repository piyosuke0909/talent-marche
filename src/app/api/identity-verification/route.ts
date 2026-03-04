import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET: Fetch current user's latest verification status
export async function GET() {
    try {
        const session = await getServerAuthSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const verification = await prisma.identityVerification.findFirst({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
        })

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { identityVerified: true },
        })

        return NextResponse.json({
            verification: verification
                ? {
                    id: verification.id,
                    documentType: verification.documentType,
                    status: verification.status,
                    adminNote: verification.adminNote,
                    createdAt: verification.createdAt.toISOString(),
                }
                : null,
            identityVerified: user?.identityVerified ?? false,
        })
    } catch (error) {
        console.error("Identity verification fetch error:", error)
        return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 })
    }
}

// POST: Submit identity document
export async function POST(request: Request) {
    try {
        const session = await getServerAuthSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
        }

        const { documentImage, documentType } = await request.json()

        if (!documentImage || !documentType) {
            return NextResponse.json(
                { error: "証明書の画像と種類は必須です" },
                { status: 400 }
            )
        }

        const validTypes = ["drivers_license", "passport", "my_number_card"]
        if (!validTypes.includes(documentType)) {
            return NextResponse.json(
                { error: "無効な証明書の種類です" },
                { status: 400 }
            )
        }

        // Check if there's already a pending request
        const existingPending = await prisma.identityVerification.findFirst({
            where: {
                userId: session.user.id,
                status: "PENDING",
            },
        })

        if (existingPending) {
            return NextResponse.json(
                { error: "すでに審査中の申請があります" },
                { status: 409 }
            )
        }

        const verification = await prisma.identityVerification.create({
            data: {
                userId: session.user.id,
                documentImage,
                documentType,
            },
        })

        return NextResponse.json({
            message: "身分証明書を提出しました。審査結果をお待ちください。",
            verification: {
                id: verification.id,
                status: verification.status,
                createdAt: verification.createdAt.toISOString(),
            },
        })
    } catch (error) {
        console.error("Identity verification submit error:", error)
        return NextResponse.json(
            { error: "提出に失敗しました" },
            { status: 500 }
        )
    }
}
