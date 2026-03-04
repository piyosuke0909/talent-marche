'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface FavoriteButtonProps {
  serviceId: string
  initialIsFavorite?: boolean
  className?: string
  showText?: boolean
}

export default function FavoriteButton({ 
  serviceId, 
  initialIsFavorite = false, 
  className = "",
  showText = false
}: FavoriteButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [isLoading, setIsLoading] = useState(false)

  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Only fetch if session exists and we don't have an initial confirmation
    if (session && !initialIsFavorite) {
      fetch(`/api/favorites/${serviceId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data.isFavorite === 'boolean') {
            setIsFavorite(data.isFavorite)
          }
        })
        .catch(console.error)
    }
  }, [session, serviceId, initialIsFavorite])

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!session) {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname))
      return
    }

    if (isLoading) return

    // Optimistic UI Update & Animation Trigger
    const previousState = isFavorite
    setIsFavorite(!isFavorite)
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300) // Match animation duration
    
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
        setIsFavorite(result.isFavorite) // Sync with server truth
      } else {
        // Revert on failure
        setIsFavorite(previousState)
        const error = await response.json()
        console.error('Favorite toggle failed:', error.error)
      }
    } catch (error) {
       // Revert on failure
      setIsFavorite(previousState)
      console.error('Favorite toggle error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button 
      onClick={handleFavoriteToggle}
      disabled={isLoading}
      className={`relative inline-flex items-center justify-center p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 group transition-all duration-300 ${className}`}
      aria-label={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
    >
      <div className={`relative transition-transform duration-300 ${isAnimating ? 'scale-125' : 'scale-100 group-hover:scale-110'}`}>
        <Heart 
          className={`w-5 h-5 transition-colors duration-300 ${
            isFavorite 
              ? 'fill-red-500 text-red-500' 
              : 'text-gray-400 group-hover:text-red-400'
          }`} 
        />
        {/* Ping Animation Layer */}
        {isAnimating && isFavorite && (
          <Heart 
            className="absolute inset-0 w-5 h-5 fill-red-500 text-red-500 animate-ping opacity-75" 
          />
        )}
      </div>
      {showText && (
        <span className={`ml-2 text-sm font-medium transition-colors ${isFavorite ? 'text-red-500' : 'text-gray-600 dark:text-gray-400 group-hover:text-red-500 dark:group-hover:text-red-400'}`}>
          {isFavorite ? 'お気に入り登録済み' : 'お気に入りに追加'}
        </span>
      )}
    </button>
  )
}