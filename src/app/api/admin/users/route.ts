
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'

// GET /api/admin/users
// List all users
export async function GET(req: Request) {
    try {
        const session = await getServerAuthSession()

        if (!session || session.user.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const query = searchParams.get('q') || ''
        const page = parseInt(searchParams.get('page') || '1')
        const limit = 20
        const skip = (page - 1) * limit

        const where: any = {}

        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { username: { contains: query, mode: 'insensitive' } },
            ]
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                    image: true,
                    role: true,
                    isVerified: true,
                    identityVerified: true,
                    isBanned: true,
                    createdAt: true,
                    _count: {
                        select: {
                            services: true,
                            orders: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.user.count({ where })
        ])

        return NextResponse.json({
            users,
            total,
            pages: Math.ceil(total / limit)
        })

    } catch (error) {
        console.error('Admin Users API Error:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
