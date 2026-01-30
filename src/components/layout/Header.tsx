
'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { Search, Menu, X, ChevronDown, User, Settings, LogOut, Wallet, Bell, Sparkles } from 'lucide-react'

// Notification Types
interface NotificationItem {
  id: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
  type: string
}

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const searchParams = useSearchParams()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Poll Notifications
  useEffect(() => {
    if (status !== 'authenticated') return

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications)
          setUnreadCount(data.unreadCount)
        }
      } catch (e) {
        console.error(e)
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [status])

  useEffect(() => {
    // Sync search query with URL params
    const query = searchParams?.get('search')
    if (query) {
      setSearchQuery(query)
    }
  }, [searchParams])

  const sessionUser =
    session?.user && typeof session.user === 'object'
      ? (session.user as { name?: string | null; email?: string | null; image?: string | null; role?: string })
      : null

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      // Mark as read
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id })
      })
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    setIsNotificationOpen(false)
    if (n.link) router.push(n.link)
  }

  const markAllAsRead = async () => {
    await fetch('/api/notifications', { method: 'PUT', body: '{}' })
    setNotifications(prev => prev.map(item => ({ ...item, isRead: true })))
    setUnreadCount(0)
  }

  // Use mounted check to prevent hydration mismatch
  if (!mounted || status === ('loading' as any)) {
    return (
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse mx-auto" />
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <Link href="/" className="text-2xl font-bold hover:underline">
            Talent Marche
          </Link>
          <form onSubmit={(e) => {
            e.preventDefault()
            const query = searchQuery.trim()

            if (!query) return

            if (query.startsWith('ID:')) {
              const id = query.replace('ID:', '').trim()
              if (id) {
                router.push(`/users/${id}`)
                return
              }
            }

            router.push(`/services?search=${encodeURIComponent(query)}`)
          }} className="hidden md:block relative w-full max-w-xs md:max-w-md lg:max-w-lg">
            <input
              name="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="サービスを探す (ID:xxx でユーザー検索)"
              className="pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
            <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2">
              <Search className="w-5 h-5 text-gray-400" />
            </button>
          </form>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="/services/create"
            className={`${pathname === '/services/create' ? 'text-blue-600 font-bold' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
          >
            出品する
          </Link>
          <Link
            href="/requests"
            className={`${pathname === '/requests' ? 'text-blue-600 font-bold' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
          >
            依頼一覧
          </Link>
          <Link
            href="/messages"
            className={`${pathname.startsWith('/messages') ? 'text-blue-600 font-bold' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
          >
            メッセージ
          </Link>

          {status === 'loading' ? (
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
          ) : sessionUser ? (
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                >
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center border border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] flex flex-col">
                    <div className="p-3 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                      <h3 className="font-semibold text-gray-700">お知らせ</h3>
                      <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline">既読にする</button>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">通知はありません</div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                          >
                            <div className="text-sm font-medium text-gray-900 mb-1">{n.title}</div>
                            <div className="text-xs text-gray-600 line-clamp-2">{n.message}</div>
                            <div className="mt-1 text-[10px] text-gray-400">
                              {new Date(n.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <Image
                    src={sessionUser.image || '/images/default-avatar.svg'}
                    alt="プロフィール画像"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border-2 border-gray-300 object-cover"
                  />
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{sessionUser?.name}</p>
                      <p className="text-sm text-gray-600">{sessionUser?.email}</p>
                    </div>

                    <div className="py-2">
                      <Link
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <User className="w-4 h-4 mr-3" />
                        プロフィール
                      </Link>
                      <Link
                        href="/dashboard"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <Settings className="w-4 h-4 mr-3" />
                        ダッシュボード
                      </Link>
                      <Link
                        href="/dashboard/services"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <Sparkles className="w-4 h-4 mr-3" />
                        出品・サービス管理
                      </Link>
                      {sessionUser.role === 'ADMIN' && (
                        <Link
                          href="/admin/users"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={() => setIsProfileDropdownOpen(false)}
                        >
                          <User className="w-4 h-4 mr-3" />
                          ユーザー管理 (Admin)
                        </Link>
                      )}
                      <Link
                        href="/dashboard/wallet"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <Wallet className="w-4 h-4 mr-3" />
                        売上管理・振込申請
                      </Link>
                    </div>

                    <div className="border-t border-gray-200 pt-2">
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false)
                          signOut()
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        ログアウト
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link
              href="/auth/signin"
              className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600"
            >
              サインイン
            </Link>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sub Navigation */}
      <div className="bg-white border-t">
        <div className="container mx-auto px-4 py-3 flex flex-wrap justify-between items-center text-sm md:text-base">
          <div className="flex flex-wrap gap-4 md:space-x-8">
            <Link
              href="/categories"
              className={`${pathname === '/categories' ? 'text-blue-600 font-bold' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
            >
              カテゴリー
            </Link>
            <Link
              href="/favorites"
              className={`${pathname === '/favorites' ? 'text-blue-600 font-bold' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
            >
              お気に入りから探す
            </Link>
            <Link
              href="/requests"
              className={`${pathname.startsWith('/requests') ? 'text-blue-600 font-bold' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
            >
              依頼をする
            </Link>
            <Link
              href="/services"
              className={`${pathname.startsWith('/services') ? 'text-blue-600 font-bold' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
            >
              コンテンツを探す
            </Link>

            <Link
              href="/marche"
              className={`flex items-center gap-1 font-bold hover:opacity-80 ${pathname === '/marche'
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Marche (AI)
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 md:hidden flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
            <span className="text-xl font-bold text-gray-900 dark:text-white">メニュー</span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Search in Menu for Mobile */}
            <div className="mb-6">
              <form onSubmit={(e) => {
                e.preventDefault()
                const query = searchQuery.trim()
                if (!query) return
                if (query.startsWith('ID:')) {
                  const id = query.replace('ID:', '').trim()
                  if (id) router.push(`/users/${id}`)
                } else {
                  router.push(`/services?search=${encodeURIComponent(query)}`)
                }
                setIsMobileMenuOpen(false)
              }} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="検索..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </form>
            </div>

            <div className="space-y-4">
              <div className="font-semibold text-gray-400 text-xs uppercase tracking-wider">サービス</div>
              <Link href="/services/create" onClick={() => setIsMobileMenuOpen(false)} className="block text-lg font-medium text-gray-800 dark:text-gray-200">
                出品する
              </Link>
              <Link href="/requests" onClick={() => setIsMobileMenuOpen(false)} className="block text-lg font-medium text-gray-800 dark:text-gray-200">
                依頼一覧
              </Link>
              <Link href="/services" onClick={() => setIsMobileMenuOpen(false)} className="block text-lg font-medium text-gray-800 dark:text-gray-200">
                探す
              </Link>
            </div>

            <div className="space-y-4">
              <div className="font-semibold text-gray-400 text-xs uppercase tracking-wider">アカウント</div>
              {sessionUser ? (
                <>
                  <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block text-lg font-medium text-gray-800 dark:text-gray-200">
                    ダッシュボード
                  </Link>
                  <Link href="/messages" onClick={() => setIsMobileMenuOpen(false)} className="block text-lg font-medium text-gray-800 dark:text-gray-200">
                    メッセージ
                  </Link>
                  <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block text-lg font-medium text-gray-800 dark:text-gray-200">
                    プロフィール
                  </Link>
                  <Link href="/dashboard/negotiations" onClick={() => setIsMobileMenuOpen(false)} className="block text-lg font-medium text-gray-800 dark:text-gray-200">
                    値下げ交渉一覧
                  </Link>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      signOut()
                    }}
                    className="block w-full text-left text-lg font-medium text-red-600"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <Link href="/auth/signin" onClick={() => setIsMobileMenuOpen(false)} className="block text-lg font-medium text-blue-600">
                  サインイン
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
