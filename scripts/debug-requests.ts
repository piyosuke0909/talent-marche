
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const requests = await prisma.request.findMany({
            where: {
                isActive: true,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                _count: {
                    select: { proposals: true },
                },
            },
            orderBy: [{ createdAt: 'desc' }],
            take: 12,
        })
        console.log('Requests found:', requests.length)
    } catch (error) {
        console.error('Error fetching requests:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
