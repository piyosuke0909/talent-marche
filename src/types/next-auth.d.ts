declare module "next-auth" {
  interface User {
    username: string
  }

  interface Session {
    user: {
      id: string
      username: string
      email: string
      name?: string
      image?: string
    }
    expires: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username: string
  }
}
