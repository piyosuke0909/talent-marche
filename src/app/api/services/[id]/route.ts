import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { ServiceDetail, ServiceReviewSummary } from "@/types"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await getServerAuthSession()

    // 1. Fetch without isActive filter first to check existence
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            bio: true,
            identityVerified: true,
            createdAt: true,
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
          include: {
            reviewer: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
            favorites: true,
          }
        }
      }
    })

    if (!service) {
      return NextResponse.json(
        { error: "サービスが見つかりません" },
        { status: 404 }
      )
    }

    // 2. Check accessibility
    // If active, anyone can see.
    // If inactive, only the owner can see.
    if (!service.isActive) {
      if (!session || session.user.id !== service.userId) {
        return NextResponse.json(
          { error: "このサービスは現在公開されていません" },
          { status: 404 } // Mimic 404 for security/privacy
        )
      }
    }



    // 平均評価を計算
    const averageRating = service.reviews.length > 0
      ? service.reviews.reduce((sum, review) => sum + review.rating, 0) / service.reviews.length
      : 0

    const totalReviews = service.reviews.length
    const normalizedReviews: ServiceReviewSummary[] = service.reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      reviewer: {
        id: review.reviewer.id,
        username: review.reviewer.username || "Unknown", // Default since UI expects string
        name: review.reviewer.name || null,
        image: review.reviewer.image || null,
      },
    }))

    const serviceWithRating: ServiceDetail = {
      id: service.id,
      title: service.title,
      description: service.description,
      price: service.price,
      images: service.images,
      deliveryDays: service.deliveryDays,
      user: {
        id: service.user.id,
        username: service.user.username || "Unknown",
        name: service.user.name,
        image: service.user.image,
        bio: service.user.bio,
        identityVerified: service.user.identityVerified,
        createdAt: service.user.createdAt.toISOString(),
      },
      category: {
        id: service.category.id,
        name: service.category.name,
        slug: service.category.slug,
      },
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      orderCount: service._count.orders,
      favoriteCount: service._count.favorites,
      tags: service.tags,
      isActive: service.isActive,
      userId: service.userId,
      categoryId: service.categoryId,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
      reviews: normalizedReviews,
      _count: {
        orders: service._count.orders,
        reviews: service._count.reviews,
        favorites: service._count.favorites,
      },
    }

    return NextResponse.json(serviceWithRating)

  } catch (error) {
    console.error("Service fetch error:", error)
    return NextResponse.json(
      { error: "サービスの取得に失敗しました" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    // サービスの所有者確認
    const { id } = await params

    const existingService = await prisma.service.findUnique({
      where: { id }
    })

    if (!existingService) {
      return NextResponse.json(
        { error: "サービスが見つかりません" },
        { status: 404 }
      )
    }

    if (existingService.userId !== session.user.id) {
      return NextResponse.json(
        { error: "このサービスを編集する権限がありません" },
        { status: 403 }
      )
    }

    const { title, description, price, deliveryDays, categoryId, images, tags, isActive } = await request.json()

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(price && { price: parseInt(price) }),
        ...(deliveryDays && { deliveryDays: parseInt(deliveryDays) }),
        ...(categoryId && { categoryId }),
        ...(images && { images }),
        ...(tags && { tags }),
        ...(isActive !== undefined && { isActive }),
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

    return NextResponse.json({
      message: "サービスを更新しました",
      service
    })

  } catch (error) {
    console.error("Service update error:", error)
    return NextResponse.json(
      { error: "サービスの更新に失敗しました" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      )
    }

    // サービスの所有者確認
    const { id } = await params

    const existingService = await prisma.service.findUnique({
      where: { id }
    })

    if (!existingService) {
      return NextResponse.json(
        { error: "サービスが見つかりません" },
        { status: 404 }
      )
    }

    if (existingService.userId !== session.user.id) {
      return NextResponse.json(
        { error: "このサービスを削除する権限がありません" },
        { status: 403 }
      )
    }

    // 論理削除（isActive = false）
    await prisma.service.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({
      message: "サービスを削除しました"
    })

  } catch (error) {
    console.error("Service delete error:", error)
    return NextResponse.json(
      { error: "サービスの削除に失敗しました" },
      { status: 500 }
    )
  }
}
