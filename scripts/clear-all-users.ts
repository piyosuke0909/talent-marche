import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting full user data cleanup...')

    // 1. Delete dependent data first (Reverse order of dependency)

    // Interactions / Relations
    await prisma.message.deleteMany({})
    console.log('Deleted all messages')

    await prisma.review.deleteMany({})
    console.log('Deleted all reviews')

    await prisma.favorite.deleteMany({})
    console.log('Deleted all favorites')

    await prisma.notification.deleteMany({})
    console.log('Deleted all notifications')

    await prisma.payout.deleteMany({})
    console.log('Deleted all payouts')

    await prisma.priceNegotiation.deleteMany({})
    console.log('Deleted all price negotiations')

    await prisma.proposal.deleteMany({})
    console.log('Deleted all proposals')

    // Auth / Sessions
    await prisma.session.deleteMany({})
    console.log('Deleted all sessions')

    await prisma.account.deleteMany({})
    console.log('Deleted all accounts')

    await prisma.verificationToken.deleteMany({})
    console.log('Deleted all verification tokens')

    // Content (Services, Requests, Orders)
    // Orders link users and services
    await prisma.order.deleteMany({})
    console.log('Deleted all orders')

    await prisma.service.deleteMany({})
    console.log('Deleted all services')

    await prisma.request.deleteMany({})
    console.log('Deleted all requests')

    // Inquiries
    await prisma.inquiry.deleteMany({})
    console.log('Deleted all inquiries')

    await prisma.user.deleteMany({})
    console.log('Deleted all users')

    // 3. Delete Categories (Requested by user)
    await prisma.category.deleteMany({})
    console.log('Deleted all categories')

    console.log('Database cleanup completed! ALL data including categories has been removed.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
