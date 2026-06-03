// サービスAPI: サービス一覧取得（GET）・サービス作成（POST）処理

import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

import type { ServiceListItem, ServicesResponse } from "@/types"

// ソートオプションの定義
const SORT_OPTIONS = ['recent', 'popular', 'price_low', 'price_high', 'rating'] as const
type SortOption = typeof SORT_OPTIONS[number]

// ソートオプションを Prisma の orderBy 形式に変換する処理
function buildServiceSort(sortBy: SortOption): Prisma.ServiceOrderByWithRelationInput | Prisma.ServiceOrderByWithRelationInput[] {
  switch (sortBy) {
    case 'price_low':  return [{ price: 'asc' },  { createdAt: 'desc' }]          // 価格の安い順
    case 'price_high': return [{ price: 'desc' }, { createdAt: 'desc' }]           // 価格の高い順
    case 'popular':    return [{ orders: { _count: 'desc' } }, { createdAt: 'desc' }] // 注文数順
    case 'rating':
      // Prisma は平均値での orderBy 未対応のためレビュー件数順で代替
      return [{ reviews: { _count: 'desc' } }, { createdAt: 'desc' }]
    default:           return [{ createdAt: 'desc' }]                              // 新着順
  }
}


// サービス一覧取得処理: 検索・カテゴリー・価格フィルター + ページネーション対応
export async function GET(request: NextRequest) {
  try {
    // ページネーション・フィルターパラメータ取得処理
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const userId = searchParams.get("userId")
    const minPriceParam = searchParams.get("minPrice")
    const maxPriceParam = searchParams.get("maxPrice")
    const sortByParam = (searchParams.get("sortBy") || "recent").toLowerCase()

    const minPrice = minPriceParam ? Number.parseInt(minPriceParam, 10) : null
    const maxPrice = maxPriceParam ? Number.parseInt(maxPriceParam, 10) : null

    const sortBy: SortOption = SORT_OPTIONS.includes(sortByParam as SortOption)
      ? (sortByParam as SortOption)
      : 'recent'

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

    if ((minPrice !== null && !Number.isNaN(minPrice)) || (maxPrice !== null && !Number.isNaN(maxPrice))) {
      const priceFilter: Prisma.IntFilter = {}
      if (minPrice !== null && !Number.isNaN(minPrice)) {
        priceFilter.gte = minPrice
      }
      if (maxPrice !== null && !Number.isNaN(maxPrice)) {
        priceFilter.lte = maxPrice
      }
      if (Object.keys(priceFilter).length > 0) {
        where.price = priceFilter
      }
    }

    const orderBy = buildServiceSort(sortBy)

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
        orderBy,
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
    const session = await getServerAuthSession()

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

    // 出品数上限チェック（最大5件）
    const existingCount = await prisma.service.count({
      where: { userId: session.user.id, isActive: true }
    })
    if (existingCount >= 5) {
      return NextResponse.json(
        { error: "出品できるサービスは最大5件までです。既存のサービスを削除してから再度お試しください。" },
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
