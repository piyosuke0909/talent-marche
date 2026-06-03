// 通知作成処理: 各APIから呼び出す共通の通知生成ヘルパー

import { prisma } from '@/lib/db'

// 通知の種類定義
// INFO=一般, SUCCESS=成功, WARNING=警告, ERROR=エラー, ORDER=注文関連, MESSAGE=メッセージ関連
type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'ORDER' | 'MESSAGE'

// 通知レコード作成処理: 指定ユーザーに通知を1件追加する
export async function createNotification({
    userId,
    title,
    message,
    type = 'INFO',  // デフォルトは INFO
    link = null     // クリック時の遷移先URL（任意）
}: {
    userId: string
    title: string
    message: string
    type?: NotificationType
    link?: string | null
}) {
    try {
        // DB に通知レコードを挿入
        await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                link
            }
        })
    } catch (error) {
        // 通知の失敗はユーザー体験に直接影響しないためエラーログのみ
        console.error('Failed to create notification:', error)
    }
}
