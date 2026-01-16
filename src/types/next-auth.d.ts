import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username?: string
      email: string
      image?: string
      role: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    username?: string
    email: string
    name?: string
    image?: string
    role: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username?: string
    role?: string
  }
}
