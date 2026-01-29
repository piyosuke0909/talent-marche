import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding categories ONLY...')

    const categories = [
        {
            name: 'Webデザイン',
            description: 'ウェブサイトのデザイン・UI/UX設計',
            icon: '🎨',
            slug: 'web-design'
        },
        {
            name: 'プログラミング',
            description: 'ウェブ開発・システム開発・アプリ開発',
            icon: '💻',
            slug: 'programming'
        },
        {
            name: 'グラフィックデザイン',
            description: 'ロゴ・バナー・印刷物のデザイン',
            icon: '🖼️',
            slug: 'graphic-design'
        },
        {
            name: 'ライティング',
            description: '記事執筆・コピーライティング・翻訳',
            icon: '✏️',
            slug: 'writing'
        },
        {
            name: 'マーケティング',
            description: 'SEO・広告運用・SNS運用',
            icon: '📈',
            slug: 'marketing'
        },
        {
            name: '動画・音声編集',
            description: '動画制作・音声編集・アニメーション',
            icon: '🎬',
            slug: 'video-audio'
        },
        {
            name: 'データ入力・分析',
            description: 'データ入力・Excel作業・データ分析',
            icon: '📊',
            slug: 'data'
        },
        {
            name: '翻訳・通訳',
            description: '英語・中国語・韓国語などの翻訳',
            icon: '🌐',
            slug: 'translation'
        }
    ]

    for (const category of categories) {
        await prisma.category.upsert({
            where: { slug: category.slug },
            update: category, // Update if exists to ensure description/icon are correct
            create: category
        })
        console.log(`Created/Updated category: ${category.name}`)
    }

    console.log('Category seeding completed! No users were created.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
