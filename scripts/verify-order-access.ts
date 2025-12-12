
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const orderId = '69368bc42d50eea1ab1039a0'
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { buyer: true, seller: true }
    })

    if (!order) {
        console.log('Order NOT FOUND')
        return
    }

    console.log('Order FOUND')
    console.log('Buyer:', order.buyer.email)
    console.log('Seller:', order.seller.email)
    console.log('Status:', order.status)
}

main().finally(() => prisma.$disconnect())
