
import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"


export async function GET(request: NextRequest) {
    try {
        const session = await getServerAuthSession()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "認証が必要です" },
                { status: 401 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                image: true,
                bio: true,
                location: true,
                skills: true,
            }
        })

        if (!user) {
            return NextResponse.json(
                { error: "ユーザーが見つかりません" },
                { status: 404 }
            )
        }

        return NextResponse.json({ user })

    } catch (error) {
        console.error("Profile fetch error:", error)
        return NextResponse.json(
            { error: "プロフィールの取得に失敗しました" },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerAuthSession()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "認証が必要です" },
                { status: 401 }
            )
        }

        const { name, bio, image, location, skills } = await request.json()

        // Validate inputs if necessary
        // Note: Image is expected to be a Base64 string

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name,
                bio,
                image, // Base64 string
                location,
                skills: skills || [], // Ensure array
            },
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                image: true,
                bio: true,
                location: true,
                skills: true,
            }
        })

        return NextResponse.json({
            message: "プロフィールを更新しました",
            user: updatedUser
        })

    } catch (error) {
        console.error("Profile update error:", error)
        return NextResponse.json(
            { error: "プロフィールの更新に失敗しました" },
            { status: 500 }
        )
    }
}
