'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { Search, Menu, X, ChevronDown, User, Settings, LogOut } from 'lucide-react'

export default function Header() {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const sessionUser =
    session?.user && typeof session.user === 'object'
      ? (session.user as { name?: string | null; email?: string | null; image?: string | null })
      : null

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <Link href="/" className="text-2xl font-bold hover:underline">
            Talent Marche
          </Link>
          <div className="relative w-full max-w-xs md:max-w-md lg:max-w-lg">
            <input
              type="text"
              placeholder="サービスを探す"
              className="pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/services/create" className="text-gray-600 hover:text-gray-900">
            出品する
          </Link>
          <Link href="/requests/create" className="text-gray-600 hover:text-gray-900">
            依頼する
          </Link>
          <Link href="/messages" className="text-gray-600 hover:text-gray-900">
            メッセージ
          </Link>
          
          {status === 'loading' ? (
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
          ) : sessionUser ? (
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
            <Link href="/categories" className="text-gray-600 hover:text-gray-900 font-medium">
              カテゴリー
            </Link>
            <Link href="/favorites" className="text-gray-600 hover:text-gray-900">
              お気に入りから探す
            </Link>
            <Link href="/requests" className="text-gray-600 hover:text-gray-900">
              依頼をする
            </Link>
            <Link href="/services" className="text-gray-600 hover:text-gray-900">
              コンテンツを探す
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <nav className="container mx-auto px-4 py-4 space-y-4">
            <Link href="/services/create" className="block text-gray-600 hover:text-gray-900">
              出品する
            </Link>
            <Link href="/requests/create" className="block text-gray-600 hover:text-gray-900">
              依頼する
            </Link>
            <Link href="/messages" className="block text-gray-600 hover:text-gray-900">
              メッセージ
            </Link>
            {sessionUser ? (
              <>
                <Link href="/dashboard" className="block text-gray-600 hover:text-gray-900">
                  ダッシュボード
                </Link>
                <button
                  onClick={() => signOut()}
                  className="block w-full text-left text-red-600 hover:text-red-700"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <Link href="/auth/signin" className="block text-blue-600 hover:text-blue-700">
                サインイン
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
