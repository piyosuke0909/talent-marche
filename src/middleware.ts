import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        // Admin access control
        if (req.nextUrl.pathname.startsWith("/admin")) {
            // Role check
            if (req.nextauth.token?.role !== "ADMIN") {
                return NextResponse.redirect(new URL("/", req.url))
            }

            // OTP check (skip for /admin/verify and /api/admin/otp)
            if (
                !req.nextUrl.pathname.startsWith("/admin/verify") &&
                !req.nextUrl.pathname.startsWith("/api/admin/otp")
            ) {
                const otpCookie = req.cookies.get("admin_otp_verified")?.value
                if (otpCookie !== "true") {
                    return NextResponse.redirect(new URL("/admin/verify", req.url))
                }
            }
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
