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
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })



        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        const imageUrl = user.image?.startsWith('data:')
          ? `/api/users/${user.id}/avatar?t=${user.updatedAt.getTime()}`
          : (user.image || undefined)

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
  session: {
    strategy: "jwt" as const
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
  },
  callbacks: {
    async signIn({ user, account }: { user: User; account: any }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        if (user.email) {
          try {
            // Check if user exists first to avoid update error on first sign-in
            const existingUser = await prisma.user.findUnique({
              where: { email: user.email }
            })

            if (existingUser) {
              await prisma.user.update({
                where: { email: user.email },
                data: {
                  image: user.image,
                  name: user.name
                }
              })
            }
          } catch (e) {
            console.error("Failed to sync social profile", e)
            // Do not return false here, allow sign in to proceed even if sync fails
          }
        }
      }
      return true
    },
    async jwt({ token, user, trigger, session }: { token: JWT; user?: User; trigger?: "signIn" | "signUp" | "update"; session?: any }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        // Prevent storing large Base64 strings in the token during sign-in
        // Note: user object in jwt callback comes from authorize/adapter, check if it has properties needed
        // For 'update' trigger below we fetch fresh user so that's handled
        token.picture = user.image?.startsWith('data:')
          ? `/api/users/${user.id}/avatar` // Initial sign-in might miss timestamp if not explicitly passed, but update handles it
          : user.image
      }

      // If session was updated, refresh token data from DB
      if (trigger === "update") {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string }
          })
          if (freshUser) {
            token.name = freshUser.name

            // Use Avatar API for Base64 images to avoid header size limits
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

export async function getServerAuthSession(): Promise<Session | null> {
  return getServerSession(authOptions) as Promise<Session | null>
}
