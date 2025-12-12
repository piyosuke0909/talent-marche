
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting script...')

    // Upsert Users
    const userA = await prisma.user.upsert({
        where: { email: 'userA@example.com' },
        update: {},
        create: {
            email: 'userA@example.com',
            username: 'usera_test',
            name: 'User A',
            password: '$2a$10$EpRnTzVlqHNP0.fkbAy9.O6L.D/o.y.D.u.O./.u.O.,',
            role: 'USER'
        }
    })
    console.log('User A upserted:', userA.id)

    const userB = await prisma.user.upsert({
        where: { email: 'userB@example.com' },
        update: {},
        create: {
            email: 'userB@example.com',
            username: 'userb_test',
            name: 'User B',
            password: 'somehash',
            role: 'USER'
        }
    })
    console.log('User B upserted:', userB.id)

    // Ensure a service exists for User A
    let category = await prisma.category.findFirst()
    if (!category) {
        category = await prisma.category.create({
            data: { name: 'Test Category', slug: 'test-cat-' + Date.now() }
        })
    }

    let service = await prisma.service.findFirst({
        where: { userId: userA.id }
    })

    if (!service) {
        service = await prisma.service.create({
            data: {
                title: 'Review Test Service ' + Date.now(),
                description: 'Service for testing reviews',
                price: 5000,
                deliveryDays: 3,
                userId: userA.id,
                categoryId: category.id,
                isActive: true
            }
        })
    }

    // Create Completed Order
    const order = await prisma.order.create({
        data: {
            buyerId: userB.id,
            sellerId: userA.id,
            serviceId: service.id,
            status: 'COMPLETED',
            totalAmount: 5000,
            deadline: new Date(Date.now() + 86400000), // tomorrow
        }
    })

    console.log(`Created Completed Order: ${order.id}`)
    fs.writeFileSync(path.join(__dirname, 'latest_order_id.txt'), order.id)
    console.log('Order ID written to latest_order_id.txt')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
