// レビューAPI: 注文完了後のレビュー投稿処理（POST）

import { NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

// レビュー投稿処理: 注文に対して評価・コメントを投稿する
export async function POST(req: NextRequest) {
    try {
        // 認証チェック処理
        const session = await getServerAuthSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { orderId, rating, comment } = body

        // 必須項目バリデーション処理
        if (!orderId || !rating) {
            return NextResponse.json({ error: "OrderId and rating are required" }, { status: 400 })
        }

        // 注文存在確認・関係者チェック処理
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { buyer: true, seller: true, service: true }
        })

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }

        // 注文の買い手・売り手かどうかを判定
        const isBuyer = order.buyerId === session.user.id
        const isSeller = order.sellerId === session.user.id

        // 関係のないユーザーのレビュー投稿を拒否
        if (!isBuyer && !isSeller) {
            return NextResponse.json({ error: "You are not a party to this order" }, { status: 403 })
        }

        // レビュー対象者の決定処理（買い手→売り手を評価、売り手→買い手を評価）
        const revieweeId = isBuyer ? order.sellerId : order.buyerId

        // 重複レビュー防止チェック処理（1注文につき1レビューのみ）
        const existingReview = await prisma.review.findUnique({
            where: {
                orderId_reviewerId: {
                    orderId,
                    reviewerId: session.user.id
                }
            }
        })

        if (existingReview) {
            return NextResponse.json({ error: "You have already reviewed this order" }, { status: 409 })
        }

        // レビューレコード作成処理
        const review = await prisma.review.create({
            data: {
                orderId,
                serviceId: order.serviceId, // サービスの評価にも紐づける
                reviewerId: session.user.id,
                revieweeId,
                rating: Number(rating),
                comment: comment || ""
            }
        })

        return NextResponse.json(review, { status: 201 })

    } catch (error) {
        console.error("Review creation error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
