import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/mail'
import crypto from 'crypto'

export async function POST(req: Request) {
    try {
        const { email } = await req.json()

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            // Return success even if user doesn't exist to prevent email enumeration
            return NextResponse.json({ success: true })
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString()
        const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        // Save to database (using VerificationToken model)
        // Delete existing tokens for this email first
        await prisma.verificationToken.deleteMany({
            where: { identifier: email }
        })

        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token: otp,
                expires
            }
        })

        // Send Email
        await sendEmail({
            to: email,
            subject: '【Talent Marche】パスワードリセット',
            template: 'password_reset',
            data: { otp },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Password Reset Error:', error)
        return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
    }
}
