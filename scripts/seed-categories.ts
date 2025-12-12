
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const count = await prisma.category.count()
    console.log(`Initial Category count: ${count}`)

    if (count === 0) {
        console.log('Seeding categories...')
        const categories = [
            { name: 'Webデザイン', slug: 'web-design', icon: 'palette' },
            { name: 'プログラミング', slug: 'programming', icon: 'code' },
            { name: 'グラフィックデザイン', slug: 'graphic-design', icon: 'image' },
            { name: 'ライティング', slug: 'writing', icon: 'pen-tool' },
            { name: 'マーケティング', slug: 'marketing', icon: 'trending-up' },
            { name: '動画編集', slug: 'video-editing', icon: 'film' },
            { name: '音楽・ナレーション', slug: 'music-audio', icon: 'music' },
            { name: 'ビジネス相談', slug: 'business-consulting', icon: 'briefcase' },
        ]

        for (const cat of categories) {
            await prisma.category.create({ data: cat })
        }
        console.log('Categories seeded.')
    } else {
        const cats = await prisma.category.findMany()
        console.log('Categories exist:', JSON.stringify(cats, null, 2))
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
