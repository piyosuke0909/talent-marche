import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'

// GET /api/notifications          → unread only (for header badge)
// GET /api/notifications?history=1 → all notifications (for history page)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerAuthSession()
        if (!session) return new NextResponse('Unauthorized', { status: 401 })

        const isHistory = req.nextUrl.searchParams.get('history') === '1'

        const notifications = await prisma.notification.findMany({
            where: {
                userId: session.user.id,
                ...(isHistory ? {} : { isRead: false }),
            },
            orderBy: { createdAt: 'desc' },
            ...(isHistory ? {} : { take: 30 }),
        })

        const unreadCount = await prisma.notification.count({
            where: { userId: session.user.id, isRead: false },
        })

        return NextResponse.json({ notifications, unreadCount })
    } catch (error) {
        console.error('Notification API Error:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

// PUT /api/notifications  → mark specific or all as read
export async function PUT(req: Request) {
    try {
        const session = await getServerAuthSession()
        if (!session) return new NextResponse('Unauthorized', { status: 401 })

        const body = await req.json().catch(() => ({}))
        const { id } = body

        if (id) {
            await prisma.notification.update({
                where: { id, userId: session.user.id },
                data: { isRead: true },
            })
        } else {
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

// DELETE /api/notifications        → delete all
// DELETE /api/notifications?id=xxx → delete specific
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerAuthSession()
        if (!session) return new NextResponse('Unauthorized', { status: 401 })

        const id = req.nextUrl.searchParams.get('id')

        if (id) {
            await prisma.notification.delete({
                where: { id, userId: session.user.id },
            })
        } else {
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
