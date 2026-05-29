import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-white border-t mt-8">
      <div className="container mx-auto px-6 py-8 text-sm text-gray-600">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div>© 2025 Talent Marche</div>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-gray-900">
              利用規約
            </Link>
            <Link href="/privacy" className="hover:text-gray-900">
              プライバシー
            </Link>
            <Link href="/commercial" className="hover:text-gray-900">
              特商法に基づく表記
            </Link>
            <Link href="/contact" className="hover:text-gray-900 font-medium text-blue-600">
              お問い合わせ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}