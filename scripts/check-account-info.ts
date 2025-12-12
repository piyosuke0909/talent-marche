
import Payjp from 'payjp'
import dotenv from 'dotenv'

dotenv.config()

const secretKey = process.env.PAYJP_SECRET_KEY

if (!secretKey) {
    console.error('PAYJP_SECRET_KEY is missing')
    process.exit(1)
}

const payjp = Payjp(secretKey)

async function audit() {
    console.log('=== PAY.JP Account Audit ===')
    console.log('Key Prefix:', secretKey?.substring(0, 8) + '...')

    try {
        // 1. Check Account Info
        // Note: SDK might not have 'accounts' or 'account'. 
        // Trying generic path or known methods.
        // Usually 'payjp.account.retrieve()' or 'payjp.accounts.retrieve()'
        // If SDK fails, use raw fetch.

        console.log('\n[1] Fetching Account Info...')
        // We'll use raw fetch to be sure, as SDK types might be limited
        const encodedKey = Buffer.from(secretKey + ':').toString('base64')
        const res = await fetch('https://api.pay.jp/v1/accounts', {
            headers: { 'Authorization': `Basic ${encodedKey}` }
        })

        if (res.ok) {
            const data = await res.json()
            console.log('Account Data:', JSON.stringify(data, null, 2))
        } else {
            console.error('Failed to fetch account info:', res.status, res.statusText)
            const err = await res.json()
            console.error(err)
        }

    } catch (e: any) {
        console.error('Error fetching account:', e.message)
    }

    try {
        // 2. Check Tenants List
        console.log('\n[2] Listing Tenants (Limit 1)...')
        const list = await payjp.tenants.list({ limit: 1 })
        console.log('Tenants:', JSON.stringify(list, null, 2))
    } catch (e: any) {
        console.error('Failed to list tenants:', e.message)
        if (e.response) console.error(JSON.stringify(e.response.body, null, 2))
    }

    console.log('\n=== Audit Complete ===')
}

audit()
