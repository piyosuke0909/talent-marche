import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await prisma.user.findUnique({
      where: {
        id: session.user.id
      },
      include: {
        _count: {
          select: {
            services: {
              where: {
                isActive: true
              }
            },
            orders: true,
            reviews: true
          }
        },
        reviews: {
          select: {
            rating: true
          }
        }
      }
    })

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // 平均評価を計算
    const averageRating = profile.reviews.length > 0 
      ? profile.reviews.reduce((sum, review) => sum + review.rating, 0) / profile.reviews.length
      : 0

    // パスワードを除外してレスポンス
    const { password: _password, reviews: _reviews, ...profileData } = profile
    void _password
    void _reviews
    
    return NextResponse.json({
      ...profileData,
      averageRating
    })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json(
      { error: "プロフィールの取得に失敗しました" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, bio, location, website } = body

    const updatedProfile = await prisma.user.update({
      where: {
        id: session.user.id
      },
      data: {
        name: name || undefined,
        bio: bio || undefined,
        location: location || undefined,
        website: website || undefined
      },
      include: {
        _count: {
          select: {
            services: {
              where: {
                isActive: true
              }
            },
            orders: true,
            reviews: true
          }
        },
        reviews: {
          select: {
            rating: true
          }
        }
      }
    })

    // 平均評価を計算
    const averageRating = updatedProfile.reviews.length > 0 
      ? updatedProfile.reviews.reduce((sum, review) => sum + review.rating, 0) / updatedProfile.reviews.length
      : 0

    // パスワードを除外してレスポンス
    const { password: _password, reviews: _reviews, ...profileData } = updatedProfile
    void _password
    void _reviews

    return NextResponse.json({
      ...profileData,
      averageRating
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json(
      { error: "プロフィールの更新に失敗しました" },
      { status: 500 }
    )
  }
}
