
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NegotiationList from '@/components/dashboard/NegotiationList'

export default async function NegotiationsPage() {
    const session = await getServerAuthSession()

    if (!session?.user) {
        redirect('/auth/signin?callbackUrl=/dashboard/negotiations')
    }

    // Fetch received negotiations (where I am the seller)
    // And also maybe sent negotiations? For now, focused on Seller accepting.
    const receivedNegotiations = await prisma.priceNegotiation.findMany({
        where: {
            service: {
                userId: session.user.id
            }
        },
        include: {
            service: {
                select: {
                    id: true,
                    title: true,
                    price: true,
                    images: true
                }
            },
            user: {
                select: {
                    id: true,
                    name: true,
                    image: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">値下げ交渉一覧</h1>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <NegotiationList negotiations={JSON.parse(JSON.stringify(receivedNegotiations))} />
            </div>
        </div>
    )
}
