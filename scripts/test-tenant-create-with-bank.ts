
import Payjp from 'payjp'
import dotenv from 'dotenv'

dotenv.config()
const secretKey = process.env.PAYJP_SECRET_KEY

async function run() {
    console.log(`Testing Tenant Creation WITH Bank Info...`)

    const encodedKey = Buffer.from(secretKey + ':').toString('base64')

    // Create params
    const body = new URLSearchParams()
    body.append('name', 'Test Bank Tenant ' + Date.now())
    body.append('bank_account[bank_code]', '0001')
    body.append('bank_account[bank_branch_code]', '001')
    body.append('bank_account[bank_account_type]', '普通')
    body.append('bank_account[bank_account_number]', '1234567')
    body.append('bank_account[bank_account_holder_name]', 'ヤマダ タロウ')
    // No fee rate

    try {
        const response = await fetch(`https://api.pay.jp/v1/tenants`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${encodedKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        })

        if (response.ok) {
            const data = await response.json()
            console.log('Success! Created Tenant:', JSON.stringify(data, null, 2))
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
