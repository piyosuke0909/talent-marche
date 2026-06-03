// カテゴリーAPI: 一覧取得（GET）・作成（POST）処理

import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// カテゴリー一覧取得処理: 全カテゴリーを名前昇順で返す（公開中サービス数付き）
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }, // 名前のアルファベット順
      include: {
        _count: {
          select: {
            // 公開中サービスの件数のみカウント（非公開は除外）
            services: { where: { isActive: true } }
          }
        }
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Categories fetch error:", error)
    return NextResponse.json({ error: "カテゴリ一覧の取得に失敗しました" }, { status: 500 })
  }
}

// カテゴリー作成処理: 管理者が新しいカテゴリーを追加する（主に管理画面から使用）
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, icon, slug } = body

    // 必須項目バリデーション処理
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // カテゴリーレコード作成処理
    const category = await prisma.category.create({
      data: { name, description, icon, slug }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Category creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
