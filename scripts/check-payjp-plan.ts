
import Payjp from 'payjp'
import dotenv from 'dotenv'

dotenv.config()

const secretKey = process.env.PAYJP_SECRET_KEY

console.log('Starting script...')

if (!secretKey) {
    console.error('PAYJP_SECRET_KEY is missing')
    process.exit(1)
}

try {
    const payjp = Payjp(secretKey)
    console.log('Payjp initialized.')

    await payjp.tenants.create({
        name: 'Test Tenant ' + Date.now(),
        // platform_fee_rate: '10.00' 
    } as any).then(tenant => {
        console.log('Success! Tenant created:', tenant.id)
    }).catch(e => {
        console.error('FAILED to create tenant:')
        console.error('Message:', e.message)
        if (e.response) {
            console.error('Full Error:', JSON.stringify(e.response.body, null, 2))
        }
    })

} catch (err) {
    console.error('Initialization Error:', err)
}
