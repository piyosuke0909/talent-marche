import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recentServices = await prisma.service.findMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      include: {
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    const servicesWithOrderCount = recentServices.map(service => ({
      id: service.id,
      title: service.title,
      price: service.price,
      images: service.images,
      status: service.isActive ? 'active' : 'inactive',
      orderCount: service._count.orders
    }))

    return NextResponse.json(servicesWithOrderCount)
  } catch (error) {
    console.error("Error fetching recent services:", error)
    return NextResponse.json(
      { error: "最近のサービスの取得に失敗しました" },
      { status: 500 }
    )
  }
}