// 通知API: 通知取得（GET）・既読更新（PUT）・削除（DELETE）処理
// GET ?history=1 → 全件取得（通知履歴ページ用）
// GET            → 未読のみ取得（ヘッダーのバッジ表示用）
// PUT { id }     → 特定の通知を既読にする
// PUT {}         → 全通知を既読にする
// DELETE ?id=xxx → 特定の通知を削除する
// DELETE         → 全通知を削除する

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'

// 通知取得処理: ヘッダーバッジ用（未読のみ）または履歴ページ用（全件）
export async function GET(req: NextRequest) {
    try {
        // 認証チェック処理
        const session = await getServerAuthSession()
        if (!session) return new NextResponse('Unauthorized', { status: 401 })

        // history=1 の場合は全件、それ以外は未読30件まで取得
        const isHistory = req.nextUrl.searchParams.get('history') === '1'

        const notifications = await prisma.notification.findMany({
            where: {
                userId: session.user.id,
                ...(isHistory ? {} : { isRead: false }), // 履歴モード以外は未読のみ
            },
            orderBy: { createdAt: 'desc' },
            ...(isHistory ? {} : { take: 30 }), // 履歴モード以外は30件上限
        })

        // 未読件数を取得してバッジ表示に使用
        const unreadCount = await prisma.notification.count({
            where: { userId: session.user.id, isRead: false },
        })

        return NextResponse.json({ notifications, unreadCount })
    } catch (error) {
        console.error('Notification API Error:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

// 既読更新処理: 特定の通知または全通知を既読にする
export async function PUT(req: Request) {
    try {
        // 認証チェック処理
        const session = await getServerAuthSession()
        if (!session) return new NextResponse('Unauthorized', { status: 401 })

        const body = await req.json().catch(() => ({}))
        const { id } = body

        if (id) {
            // 特定の通知を既読にする処理（自分の通知のみ更新可能）
            await prisma.notification.update({
                where: { id, userId: session.user.id },
                data: { isRead: true },
            })
        } else {
            // 全未読通知を一括既読にする処理
            await prisma.notification.updateMany({
                where: { userId: session.user.id, isRead: false },
                data: { isRead: true },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Notification API Error:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

// 通知削除処理: 特定の通知または全通知を削除する
export async function DELETE(req: NextRequest) {
    try {
        // 認証チェック処理
        const session = await getServerAuthSession()
        if (!session) return new NextResponse('Unauthorized', { status: 401 })

        const id = req.nextUrl.searchParams.get('id')

        if (id) {
            // 特定の通知を1件削除する処理
            await prisma.notification.delete({
                where: { id, userId: session.user.id },
            })
        } else {
            // 全通知を一括削除する処理
            await prisma.notification.deleteMany({
                where: { userId: session.user.id },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Notification API Error:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
