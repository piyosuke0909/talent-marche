import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { ServiceListItem } from "@/types"

export async function GET() {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const favorites = await prisma.favorite.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        service: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              }
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              }
            },
            reviews: {
              select: {
                rating: true,
              }
            },
            _count: {
              select: {
                orders: true,
                favorites: true,
                reviews: true,
              }
            }
          }
        }
      }
    })

    const favoritesWithRatings: ServiceListItem[] = favorites.map(favorite => {
      const service = favorite.service
      const totalReviews = service.reviews.length
      const rawAverage = totalReviews > 0
        ? service.reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
        : 0

      return {
        id: service.id,
        title: service.title,
        description: service.description,
        price: service.price,
        images: service.images,
        deliveryDays: service.deliveryDays,
        user: service.user,
        category: service.category,
        averageRating: Math.round(rawAverage * 10) / 10,
        totalReviews,
        orderCount: service._count.orders,
        favoriteCount: service._count.favorites,
      }
    })

    return NextResponse.json(favoritesWithRatings)
  } catch (error) {
    console.error("Error fetching favorites:", error)
    return NextResponse.json(
      { error: "お気に入りの取得に失敗しました" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { serviceId } = await request.json()

    if (!serviceId) {
      return NextResponse.json({ error: "サービスIDが必要です" }, { status: 400 })
    }

    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    })

    if (!service) {
      return NextResponse.json({ error: "サービスが見つかりません" }, { status: 404 })
    }

    // Check if already favorited
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_serviceId: {
          userId: session.user.id,
          serviceId: serviceId
        }
      }
    })

    if (existingFavorite) {
      // 既に存在する場合は削除（トグル機能）
      await prisma.favorite.delete({
        where: {
          id: existingFavorite.id
        }
      })
      
      return NextResponse.json({ 
        success: true, 
        isFavorite: false, 
        message: "お気に入りから削除しました" 
      })
    } else {
      // 存在しない場合は追加
      await prisma.favorite.create({
        data: {
          userId: session.user.id,
          serviceId: serviceId
        }
      })
      
      return NextResponse.json({ 
        success: true, 
        isFavorite: true, 
        message: "お気に入りに追加しました" 
      })
    }

  } catch (error) {
    console.error("Error toggling favorite:", error)
    return NextResponse.json(
      { error: "お気に入りの処理に失敗しました" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { serviceId } = await request.json()

    if (!serviceId) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 })
    }

    // Delete favorite
    await prisma.favorite.deleteMany({
      where: {
        userId: session.user.id,
        serviceId: serviceId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing favorite:", error)
    return NextResponse.json(
      { error: "お気に入りの削除に失敗しました" },
      { status: 500 }
    )
  }
}
