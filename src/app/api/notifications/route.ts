
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'

// GET /api/notifications
// Fetch user's notifications
export async function GET() {
    try {
        const session = await getServerAuthSession()
        if (!session) return new NextResponse('Unauthorized', { status: 401 })

        // Fetch unread messages first, then read ones, limit 20
        const notifications = await prisma.notification.findMany({
            where: {
                userId: session.user.id
            },
            orderBy: [
                { isRead: 'asc' },
                { createdAt: 'desc' }
            ],
            take: 20
        })

        // Count unread
        const unreadCount = await prisma.notification.count({
            where: {
                userId: session.user.id,
                isRead: false
            }
        })

        return NextResponse.json({ notifications, unreadCount })

    } catch (error) {
        console.error('Notification API Error:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

// PUT /api/notifications
// Mark all or specific as read
export async function PUT(req: Request) {
    try {
        const session = await getServerAuthSession()
        if (!session) return new NextResponse('Unauthorized', { status: 401 })

        const body = await req.json().catch(() => ({}))
        const { id } = body

        if (id) {
            // Mark specific as read
            await prisma.notification.update({
                where: { id, userId: session.user.id },
                data: { isRead: true }
            })
        } else {
            // Mark ALL as read
            await prisma.notification.updateMany({
                where: { userId: session.user.id, isRead: false },
                data: { isRead: true }
            })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Notification API Error:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
