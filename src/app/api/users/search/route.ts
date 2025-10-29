import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

const MAX_RESULTS = 10

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = (searchParams.get("q") || "").trim()

    if (!query) {
      return NextResponse.json({ users: [] })
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: session.user.id },
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        bio: true,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_RESULTS,
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("User search error:", error)
    return NextResponse.json({ error: "ユーザーの検索に失敗しました" }, { status: 500 })
  }
}
