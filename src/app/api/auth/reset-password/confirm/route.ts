import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function PUT(req: Request) {
    try {
        const { email, otp, newPassword } = await req.json()

        if (!email || !otp || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Verify OTP
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

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12)

        // Update user password
        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword
            }
        })

        // Delete used token
        await prisma.verificationToken.delete({
            where: { id: verificationToken.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Password Reset Confirm Error:', error)
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
    }
}
