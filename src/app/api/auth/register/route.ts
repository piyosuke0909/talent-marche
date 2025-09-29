import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, username, password, name } = await request.json()

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: "メールアドレス、ユーザー名、パスワードは必須です" },
        { status: 400 }
      )
    }

    // メールアドレスの重複チェック
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: "このメールアドレスは既に使用されています" },
        { status: 409 }
      )
    }

    // ユーザー名の重複チェック
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUserByUsername) {
      return NextResponse.json(
        { error: "このユーザー名は既に使用されています" },
        { status: 409 }
      )
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12)

    // ユーザーを作成
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name: name || username,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        createdAt: true,
      }
    })

    return NextResponse.json(
      { 
        message: "ユーザーの登録が完了しました",
        user 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    )
  }
}