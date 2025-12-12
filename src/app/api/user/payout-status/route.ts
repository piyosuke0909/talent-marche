
import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        const session = await getServerAuthSession()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { payjpTenantId: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({
            isPayoutSetup: !!user.payjpTenantId
        })

    } catch (error) {
        console.error('Payout Status Check Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
