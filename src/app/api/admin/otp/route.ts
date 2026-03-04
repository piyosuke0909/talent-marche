import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/mail'
import crypto from 'crypto'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ''

// POST: Send OTP to admin email
export async function POST() {
    try {
        const session = await getServerAuthSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
        }

        // Check admin role
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, email: true },
        })
        if (user?.role !== 'ADMIN') {
            return NextResponse.json({ error: '管理者権限がありません' }, { status: 403 })
        }

        if (!ADMIN_EMAIL) {
            return NextResponse.json({ error: 'ADMIN_EMAILが設定されていません' }, { status: 500 })
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString()
        const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        // Delete existing tokens for admin
        await prisma.verificationToken.deleteMany({
            where: { identifier: `admin_otp_${session.user.id}` },
        })

        // Create new token
        await prisma.verificationToken.create({
            data: {
                identifier: `admin_otp_${session.user.id}`,
                token: otp,
                expires,
            },
        })

        // Send OTP to admin email
        await sendEmail({
            to: ADMIN_EMAIL,
            subject: '【Talent Marche】管理者認証コード',
            template: 'otp',
            data: { otp },
        })

        // Mask email for display
        const parts = ADMIN_EMAIL.split('@')
        const maskedEmail = parts[0].substring(0, 3) + '***@' + parts[1]

        return NextResponse.json({ success: true, maskedEmail })
    } catch (error) {
        console.error('Admin OTP send error:', error)
        return NextResponse.json({ error: 'OTPの送信に失敗しました' }, { status: 500 })
    }
}

// PUT: Verify OTP and return success (client will set cookie)
export async function PUT(req: Request) {
    try {
        const session = await getServerAuthSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
        }

        const { otp } = await req.json()
        if (!otp) {
            return NextResponse.json({ error: 'コードを入力してください' }, { status: 400 })
        }

        const token = await prisma.verificationToken.findFirst({
            where: {
                identifier: `admin_otp_${session.user.id}`,
                token: otp,
                expires: { gt: new Date() },
            },
        })

        if (!token) {
            return NextResponse.json({ error: '無効または期限切れのコードです' }, { status: 400 })
        }

        // Delete used token
        await prisma.verificationToken.delete({
            where: { id: token.id },
        })

        // Set HttpOnly cookie for 1 hour
        const response = NextResponse.json({ success: true })
        response.cookies.set('admin_otp_verified', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60, // 1 hour
            path: '/admin',
        })

        return response
    } catch (error) {
        console.error('Admin OTP verify error:', error)
        return NextResponse.json({ error: '認証に失敗しました' }, { status: 500 })
    }
}
