import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Users, Banknote, TrendingUp, Shield, FileCheck } from 'lucide-react'

async function getAdminStats() {
    const [
        totalUsers,
        totalOrders,
        pendingPayouts,
        pendingVerifications,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.order.count(),
        prisma.payout.count({ where: { status: 'PENDING' } }),
        prisma.identityVerification.count({ where: { status: 'PENDING' } }),
    ])

    const completedOrders = await prisma.order.findMany({
        where: { status: 'COMPLETED' },
        select: { totalAmount: true },
    })
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0)

    return {
        totalUsers,
        totalOrders,
        totalRevenue,
        pendingPayouts,
        pendingVerifications,
    }
}

const adminPages = [
    {
        title: 'ユーザー管理',
        description: 'ユーザーの検索・BAN・本人確認状態の確認',
        href: '/admin/users',
        icon: Users,
        color: 'bg-blue-500',
    },
    {
        title: '本人確認審査',
        description: '身分証明書の確認・承認・却下',
        href: '/admin/identity-verification',
        icon: FileCheck,
        color: 'bg-emerald-500',
    },
    {
        title: '振込申請管理',
        description: '出金申請の承認・却下',
        href: '/admin/payouts',
        icon: Banknote,
        color: 'bg-amber-500',
    },
    {
        title: '収益管理',
        description: 'GMV・手数料収益・取引一覧',
        href: '/admin/revenue',
        icon: TrendingUp,
        color: 'bg-purple-500',
    },
]

export default async function AdminDashboardPage() {
    const session = await getServerAuthSession()
    if (!session || session.user.role !== 'ADMIN') {
        redirect('/')
    }

    const stats = await getAdminStats()

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex items-center gap-3">
                    <Shield className="w-8 h-8 text-indigo-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>
                        <p className="text-sm text-gray-500">Talent Marche 管理パネル</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <p className="text-sm text-gray-500">総ユーザー数</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <p className="text-sm text-gray-500">総注文数</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <p className="text-sm text-gray-500">総売上</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">¥{stats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <p className="text-sm text-gray-500">振込待ち</p>
                        <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingPayouts}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <p className="text-sm text-gray-500">本人確認待ち</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.pendingVerifications}</p>
                    </div>
                </div>

                {/* Navigation Cards */}
                <h2 className="text-lg font-semibold text-gray-900 mb-4">管理メニュー</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {adminPages.map((page) => (
                        <Link
                            key={page.href}
                            href={page.href}
                            className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-gray-200 transition-all"
                        >
                            <div className="flex items-start gap-4">
                                <div className={`${page.color} p-3 rounded-lg text-white`}>
                                    <page.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                        {page.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">{page.description}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
