
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Find User A
    const userA = await prisma.user.findFirst({
        where: { email: "w.sakai.k@gmail.com" }
    })

    if (!userA) throw new Error("User A not found")

    // Find Category
    const category = await prisma.category.findUnique({
        where: { slug: "video-audio" } // Using slug from seed
    })

    if (!category) throw new Error("Category not found")

    const request = await prisma.request.create({
        data: {
            title: "E2E Video Request Direct",
            description: "Directly created via Prisma for E2E testing",
            budget: 30000,
            userId: userA.id,
            categoryId: category.id,
            skills: ["Premiere", "AfterEffects"],
            deadline: new Date("2025-12-31"),
            isActive: true
        }
    })

    console.log(`CREATED_REQUEST_ID: ${request.id}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
