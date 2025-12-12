
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const orderId = '693941aa76e4af33220144e0'
    const reviews = await prisma.review.findMany({
        where: { orderId },
        include: { reviewer: true }
    })

    console.log(`Reviews found: ${reviews.length}`)
    reviews.forEach(r => {
        console.log(`- Rating: ${r.rating}, Comment: ${r.comment}, Reviewer: ${r.reviewer.email}`)
    })
}

main().finally(() => prisma.$disconnect())
