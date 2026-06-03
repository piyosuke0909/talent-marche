// 認証設定処理: NextAuth.js の全プロバイダー・セッション・コールバックを定義

import type { Session, User } from "next-auth"
import type { JWT } from "next-auth/jwt"
import { getServerSession } from "next-auth/next"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import TwitterProvider from "next-auth/providers/twitter"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export const authOptions = {
  debug: true,
  adapter: PrismaAdapter(prisma), // Prisma を使ってセッション・アカウントを DB 管理
  providers: [
    // Google ログインプロバイダー設定
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // 同メールアドレスの既存アカウントと自動連携
    }),
    // GitHub ログインプロバイダー設定
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    // Twitter（X）ログインプロバイダー設定
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
    }),
    // メール＋パスワードログインプロバイダー設定
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // 必須項目チェック処理
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // ユーザー検索処理: メールアドレスまたはユーザーネームで検索
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.email },
              { username: credentials.email }
            ]
          }
        })

        // ユーザー存在チェック・パスワード設定チェック
        if (!user || !user.password) {
          return null
        }

        // パスワード照合処理（bcrypt ハッシュと比較）
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // 画像URL変換処理: Base64 画像はアバターAPIに変換してトークンサイズを削減
        const imageUrl = user.image?.startsWith('data:')
          ? `/api/users/${user.id}/avatar?t=${user.updatedAt.getTime()}`
          : (user.image || undefined)

        // 認証成功: セッションに含めるユーザー情報を返す
        return {
          id: user.id,
          email: user.email,
          username: user.username || undefined,
          name: user.name || undefined,
          image: imageUrl,
          role: user.role,
        }
      }
    })
  ],
  // セッション管理: JWT方式（DB にセッションを保存しない）
  session: {
    strategy: "jwt" as const
  },
  // カスタムページURL設定
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
  },
  callbacks: {
    // ソーシャルログイン後のプロフィール同期処理
    async signIn({ user, account, profile }: { user: User; account: any; profile?: any }) {
      console.log('--- SIGN IN CALLBACK TRIGGERED ---')
      console.log('Provider:', account?.provider)
      console.log('User Email:', user?.email)
      console.log('User Profile:', JSON.stringify(profile, null, 2))

      // Google・GitHub ログイン時のユーザー情報同期処理
      if (account?.provider === 'google' || account?.provider === 'github') {
        if (user.email) {
          try {
            console.log('Checking if user exists for email:', user.email)
            const existingUser = await prisma.user.findUnique({
              where: { email: user.email }
            })

            // メールアドレスの @ 前をデフォルトユーザーネームに使用
            const defaultUsername = user.email.split('@')[0]

            if (existingUser) {
              // 既存ユーザーの場合: 画像・名前を最新に更新（ユーザーネームは初回のみ設定）
              console.log('User exists, updating profile...')
              await prisma.user.update({
                where: { email: user.email },
                data: {
                  image: user.image,
                  name: user.name,
                  ...(existingUser.username ? {} : { username: defaultUsername })
                }
              })
              console.log('Update successful')
            } else {
              // 新規ユーザーの場合: PrismaAdapter が自動作成するので仮ユーザーネームを付与
               console.log('User does not exist, PrismaAdapter will create it.')
               console.log('Assigning temporary username:', defaultUsername)
               ;(user as any).username = defaultUsername
            }
          } catch (e) {
            console.error("Failed to sync social profile during OAuth:", e)
          }
        } else {
           console.log('NO EMAIL RETURNED FROM OAUTH')
        }
      }
      return true
    },

    // JWT トークン生成・更新処理
    async jwt({ token, user, trigger, session }: { token: JWT; user?: User; trigger?: "signIn" | "signUp" | "update"; session?: any }) {
      // ログイン直後: ユーザー情報をトークンに格納
      if (user) {
        token.id = user.id
        token.role = user.role
        // Base64 画像は JWT に入れずアバターAPIのURLに置き換えてサイズ削減
        token.picture = user.image?.startsWith('data:')
          ? `/api/users/${user.id}/avatar`
          : user.image
      }

      // セッション更新トリガー時: DB から最新情報を取得してトークンを再構築
      if (trigger === "update") {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string }
          })
          if (freshUser) {
            token.name = freshUser.name
            // 画像URLにタイムスタンプを付与してブラウザキャッシュを無効化
            token.picture = freshUser.image?.startsWith('data:')
              ? `/api/users/${freshUser.id}/avatar?t=${freshUser.updatedAt.getTime()}`
              : (freshUser.image || null)
            token.role = freshUser.role
          }
        } catch (e) {
          console.error("Failed to refresh token", e)
        }
      }

      return token
    },

    // セッションオブジェクト構築処理: JWT トークンの値をセッションに反映
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.id as string || token.sub!
        session.user.role = token.role as string
        session.user.image = token.picture || undefined
        session.user.name = token.name || undefined
        session.user.username = token.username || undefined
      }
      return session
    },
  },
}

// サーバーサイドでセッションを取得するためのヘルパー関数
// API ルートや Server Component から呼び出す
export async function getServerAuthSession(): Promise<Session | null> {
  return getServerSession(authOptions) as Promise<Session | null>
}
