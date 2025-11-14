import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface RouteParams {
  params: {
    serviceId: string
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<RouteParams["params"]> }
) {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = await params
    const { serviceId } = resolvedParams

    if (!serviceId) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 })
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_serviceId: {
          userId: session.user.id,
          serviceId,
        },
      },
    })

    return NextResponse.json({ isFavorite: !!favorite })

  } catch (error) {
    console.error("Error checking favorite status:", error)
    return NextResponse.json(
      { error: "お気に入りの状態の確認に失敗しました" },
      { status: 500 }
    )
  }
}
