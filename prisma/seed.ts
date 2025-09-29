import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')
  
  // テストユーザーを作成
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: {
        email: 'alice@example.com',
        username: 'alice_dev',
        name: 'アリス・デベロッパー',
        password: hashedPassword,
        bio: 'フルスタック開発者として5年の経験があります。React、Node.js、TypeScriptを使った開発が得意です。',
        image: 'https://images.unsplash.com/photo-1494790108755-2616b9c3e8a3?w=400&h=400&fit=crop&crop=face',
        location: '東京都',
        website: 'https://alice-dev.com',
        isVerified: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: {
        email: 'bob@example.com',
        username: 'bob_designer',
        name: 'ボブ・クリエイター',
        password: hashedPassword,
        bio: 'UI/UXデザイナーとして3年の実績。美しく使いやすいデザインを心がけています。',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
        location: '大阪府',
        website: 'https://bob-design.jp',
        isVerified: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'charlie@example.com' },
      update: {},
      create: {
        email: 'charlie@example.com',
        username: 'charlie_writer',
        name: 'チャーリー・ライター',
        password: hashedPassword,
        bio: 'コンテンツライター兼コピーライター。SEOに強い記事作成が得意です。',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        location: '福岡県',
        isVerified: false
      }
    }),
    prisma.user.upsert({
      where: { email: 'diana@example.com' },
      update: {},
      create: {
        email: 'diana@example.com',
        username: 'diana_data',
        name: 'ダイアナ・アナリスト',
        password: hashedPassword,
        bio: 'データサイエンティスト。Python、R、SQLを使ったデータ分析が専門です。',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
        location: '京都府',
        website: 'https://diana-analytics.com',
        isVerified: true
      }
    })
  ])

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
      update: {},
      create: category
    })
    console.log(`Created/Updated category: ${category.name}`)
  }

  // Create sample users
  const sampleUsers = [
    {
      email: 'developer@example.com',
      username: 'developer_pro',
      password: '$2a$12$rQDtYqVOHMF5B.kkdWjgfuc8XmWsY7jRZxhztvUFw1Fk7XYoHs7Z.',
      name: '田中 太郎',
      bio: 'フルスタック開発者として10年の経験があります。',
    },
    {
      email: 'designer@example.com', 
      username: 'design_master',
      password: '$2a$12$rQDtYqVOHMF5B.kkdWjgfuc8XmWsY7jRZxhztvUFw1Fk7XYoHs7Z.',
      name: '佐藤 花子',
      bio: 'UI/UXデザイナーです。ユーザー体験を重視したデザインを提供します。',
    }
  ]

  const createdUsers = []
  for (const userData of sampleUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData
    })
    createdUsers.push(user)
    console.log(`Created/Updated user: ${user.name}`)
  }

  // Create sample services with images
  const programmingCategoryId = (await prisma.category.findFirst({ where: { slug: 'programming' } }))!.id
  const webDesignCategoryId = (await prisma.category.findFirst({ where: { slug: 'web-design' } }))!.id
  const writingCategoryId = (await prisma.category.findFirst({ where: { slug: 'writing' } }))!.id
  const marketingCategoryId = (await prisma.category.findFirst({ where: { slug: 'marketing' } }))!.id
  
  const sampleServices = [
    {
      title: 'レスポンシブWebサイト制作',
      description: 'モダンでレスポンシブなWebサイトを制作いたします。React、Next.js、TailwindCSSを使用し、SEO対策も含めた高品質なサイトをお作りします。スマートフォン、タブレット、PC全てに対応した美しいデザインが特徴です。\n\n【提供内容】\n・レスポンシブデザイン\n・SEO最適化\n・高速表示対応\n・モダンなUI\n・クロスブラウザ対応',
      price: 85000,
      deliveryDays: 21,
      tags: ['React', 'Next.js', 'TypeScript', 'TailwindCSS', 'SEO'],
      images: [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=600&fit=crop'
      ],
      userId: users[0].id,
      categoryId: programmingCategoryId,
      isActive: true
    },
    {
      title: 'UI/UXデザイン完全パッケージ',
      description: 'ユーザーエクスペリエンスを重視したUI/UXデザインを提供します。ユーザー調査からワイヤーフレーム、プロトタイプ、最終デザインまで一貫してサポート。Figma、Adobe XDを使用し、デザインシステムも構築します。\n\n【サービス内容】\n・ユーザーリサーチ\n・ワイヤーフレーム作成\n・プロトタイプ制作\n・デザインシステム構築\n・ユーザビリティテスト',
      price: 120000,
      deliveryDays: 28,
      tags: ['UI/UX', 'Figma', 'Adobe XD', 'プロトタイプ', 'デザインシステム'],
      images: [
        'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1609921212029-bb5a28e60960?w=800&h=600&fit=crop'
      ],
      userId: users[1].id,
      categoryId: webDesignCategoryId,
      isActive: true
    },
    {
      title: 'SEO対策記事ライティング',
      description: 'SEOに強く、読者に価値を提供する高品質な記事を執筆します。キーワード調査から構成作成、執筆、最終チェックまで一貫してサポート。月間10万PVを達成した実績多数。専門分野はIT、ビジネス、ライフスタイルです。\n\n【提供内容】\n・キーワード調査\n・記事構成作成\n・SEO最適化記事執筆\n・内部リンク設計\n・アクセス解析レポート',
      price: 12000,
      deliveryDays: 7,
      tags: ['SEO', 'ライティング', 'コンテンツマーケティング', 'ブログ', 'WordPress'],
      images: [
        'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop'
      ],
      userId: users[2].id,
      categoryId: writingCategoryId,
      isActive: true
    },
    {
      title: 'データ分析・可視化サービス',
      description: 'Pythonを使った本格的なデータ分析と美しい可視化を提供します。売上データ、顧客データ、Webアクセスデータなど様々なデータを分析し、ビジネスインサイトを提供。Tableau、Power BI、Pythonのmatplotlibを使用します。\n\n【提供内容】\n・データクレンジング\n・統計分析\n・予測モデル構築\n・可視化ダッシュボード\n・レポート作成',
      price: 45000,
      deliveryDays: 14,
      tags: ['Python', 'データ分析', 'Tableau', 'Power BI', '統計', '機械学習'],
      images: [
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&h=600&fit=crop'
      ],
      userId: users[3].id,
      categoryId: (await prisma.category.findFirst({ where: { slug: 'data' } }))!.id,
      isActive: true
    },
    {
      title: 'プロフェッショナルロゴデザイン',
      description: 'あなたのブランドに最適なロゴデザインを制作します。3つのコンセプト案から選択可能、修正回数無制限、商用利用可能です。AI、EPS、PNG、JPEG全形式での納品。トレードマーク検索も含みます。\n\n【提供内容】\n・3つのコンセプト案\n・修正回数無制限\n・全形式でのデータ納品\n・トレードマーク検索\n・使用ガイドライン',
      price: 35000,
      deliveryDays: 10,
      tags: ['ロゴデザイン', 'ブランディング', 'Adobe Illustrator', 'ベクター', '商用利用OK'],
      images: [
        'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop'
      ],
      userId: users[1].id,
      categoryId: (await prisma.category.findFirst({ where: { slug: 'graphic-design' } }))!.id,
      isActive: true
    },
    {
      title: 'モバイルアプリ開発（React Native）',
      description: 'iOS/Android両対応のモバイルアプリを開発します。React Nativeを使用し、ネイティブレベルのパフォーマンスを実現。API連携、プッシュ通知、アプリストア申請サポートまで含みます。\n\n【提供内容】\n・クロスプラットフォーム対応\n・ネイティブパフォーマンス\n・API連携\n・プッシュ通知実装\n・ストア申請サポート',
      price: 200000,
      deliveryDays: 45,
      tags: ['React Native', 'モバイルアプリ', 'iOS', 'Android', 'API', 'プッシュ通知'],
      images: [
        'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600&fit=crop'
      ],
      userId: users[0].id,
      categoryId: programmingCategoryId,
      isActive: true
    },
    {
      title: 'SNS運用代行・コンテンツ制作',
      description: 'Instagram、Twitter、FacebookのSNS運用を代行します。コンテンツ企画から投稿、分析まで一貫サポート。フォロワー増加、エンゲージメント向上を実現します。月30投稿、レポート付き。\n\n【提供内容】\n・コンテンツ企画・制作\n・定期投稿代行\n・ハッシュタグ最適化\n・エンゲージメント分析\n・月次レポート作成',
      price: 55000,
      deliveryDays: 30,
      tags: ['SNS運用', 'Instagram', 'Twitter', 'Facebook', 'コンテンツマーケティング'],
      images: [
        'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop'
      ],
      userId: users[2].id,
      categoryId: marketingCategoryId,
      isActive: true
    },
    {
      title: 'WordPress制作・カスタマイズ',
      description: 'WordPressを使ったWebサイト制作・カスタマイズを行います。オリジナルテーマ開発、プラグイン開発、SEO対策、高速化対応。管理画面の使い方レクチャーも含みます。\n\n【提供内容】\n・オリジナルテーマ開発\n・プラグイン開発・設定\n・SEO対策実装\n・高速化チューニング\n・操作方法レクチャー',
      price: 75000,
      deliveryDays: 21,
      tags: ['WordPress', 'PHP', 'MySQL', 'カスタムテーマ', 'SEO対策'],
      images: [
        'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=600&fit=crop'
      ],
      userId: users[0].id,
      categoryId: programmingCategoryId,
      isActive: true
    }
  ]

  const createdServices = []
  for (const serviceData of sampleServices) {
    const service = await prisma.service.create({
      data: serviceData
    })
    createdServices.push(service)
    console.log(`Created service: ${service.title}`)
  }

  // Create sample reviews
  const reviewsData = [
    {
      rating: 5,
      comment: '期待以上の素晴らしいWebサイトを制作していただきました。レスポンシブデザインも完璧で、SEO対策もしっかりしています。また次回もお願いしたいです！',
      serviceId: createdServices[0].id,
      reviewerId: users[1].id,
      revieweeId: createdServices[0].userId
    },
    {
      rating: 5,
      comment: 'UI/UXデザインのクオリティが非常に高く、ユーザビリティも抜群です。デザインシステムまで作成していただき、開発チームも大満足です。',
      serviceId: createdServices[1].id,
      reviewerId: users[0].id,
      revieweeId: createdServices[1].userId
    },
    {
      rating: 4,
      comment: 'SEO記事のクオリティが高く、実際にPVが20%向上しました。キーワード選定も的確で、プロの仕事だと感じました。',
      serviceId: createdServices[2].id,
      reviewerId: users[3].id,
      revieweeId: createdServices[2].userId
    },
    {
      rating: 5,
      comment: 'データ分析レポートが非常に分かりやすく、ビジネス改善に直結する提案をいただきました。可視化も美しく、役員へのプレゼンでも好評でした。',
      serviceId: createdServices[3].id,
      reviewerId: users[0].id,
      revieweeId: createdServices[3].userId
    },
    {
      rating: 5,
      comment: 'ロゴデザインが素晴らしく、会社のブランドイメージが一気に向上しました。修正対応も丁寧で、最後まで満足のいく仕上がりでした。',
      serviceId: createdServices[4].id,
      reviewerId: users[2].id,
      revieweeId: createdServices[4].userId
    },
    {
      rating: 4,
      comment: 'React Nativeでのアプリ開発、技術力の高さを感じました。パフォーマンスも良く、ユーザーからの評価も上々です。',
      serviceId: createdServices[5].id,
      reviewerId: users[1].id,
      revieweeId: createdServices[5].userId
    },
    {
      rating: 5,
      comment: 'SNS運用を任せて正解でした。フォロワー数が3倍になり、売上にも直結しています。コンテンツの質が高く、エンゲージメントも向上しました。',
      serviceId: createdServices[6].id,
      reviewerId: users[3].id,
      revieweeId: createdServices[6].userId
    },
    {
      rating: 4,
      comment: 'WordPressサイトが期待通りの仕上がりになりました。管理画面の使い方も丁寧に教えていただき、助かりました。',
      serviceId: createdServices[7].id,
      reviewerId: users[1].id,
      revieweeId: createdServices[7].userId
    }
  ]

  for (let i = 0; i < reviewsData.length; i++) {
    const reviewData = reviewsData[i]
    try {
      const review = await prisma.review.create({
        data: reviewData
      })
      console.log(`Created review for service: ${review.serviceId}`)
    } catch (error) {
      console.log(`Review already exists or skipped for service: ${reviewData.serviceId}`)
      console.debug(error)
    }
  }

  console.log('Database seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
