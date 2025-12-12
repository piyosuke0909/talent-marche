/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  // Add timeout settings
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000,
})

export type EmailTemplate = 'otp' | 'order_received' | 'order_completed' | 'message_received' | 'password_reset' | 'refund_issued' | 'payout_processed'

interface EmailOptions {
  to: string
  subject: string
  template: EmailTemplate
  data: any
}

export async function sendEmail({ to, subject, template, data }: EmailOptions) {
  console.log(`[Mail] Attempting to send email to ${to} with template ${template}`)

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[Mail] Gmail credentials not found. Skipping email send.')
    console.warn(`[Mail] GMAIL_USER: ${process.env.GMAIL_USER ? 'Set' : 'Not Set'}`)
    console.warn(`[Mail] GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Not Set'}`)
    return
  }

  let html = ''

  switch (template) {
    case 'otp':
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>認証コードのお知らせ</h2>
          <p>Talent Marcheをご利用いただきありがとうございます。</p>
          <p>以下の認証コードを入力して、手続きを完了してください。</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${data.otp}</span>
          </div>
          <p>このコードの有効期限は10分間です。</p>
        </div>
      `
      break
    case 'password_reset':
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>パスワードリセット</h2>
          <p>Talent Marcheをご利用いただきありがとうございます。</p>
          <p>パスワードリセットのリクエストを受け付けました。</p>
          <p>以下の認証コードを入力して、パスワードの再設定を行ってください。</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${data.otp}</span>
          </div>
          <p>このコードの有効期限は10分間です。</p>
          <p>お心当たりがない場合は、このメールを破棄してください。</p>
        </div>
      `
      break
    case 'order_received':
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>ご注文ありがとうございます</h2>
          <p>${data.userName} 様</p>
          <p>以下の内容でご注文を承りました。</p>
          <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.serviceTitle}</h3>
            <p>金額: ¥${data.price.toLocaleString()}</p>
            <p>注文ID: ${data.orderId}</p>
          </div>
          <p>出品者からの連絡をお待ちください。</p>
        </div>
      `
      break
    case 'message_received':
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>新着メッセージのお知らせ</h2>
          <p>${data.userName} 様</p>
          <p>${data.senderName} さんからメッセージが届きました。</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #4b5563;">"${data.messagePreview}..."</p>
          </div>
          <a href="${process.env.NEXTAUTH_URL}/messages" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">メッセージを確認する</a>
        </div>
      `
      break
    case 'order_completed':
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>取引完了のお知らせ</h2>
          <p>${data.userName} 様</p>
          <p>以下の注文が完了しました。</p>
          <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.serviceTitle}</h3>
            <p>注文ID: ${data.orderId}</p>
          </div>
          <p>ご利用ありがとうございました。</p>
        </div>
      `
      break
    case 'refund_issued':
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>返金のお知らせ</h2>
          <p>${data.userName} 様</p>
          <p>以下の注文キャンセルに伴い、返金処理を行いました。</p>
          <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${data.serviceTitle}</h3>
            <p>返金額: ¥${data.amount.toLocaleString()}</p>
            <p>注文ID: ${data.orderId}</p>
          </div>
          <p>カード会社によって返金反映まで数日かかる場合があります。</p>
        </div>
      `
      break
    case 'payout_processed':
      html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>振込手続き完了のお知らせ</h2>
          <p>${data.userName} 様</p>
          <p>以下の振込申請を受理し、手続きを完了しました。</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 18px; font-weight: bold;">振込金額: ¥${data.amount.toLocaleString()}</p>
          </div>
          <p>口座への着金まで数営業日かかる場合があります。</p>
        </div>
      `
      break
  }

  try {
    console.log('[Mail] Sending via Nodemailer...')
    const info = await transporter.sendMail({
      from: `"Talent Marche" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    })
    console.log(`[Mail] Email sent successfully to ${to}. MessageId: ${info.messageId}`)
  } catch (error) {
    console.error('[Mail] Failed to send email:', error)
    throw error
  }
}
