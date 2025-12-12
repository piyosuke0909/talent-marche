
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    const order = await prisma.order.findFirst({
        orderBy: { createdAt: 'desc' }
    })
    console.log("LATEST_ORDER_ID:", order?.id)
}
main().finally(() => prisma.$disconnect())
