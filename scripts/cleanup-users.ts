import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const emailToKeep = 'w.sakai.k@gmail.com'

    try {
        // 1. Find users to delete
        const usersToDelete = await prisma.user.findMany({
            where: {
                email: {
                    not: emailToKeep,
                },
            },
            select: { id: true },
        })

        const userIds = usersToDelete.map(u => u.id)
        console.log(`Found ${userIds.length} users to delete.`)

        if (userIds.length === 0) {
            console.log('No users to delete.')
            return
        }

        // 2. Delete related records
        // Note: The order matters if there are dependencies between these.
        // We'll try to delete "leaf" nodes first.

        // Reviews
        await prisma.review.deleteMany({
            where: {
                OR: [
                    { reviewerId: { in: userIds } },
                    { revieweeId: { in: userIds } },
                ],
            },
        })
        console.log('Deleted related Reviews')

        // Messages
        await prisma.message.deleteMany({
            where: {
                OR: [
                    { senderId: { in: userIds } },
                    { receiverId: { in: userIds } },
                ],
            },
        })
        console.log('Deleted related Messages')

        // Proposals
        await prisma.proposal.deleteMany({
            where: { userId: { in: userIds } },
        })
        console.log('Deleted related Proposals')

        // Favorites
        await prisma.favorite.deleteMany({
            where: { userId: { in: userIds } },
        })
        console.log('Deleted related Favorites')

        // Orders (involving these users as buyer or seller)
        // Note: Orders might have messages/reviews linked, but we deleted those above.
        await prisma.order.deleteMany({
            where: {
                OR: [
                    { buyerId: { in: userIds } },
                    { sellerId: { in: userIds } },
                ],
            },
        })
        console.log('Deleted related Orders')

        // Requests
        await prisma.request.deleteMany({
            where: { userId: { in: userIds } },
        })
        console.log('Deleted related Requests')

        // Services
        await prisma.service.deleteMany({
            where: { userId: { in: userIds } },
        })
        console.log('Deleted related Services')

        // Accounts
        await prisma.account.deleteMany({
            where: { userId: { in: userIds } },
        })
        console.log('Deleted related Accounts')

        // Sessions
        await prisma.session.deleteMany({
            where: { userId: { in: userIds } },
        })
        console.log('Deleted related Sessions')

        // 3. Delete Users
        const deletedUsers = await prisma.user.deleteMany({
            where: {
                id: { in: userIds },
            },
        })

        console.log(`Successfully deleted ${deletedUsers.count} users.`)
        console.log(`Kept user with email: ${emailToKeep} `)

    } catch (error) {
        console.error('Error deleting users:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
