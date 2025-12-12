
import Payjp from 'payjp'
import dotenv from 'dotenv'

dotenv.config()
const secretKey = process.env.PAYJP_SECRET_KEY
const payjp = Payjp(secretKey!)

async function run() {
    try {
        const list = await payjp.tenants.list({ limit: 3 })
        if (list.data.length > 0) {
            console.log('ID:', list.data[0].id)
        } else {
            console.log('No tenants found')
        }
    } catch (e) {
        console.error(e)
    }
}
run()
