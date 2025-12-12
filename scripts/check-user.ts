import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const emailOrUsername = 'itou'

    const userByEmail = await prisma.user.findUnique({
        where: { email: emailOrUsername }
    })

    const userByUsername = await prisma.user.findFirst({
        where: { username: emailOrUsername }
    })

    console.log(`User with email '${emailOrUsername}':`, userByEmail)
    console.log(`User with username '${emailOrUsername}':`, userByUsername)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
