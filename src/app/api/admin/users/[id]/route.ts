
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'

// PATCH /api/admin/users/[id]
// Update user status (Ban, Verify)
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerAuthSession()
        const { id } = await params

        if (!session || session.user.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const { isBanned, identityVerified } = body

        const updateData: any = {}
        if (typeof isBanned === 'boolean') updateData.isBanned = isBanned
        if (typeof identityVerified === 'boolean') updateData.identityVerified = identityVerified

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                isBanned: true,
                identityVerified: true
            }
        })

        return NextResponse.json(user)

    } catch (error) {
        console.error('Admin Update User API Error:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
