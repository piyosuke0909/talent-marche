import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        // Admin access control
        if (req.nextUrl.pathname.startsWith("/admin") && req.nextauth.token?.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/", req.url))
        }
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
)

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/admin/:path*",
        "/checkout/:path*",
        "/orders/:path*",
        "/services/create",
        "/services/:id/edit",
    ],
}
