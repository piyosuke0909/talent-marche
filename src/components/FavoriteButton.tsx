'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface FavoriteButtonProps {
  serviceId: string
  initialIsFavorite?: boolean
  className?: string
}

export default function FavoriteButton({ 
  serviceId, 
  initialIsFavorite = false, 
  className = "" 
}: FavoriteButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [isLoading, setIsLoading] = useState(false)

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serviceId }),
      })

      if (response.ok) {
        const result = await response.json()
        setIsFavorite(result.isFavorite)
        
        // 成功メッセージを表示（オプション）
        if (result.message) {
          // console.log(result.message)
        }
      } else {
        const error = await response.json()
        console.error('Favorite toggle failed:', error.error)
      }
    } catch (error) {
      console.error('Favorite toggle error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button 
      onClick={handleFavoriteToggle}
      disabled={isLoading}
      className={`text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50 ${className}`}
      aria-label={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
    >
      <Heart 
        className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''} ${
          isLoading ? 'animate-pulse' : ''
        }`} 
      />
    </button>
  )
}