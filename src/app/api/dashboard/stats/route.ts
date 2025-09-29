import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [
      totalServices,
      totalOrders, 
      orders,
      totalRequests
    ] = await Promise.all([
      prisma.service.count({
        where: {
          userId: session.user.id,
          isActive: true
        }
      }),
      prisma.order.count({
        where: {
          service: {
            userId: session.user.id
          }
        }
      }),
      prisma.order.findMany({
        where: {
          service: {
            userId: session.user.id
          },
          status: 'completed'
        },
        include: {
          service: true
        }
      }),
      prisma.request.count({
        where: {
          userId: session.user.id
        }
      })
    ])

    const totalEarnings = orders.reduce((sum, order) => sum + order.service.price, 0)

    return NextResponse.json({
      totalServices,
      totalOrders,
      totalEarnings,
      totalRequests
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "統計データの取得に失敗しました" },
      { status: 500 }
    )
  }
}