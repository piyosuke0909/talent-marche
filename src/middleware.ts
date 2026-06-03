// ミドルウェア: ページアクセス制御処理
// Next.js のリクエストが届くたびに実行され、認証・権限チェックを行う

import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        // 管理者ページへのアクセス制御処理
        if (req.nextUrl.pathname.startsWith("/admin")) {
            // ロールチェック: ADMIN 以外はトップへリダイレクト
            if (req.nextauth.token?.role !== "ADMIN") {
                return NextResponse.redirect(new URL("/", req.url))
            }

            // OTP 二段階認証チェック処理
            // /admin/verify と OTP API 自体はチェックをスキップ
            if (
                !req.nextUrl.pathname.startsWith("/admin/verify") &&
                !req.nextUrl.pathname.startsWith("/api/admin/otp")
            ) {
                // Cookie に admin_otp_verified=true がなければ OTP 認証画面へ飛ばす
                const otpCookie = req.cookies.get("admin_otp_verified")?.value
                if (otpCookie !== "true") {
                    return NextResponse.redirect(new URL("/admin/verify", req.url))
                }
            }
        }
    },
    {
        callbacks: {
            // トークンが存在すればアクセス許可（未ログインは /auth/signin へ自動リダイレクト）
            authorized: ({ token }) => !!token,
        },
    }
)

// ミドルウェアを適用するURLパターン（ログインが必要なページ一覧）
export const config = {
    matcher: [
        "/dashboard/:path*",    // ダッシュボード系すべて
        "/admin/:path*",        // 管理者ページすべて
        "/checkout/:path*",     // 決済ページ
        "/orders/:path*",       // 注文ページ
        "/services/create",     // サービス出品ページ
        "/services/:id/edit",   // サービス編集ページ
    ],
}
