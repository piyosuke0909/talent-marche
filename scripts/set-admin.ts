// Script to set a user as ADMIN
// Usage: npx tsx scripts/set-admin.ts <email>

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = process.argv[2]
    
    if (!email) {
        // If no email provided, list all users
        const users = await prisma.user.findMany({
            select: { id: true, email: true, name: true, username: true, role: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
        })
        console.log('\n=== ユーザー一覧 (最新20件) ===')
        users.forEach(u => {
            console.log(`  ${u.role === 'ADMIN' ? '👑' : '  '} ${u.email} (${u.name || u.username}) [${u.role}]`)
        })
        console.log('\n使い方: npx tsx scripts/set-admin.ts <email>')
        return
    }

    const user = await prisma.user.findFirst({ where: { email } })
    if (!user) {
        console.error(`❌ ユーザーが見つかりません: ${email}`)
        return
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
    })
    console.log(`✅ ${email} を ADMIN に設定しました`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
