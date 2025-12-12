import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET: Fetch all payouts (Admin only)
export async function GET(req: Request) {
    try {
        const session = await getServerAuthSession()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        })

        if (user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status')

        const whereClause = status ? { status } : {}

        const payouts = await prisma.payout.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        username: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(payouts)

    } catch (error) {
        console.error('Admin Payout Fetch Error:', error)
        return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
    }
}

// PUT: Update payout status (Admin only)
export async function PUT(req: Request) {
    try {
        const session = await getServerAuthSession()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        })

        if (user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { id, status } = await req.json()

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const validStatuses = ['PENDING', 'PROCESSED', 'FAILED']
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        const updatedPayout = await prisma.payout.update({
            where: { id },
            data: { status }
        })

        return NextResponse.json(updatedPayout)

    } catch (error) {
        console.error('Admin Payout Update Error:', error)
        return NextResponse.json({ error: 'Failed to update payout' }, { status: 500 })
    }
}
