'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { SvgIconProps } from '@mui/material'
import HelpOutlined from '@mui/icons-material/HelpOutlined'
import ExpandMore from '@mui/icons-material/ExpandMore'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ContactSupport from '@mui/icons-material/ContactSupport'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined'
import SellOutlined from '@mui/icons-material/SellOutlined'
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined'
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined'
import BadgeOutlined from '@mui/icons-material/BadgeOutlined'
import ForumOutlined from '@mui/icons-material/ForumOutlined'
import ReportProblemOutlined from '@mui/icons-material/ReportProblemOutlined'

interface FaqItem {
  question: string
  answer: string
}

interface FaqSection {
  title: string
  Icon: React.ComponentType<SvgIconProps>
  color: string
  items: FaqItem[]
}

const faqData: FaqSection[] = [
  {
    title: 'Talent Marcheとは',
    Icon: StorefrontOutlined,
    color: '#3b82f6',
    items: [
      {
        question: 'Talent Marcheとはどんなサービスですか？',
        answer:
          'Talent Marcheは、スキルを持つフリーランサー（出品者）と、仕事を依頼したいクライアント（購入者）をつなぐスキルマーケットプレイスです。デザイン・開発・ライティングなど幅広いカテゴリのサービスを売買できます。',
      },
      {
        question: '利用料金はかかりますか？',
        answer:
          '会員登録・サービス閲覧は無料です。サービス購入時には表示価格のみご負担いただきます。出品は無料ですが、受注完了時にプラットフォーム手数料がかかる場合があります。詳細は利用規約をご確認ください。',
      },
      {
        question: '会員登録はどのようにすればいいですか？',
        answer:
          'トップページの「サインイン」から「アカウントを作成」を選び、メールアドレスとパスワードを入力するだけで登録できます。登録後にメールアドレスの確認が必要となる場合があります。',
      },
    ],
  },
  {
    title: 'サービスの購入',
    Icon: ShoppingCartOutlined,
    color: '#10b981',
    items: [
      {
        question: 'サービスを購入するにはどうすればいいですか？',
        answer:
          '気になるサービスのページを開き、「購入する」ボタンをクリックしてください。出品者へのメッセージを添えてご注文いただけます。ログインが必要です。',
      },
      {
        question: '価格の交渉はできますか？',
        answer:
          'サービスページの「価格交渉」ボタンから希望金額を提案できます。出品者が承認した場合、交渉後の金額で購入が可能になります。',
      },
      {
        question: '注文後のキャンセルはできますか？',
        answer:
          '注文ステータスが「進行中」になる前であれば、出品者との合意のもとキャンセルが可能です。支払い済みの場合は返金ポリシーに従います。不明な点はお問い合わせください。',
      },
      {
        question: '注文の進捗はどこで確認できますか？',
        answer:
          '「注文一覧」ページから現在の注文状況（PENDING / IN_PROGRESS / COMPLETED / CANCELLED）をリアルタイムで確認できます。',
      },
    ],
  },
  {
    title: 'サービスの出品',
    Icon: SellOutlined,
    color: '#8b5cf6',
    items: [
      {
        question: 'サービスを出品するにはどうすればいいですか？',
        answer:
          'ヘッダーの「出品する」からサービス作成フォームにアクセスし、タイトル・説明・価格・納期・カテゴリ・画像を入力して登録してください。登録後すぐに公開されます。',
      },
      {
        question: 'いくつまでサービスを登録できますか？',
        answer:
          '現在、登録数の上限は設けていません。ただし、利用規約に違反するサービスは非公開・削除される場合があります。',
      },
      {
        question: 'サービスの内容を後から編集できますか？',
        answer:
          'ダッシュボードの「出品・サービス管理」から、いつでも編集・非公開化が可能です。',
      },
      {
        question: '売上はいつ受け取れますか？',
        answer:
          '注文が「完了（COMPLETED）」になった後、ダッシュボードの「売上管理・振込申請」から振込申請が可能です。振込にはPAY.JPの審査と銀行振込処理の時間（数営業日）がかかります。',
      },
    ],
  },
  {
    title: '依頼の投稿と提案',
    Icon: AssignmentOutlined,
    color: '#f59e0b',
    items: [
      {
        question: '依頼の投稿とは何ですか？',
        answer:
          '「依頼する」は、クライアントが「〇〇をやってほしい」という仕事内容を先に投稿し、フリーランサーから提案（プロポーザル）を募る機能です。サービス購入の逆引きのようなマーケットです。',
      },
      {
        question: '依頼に提案するにはどうすればいいですか？',
        answer:
          '依頼一覧から気になる依頼を開き、「提案する」ボタンから希望価格・納期・メッセージを送信してください。依頼者が提案を承認すると取引が開始されます。',
      },
      {
        question: '依頼に予算を設定しないといけませんか？',
        answer:
          '予算・締切・所在地はすべて任意項目です。「相談して決めたい」場合は未入力のまま投稿できます。',
      },
    ],
  },
  {
    title: '支払い・振込',
    Icon: PaymentsOutlined,
    color: '#06b6d4',
    items: [
      {
        question: '使える支払い方法は何ですか？',
        answer:
          'クレジットカード（VISA・Mastercard・JCB等）をご利用いただけます。決済はPAY.JPにより安全に処理されます。',
      },
      {
        question: '振込申請の方法を教えてください。',
        answer:
          'ダッシュボード →「売上管理・振込申請」から銀行口座情報を登録し、振込申請を行ってください。振込にはPAY.JPのテナント審査が必要です。初回は時間がかかる場合があります。',
      },
      {
        question: '本人確認をしないと振込できないのですか？',
        answer:
          'PAY.JPの規約により、振込（出金）には本人確認の完了が必要です。設定メニューの「本人確認」から書類をアップロードしてください。',
      },
    ],
  },
  {
    title: '本人確認',
    Icon: BadgeOutlined,
    color: '#6366f1',
    items: [
      {
        question: '本人確認が必要な理由は何ですか？',
        answer:
          '安全な取引環境の維持と、振込（出金）に必要なPAY.JPの審査要件を満たすために本人確認を実施しています。',
      },
      {
        question: '使える本人確認書類は何ですか？',
        answer:
          '運転免許証・パスポート・マイナンバーカードの3種類に対応しています。書類の有効期限内のものをご用意ください。',
      },
      {
        question: '本人確認の審査にはどれくらい時間がかかりますか？',
        answer:
          '通常、提出から数営業日以内に審査結果をお知らせします。審査中は一部機能が制限される場合があります。',
      },
      {
        question: '本人確認が却下された場合はどうすればいいですか？',
        answer:
          '却下理由が管理者からコメントで通知されます。書類の見切れや不鮮明が原因のことが多いため、より鮮明な画像で再申請してください。',
      },
    ],
  },
  {
    title: 'メッセージ・やり取り',
    Icon: ForumOutlined,
    color: '#ec4899',
    items: [
      {
        question: '出品者に直接連絡するにはどうすればいいですか？',
        answer:
          'サービスページまたはユーザープロフィールの「メッセージを送る」ボタンからDMを送れます。ログインが必要です。',
      },
      {
        question: 'メッセージの通知はどこで確認できますか？',
        answer:
          'ヘッダーのベルアイコンから未読通知を確認できます。新しいメッセージや注文の更新があった際に通知されます。',
      },
      {
        question: 'Marche AI（チャットウィジェット）とは何ですか？',
        answer:
          '画面右下のチャットアイコンから、サービス探しや使い方についてAIアシスタントに質問できます。24時間対応しており、商品検索のサポートをします。',
      },
    ],
  },
  {
    title: 'トラブル・その他',
    Icon: ReportProblemOutlined,
    color: '#ef4444',
    items: [
      {
        question: 'トラブルが発生した場合はどうすればいいですか？',
        answer:
          '注文ステータスが「DISPUTED（異議あり）」に変更され、運営が仲裁します。まずは出品者・購入者間でメッセージにて解決を試み、解決しない場合はお問い合わせフォームからご連絡ください。',
      },
      {
        question: 'アカウントが停止されました。どうすればいいですか？',
        answer:
          '利用規約違反が確認された場合にアカウントが停止されることがあります。心当たりがない場合はお問い合わせフォームより詳細をお知らせください。',
      },
      {
        question: 'パスワードを忘れました。',
        answer:
          'ログイン画面の「パスワードをお忘れですか？」からメールアドレスを入力するとリセット用のメールが届きます。メールが届かない場合は迷惑メールフォルダもご確認ください。',
      },
      {
        question: 'その他の問い合わせはどこにすればいいですか？',
        answer:
          'このページで解決しない場合は、お問い合わせフォームよりお気軽にご連絡ください。',
      },
    ],
  },
]

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="divide-y divide-gray-100">
      {items.map((item, index) => (
        <div key={index}>
          <button
            className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-gray-50"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <span className="font-medium text-gray-800">{item.question}</span>
            {openIndex === index ? (
              <ExpandLess sx={{ fontSize: 20, color: '#3b82f6', flexShrink: 0 }} />
            ) : (
              <ExpandMore sx={{ fontSize: 20, color: '#9ca3af', flexShrink: 0 }} />
            )}
          </button>
          {openIndex === index && (
            <div className="px-5 pb-5 pt-1 text-sm leading-relaxed text-gray-600">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 py-14 text-center text-white">
        <div className="mx-auto flex justify-center mb-4">
          <HelpOutlined sx={{ fontSize: 48, opacity: 0.9 }} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">ヘルプセンター</h1>
        <p className="mt-2 text-blue-100">よくある質問をまとめました</p>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-12">
        {/* Section navigation */}
        <div className="mb-8 flex flex-wrap gap-2">
          {faqData.map((section) => (
            <button
              key={section.title}
              onClick={() => {
                const el = document.getElementById(section.title)
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600"
            >
              <section.Icon sx={{ fontSize: 16, color: section.color }} />
              {section.title}
            </button>
          ))}
        </div>

        {/* FAQ sections */}
        <div className="space-y-6">
          {faqData.map((section) => (
            <section
              key={section.title}
              id={section.title}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                  <section.Icon sx={{ fontSize: 20, color: section.color }} />
                  {section.title}
                </h2>
              </div>
              <FaqAccordion items={section.items} />
            </section>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 rounded-2xl border border-blue-100 bg-blue-50 p-8 text-center">
          <ContactSupport sx={{ fontSize: 36, color: '#3b82f6', display: 'block', margin: '0 auto 12px' }} />
          <h3 className="text-lg font-bold text-gray-900">解決しませんでしたか？</h3>
          <p className="mt-1 text-sm text-gray-600">
            お問い合わせフォームからお気軽にご連絡ください。
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-block rounded-full bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            お問い合わせ
          </Link>
        </div>
      </div>
    </div>
  )
}
