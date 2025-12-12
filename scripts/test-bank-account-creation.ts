
import Payjp from 'payjp'
import dotenv from 'dotenv'

dotenv.config()
const secretKey = process.env.PAYJP_SECRET_KEY
const tenantId = 'ten_2676be1788ae0113bb80757b2e1e'

async function run() {
    console.log(`Testing Bank Account creation for ${tenantId}...`)

    // We'll use raw fetch for creating bank account to ensure detailed error reading
    const encodedKey = Buffer.from(secretKey + ':').toString('base64')

    const body = new URLSearchParams()
    body.append('bank_code', '0001')
    body.append('branch_code', '001')
    body.append('account_type', 'ordinary') // 普通
    body.append('account_number', '1234567')
    body.append('account_holder_name', 'ヤマダ タロウ') // Katakana

    try {
        const response = await fetch(`https://api.pay.jp/v1/tenants/${tenantId}/bank_accounts`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${encodedKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        })

        if (response.ok) {
            const data = await response.json()
            console.log('Success! Bank Account ID:', data.id)
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
