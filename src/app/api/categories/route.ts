import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            services: {
              where: {
                isActive: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Categories fetch error:", error)
    return NextResponse.json(
      { error: "カテゴリ一覧の取得に失敗しました" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, icon, slug } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        icon,
        slug
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Category creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}