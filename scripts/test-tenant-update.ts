
import Payjp from 'payjp'
import dotenv from 'dotenv'

dotenv.config()
const secretKey = process.env.PAYJP_SECRET_KEY
const tenantId = 'ten_2676be1788ae0113bb80757b2e1e'

async function run() {
    console.log(`Testing Tenant Update (Bank Info) for ${tenantId}...`)

    // Using raw fetch again to match parameters clearly
    const encodedKey = Buffer.from(secretKey + ':').toString('base64')

    const body = new URLSearchParams()
    body.append('bank_code', '0001')
    body.append('bank_branch_code', '001')
    body.append('bank_account_type', '普通') // '普通' or 'ordinary'? Docs say "普通" (string literal in Japanese) or 'ordinary'?
    // Curl examples often use "普通". SDK might map it.
    // Let's try '普通'.
    body.append('bank_account_number', '1234567')
    body.append('bank_account_holder_name', 'ヤマダ タロウ')

    try {
        // Method is POST (or PUT? API ref says Update is POST usually in Stripe-like APIs, but let's check. 
        // Stripe uses POST. PAY.JP usually POST.)
        const response = await fetch(`https://api.pay.jp/v1/tenants/${tenantId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${encodedKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        })

        if (response.ok) {
            const data = await response.json()
            console.log('Success! Updated Tenant:', JSON.stringify(data, null, 2))
        } else {
            console.log('Failed Status:', response.status)
            const err = await response.json()
            console.log('Error Body:', JSON.stringify(err, null, 2))
        }
    } catch (e: any) {
        console.error('Fetch Error:', e)
    }
}

run()
