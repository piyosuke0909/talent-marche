import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

// Webhook handling for PAY.JP
export async function POST(req: Request) {
    try {
        const bodyText = await req.text() // Need raw body for signature verification
        const signature = req.headers.get('x-payjp-webhook-signature')

        // Disable signature check in development only if needed, but best to keep it active if secret is set
        if (process.env.PAYJP_WEBHOOK_SECRET) {
            const expectedSignature = crypto
                .createHmac('sha256', process.env.PAYJP_WEBHOOK_SECRET)
                .update(bodyText)
                .digest('hex')

            if (signature !== expectedSignature) {
                console.error('Invalid PAY.JP signature')
                return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
            }
        }

        const event = JSON.parse(bodyText)

        console.log('PAY.JP Webhook:', event.type, event.data?.id)

        if (!event || !event.type) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
        }

        switch (event.type) {
            case 'charge.succeeded':
                // Payment succeeded. 
                const charge = event.data
                const orderId = charge.metadata?.orderId

                if (orderId) {
                    await prisma.order.update({
                        where: { id: orderId },
                        data: {
                            status: 'IN_PROGRESS',
                            paymentId: charge.id,
                            isTenantPayment: !!charge.tenant // If tenant ID exists, it is a tenant payment
                        }
                    })
                }
                break

            case 'charge.failed':
                // Payment failed.
                const failedCharge = event.data
                const failedOrderId = failedCharge.metadata?.orderId
                if (failedOrderId) {
                    console.log(`Payment failed for Order ${failedOrderId}`)
                }
                break

            case 'charge.refunded':
                // Refunded.
                break
        }

        return NextResponse.json({ received: true })

    } catch (error) {
        console.error('Webhook processing error:', error)
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
    }
}
