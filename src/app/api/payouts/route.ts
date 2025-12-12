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
            select: { balance: true }
        })

        const payouts = await prisma.payout.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({
            balance: user?.balance || 0,
            payouts
        })
    } catch (error) {
        console.error('Payout Fetch Error:', error)
        return NextResponse.json({ error: 'Failed to fetch payout info' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerAuthSession()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { amount, bankInfo } = await req.json()

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
        }

        if (!bankInfo) {
            return NextResponse.json({ error: 'Bank info is required' }, { status: 400 })
        }

        // Transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: session.user.id }
            })

            if (!user || user.balance < amount) {
                throw new Error('Insufficient balance')
            }

            // Deduct balance
            await tx.user.update({
                where: { id: session.user.id },
                data: { balance: { decrement: amount } }
            })

            // Create payout record
            const payout = await tx.payout.create({
                data: {
                    userId: session.user.id,
                    amount,
                    bankInfo: JSON.stringify(bankInfo),
                    status: 'PENDING'
                }
            })

            return payout
        })

        return NextResponse.json(result)

    } catch (error: any) {
        console.error('Payout Request Error:', error)
        if (error.message === 'Insufficient balance') {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Failed to request payout' }, { status: 500 })
    }
}
