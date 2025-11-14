import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recentOrders = await prisma.order.findMany({
      where: {
        service: {
          userId: session.user.id
        }
      },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            price: true
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    return NextResponse.json(recentOrders)
  } catch (error) {
    console.error("Error fetching recent orders:", error)
    return NextResponse.json(
      { error: "最近の注文の取得に失敗しました" },
      { status: 500 }
    )
  }
}