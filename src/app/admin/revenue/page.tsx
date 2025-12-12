import { getServerAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"

export default async function RevenuePage() {
    const session = await getServerAuthSession()

    if (!session || (session.user as any).role !== "ADMIN") {
        redirect("/")
    }

    // Fetch all completed tenant orders
    const orders = await prisma.order.findMany({
        where: {
            isTenantPayment: true,
            status: {
                in: ["COMPLETED", "IN_PROGRESS"]
            },
            // Note: Refunded orders should probably be excluded or calculated differently,
            // but simpler to just exclude Cancelled.
        },
        select: {
            id: true,
            totalAmount: true,
            createdAt: true,
            status: true
        },
        orderBy: { createdAt: "desc" }
    })

    // Calculate platform revenue (10%)
    const totalGMV = orders.reduce((sum, order) => sum + order.totalAmount, 0)
    const totalRevenue = Math.floor(totalGMV * 0.1)

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">プラットフォーム収益管理</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-gray-500 text-sm font-medium mb-2">総流通額 (GMV)</h2>
                    <p className="text-3xl font-bold text-gray-900">¥{totalGMV.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">※自動振込対象の取引のみ</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-gray-500 text-sm font-medium mb-2">収益 (見込)</h2>
                    <p className="text-3xl font-bold text-green-600">¥{totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">※手数料 10%</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-gray-500 text-sm font-medium mb-2">取引件数</h2>
                    <p className="text-3xl font-bold text-gray-900">{orders.length} 件</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">直近の取引</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="px-6 py-3 font-medium">注文ID</th>
                                <th className="px-6 py-3 font-medium">日時</th>
                                <th className="px-6 py-3 font-medium">金額</th>
                                <th className="px-6 py-3 font-medium">手数料収益</th>
                                <th className="px-6 py-3 font-medium">ステータス</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-xs">{order.id}</td>
                                    <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">¥{order.totalAmount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-green-600 font-medium">¥{Math.floor(order.totalAmount * 0.1).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        データがありません
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
