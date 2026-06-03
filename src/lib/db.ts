// DB接続処理: Prisma クライアントの初期化とシングルトン管理
// Next.js の開発時ホットリロードで接続が増えすぎないよう globalThis にキャッシュする

import { PrismaClient } from '@prisma/client'

// グローバルスコープに Prisma インスタンスを保持する型定義
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 既存インスタンスがあればそれを使い、なければ新規作成（シングルトンパターン）
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'], // 実行されたSQLクエリをコンソールに出力（デバッグ用）
  })

// 本番環境以外ではグローバルにキャッシュしてホットリロード時の接続増加を防ぐ
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
