// お気に入りAPI: 一覧取得（GET）・トグル（POST）・削除（DELETE）処理

import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { ServiceListItem } from "@/types"

// お気に入り一覧取得処理: ログインユーザーのお気に入りサービスを評価付きで返す
export async function GET() {
  try {
    // 認証チェック処理
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // お気に入り一覧をサービス詳細付きで取得
    const favorites = await prisma.favorite.findMany({
      where: { userId: session.user.id },
      include: {
        service: {
          include: {
            user:     { select: { id: true, username: true, name: true, image: true } },
            category: { select: { id: true, name: true, slug: true } },
            reviews:  { select: { rating: true } },
            _count:   { select: { orders: true, favorites: true, reviews: true } }
          }
        }
      }
    })

    // 平均評価を計算してサービスリスト形式に変換する処理
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
    return NextResponse.json({ error: "お気に入りの取得に失敗しました" }, { status: 500 })
  }
}

// お気に入りトグル処理: 登録済みなら削除、未登録なら追加する
export async function POST(request: Request) {
  try {
    // 認証チェック処理
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const { serviceId } = await request.json()
    if (!serviceId) {
      return NextResponse.json({ error: "サービスIDが必要です" }, { status: 400 })
    }

    // サービス存在確認処理
    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) {
      return NextResponse.json({ error: "サービスが見つかりません" }, { status: 404 })
    }

    // 既存のお気に入り登録確認処理
    const existingFavorite = await prisma.favorite.findUnique({
      where: { userId_serviceId: { userId: session.user.id, serviceId } }
    })

    if (existingFavorite) {
      // 登録済みの場合: 削除してトグルオフ
      await prisma.favorite.delete({ where: { id: existingFavorite.id } })
      return NextResponse.json({ success: true, isFavorite: false, message: "お気に入りから削除しました" })
    } else {
      // 未登録の場合: 新規追加してトグルオン
      await prisma.favorite.create({ data: { userId: session.user.id, serviceId } })
      return NextResponse.json({ success: true, isFavorite: true, message: "お気に入りに追加しました" })
    }

  } catch (error) {
    console.error("Error toggling favorite:", error)
    return NextResponse.json({ error: "お気に入りの処理に失敗しました" }, { status: 500 })
  }
}

// お気に入り削除処理: serviceId を指定して直接削除する（POST のトグルとは別）
export async function DELETE(request: Request) {
  try {
    // 認証チェック処理
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { serviceId } = await request.json()
    if (!serviceId) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 })
    }

    // お気に入りレコード削除処理
    await prisma.favorite.deleteMany({
      where: { userId: session.user.id, serviceId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing favorite:", error)
    return NextResponse.json({ error: "お気に入りの削除に失敗しました" }, { status: 500 })
  }
}
