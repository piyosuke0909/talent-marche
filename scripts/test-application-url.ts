
import Payjp from 'payjp'
import dotenv from 'dotenv'

dotenv.config()
const secretKey = process.env.PAYJP_SECRET_KEY
const tenantId = 'ten_2676be1788ae0113bb80757b2e1e'

async function run() {
    console.log(`Testing Application URL creation for ${tenantId}...`)

    // Use raw fetch to be sure
    const encodedKey = Buffer.from(secretKey + ':').toString('base64')
    try {
        const response = await fetch(`https://api.pay.jp/v1/tenants/${tenantId}/application_urls`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${encodedKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        if (response.ok) {
            const data = await response.json()
            console.log('Success! URL:', data.url)
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
