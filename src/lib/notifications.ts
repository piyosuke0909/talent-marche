
import { prisma } from '@/lib/db'

type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'ORDER' | 'MESSAGE'

export async function createNotification({
    userId,
    title,
    message,
    type = 'INFO',
    link = null
}: {
    userId: string
    title: string
    message: string
    type?: NotificationType
    link?: string | null
}) {
    try {
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
        console.error('Failed to create notification:', error)
    }
}
