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

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString()
        const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        // Save to database (using VerificationToken model)
        // Note: VerificationToken usually uses a composite key of (identifier, token)
        await prisma.verificationToken.upsert({
            where: {
                identifier_token: {
                    identifier: email,
                    token: otp // This might be tricky if we want to rotate tokens, but upsert works for now
                }
            },
            update: {
                token: otp,
                expires,
            },
            create: {
                identifier: email,
                token: otp,
                expires,
            },
        })

        // Since upsert requires a unique constraint on identifier_token, and we want to overwrite any existing token for this email,
        // we might actually want to delete old tokens first or just use a different logic.
        // However, standard NextAuth VerificationToken uses (identifier, token) as unique.
        // Let's try to delete existing tokens for this email first to be clean, 
        // but Prisma's deleteMany doesn't conflict.
        // Actually, for OTP, we just want "latest valid token for this email".
        // Let's simplify: Delete all tokens for this email, then create a new one.

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
            subject: '【Talent Marche】認証コードのお知らせ',
            template: 'otp',
            data: { otp },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('OTP Error:', error)
        return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const { email, otp } = await req.json()

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
        }

        const verificationToken = await prisma.verificationToken.findFirst({
            where: {
                identifier: email,
                token: otp,
                expires: { gt: new Date() }
            }
        })

        if (!verificationToken) {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
        }

        // Verification successful
        // In a real app, you might want to delete the token here or mark the user as verified
        await prisma.verificationToken.delete({
            where: { id: verificationToken.id }
        })

        // Example: Mark user as verified if they exist
        await prisma.user.updateMany({
            where: { email },
            data: { isVerified: true }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('OTP Verification Error:', error)
        return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 })
    }
}
