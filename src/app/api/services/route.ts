import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Prisma } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { ServiceListItem, ServicesResponse } from "@/types"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const userId = searchParams.get("userId")

    const skip = (page - 1) * limit

    const where: Prisma.ServiceWhereInput = {
      isActive: true,
    }

    if (category) {
      where.category = {
        is: {
          slug: {
            equals: category,
          }
        }
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search] } }
      ]
    }

    if (userId) {
      where.userId = userId
    }

    const [services, totalCount] = await Promise.all([
      prisma.service.findMany({
        where,
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
              reviews: true,
              favorites: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.service.count({ where })
    ])

    const servicesWithRatings: ServiceListItem[] = services.map(service => {
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

    const payload: ServicesResponse = {
      services: servicesWithRatings,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    }

    return NextResponse.json(payload)

  } catch (error) {
    console.error("Services fetch error:", error)
    return NextResponse.json(
      { error: "サービス一覧の取得に失敗しました" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    const { title, description, price, deliveryDays, categoryId, images, tags } = await request.json()

    if (!title || !description || !price || !deliveryDays || !categoryId) {
      return NextResponse.json(
        { error: "必須項目が入力されていません" },
        { status: 400 }
      )
    }

    // カテゴリの存在確認
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    })

    if (!category) {
      return NextResponse.json(
        { error: "指定されたカテゴリが見つかりません" },
        { status: 400 }
      )
    }

    const service = await prisma.service.create({
      data: {
        title,
        description,
        price: parseInt(price),
        deliveryDays: parseInt(deliveryDays),
        categoryId,
        userId: session.user.id,
        images: images || [],
        tags: tags || [],
      },
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
      }
    })

    return NextResponse.json(
      { 
        message: "サービスを出品しました",
        service 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Service creation error:", error)
    return NextResponse.json(
      { error: "サービスの出品に失敗しました" },
      { status: 500 }
    )
  }
}
