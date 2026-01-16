
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting cleanup of orphaned requests...')

    // 1. Get all requests
    const requests = await prisma.request.findMany()
    console.log(`Found ${requests.length} total requests.`)

    // 2. Get all valid category IDs
    const categories = await prisma.category.findMany({ select: { id: true } })
    const validCategoryIds = new Set(categories.map(c => c.id))

    // 3. Find requests with invalid categoryId
    const invalidRequests = requests.filter(r => !validCategoryIds.has(r.categoryId))

    if (invalidRequests.length === 0) {
        console.log('No orphaned requests found.')
        return
    }

    console.log(`Found ${invalidRequests.length} orphaned requests. Deleting...`)

    // 4. Delete them
    const deleteResult = await prisma.request.deleteMany({
        where: {
            id: {
                in: invalidRequests.map(r => r.id)
            }
        }
    })

    console.log(`Deleted ${deleteResult.count} orphaned requests.`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
