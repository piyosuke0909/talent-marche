
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, email, subject, message } = body

        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { error: 'すべての項目を入力してください' },
                { status: 400 }
            )
        }

        const inquiry = await prisma.inquiry.create({
            data: {
                name,
                email,
                subject,
                message,
                status: 'PENDING',
            },
        })

        return NextResponse.json(inquiry, { status: 201 })
    } catch (error) {
        console.error('Inquiry create error:', error)
        return NextResponse.json(
            { error: 'お問い合わせの送信に失敗しました' },
            { status: 500 }
        )
    }
}
