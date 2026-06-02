import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        const session = await getServerAuthSession()
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const requests = await prisma.request.findMany({
            where: { userId: session.user.id },
            include: {
                category: { select: { id: true, name: true } },
                _count: { select: { proposals: true } },
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ requests })
    } catch (error) {
        console.error('My requests fetch error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
