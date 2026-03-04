
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, Camera, Save } from 'lucide-react'

interface UserProfile {
    name: string
    bio: string
    image: string | null
    location: string
    skills: string[]
}

export default function ProfileSettingsPage() {
    const router = useRouter()
    const { update } = useSession()
    const [profile, setProfile] = useState<UserProfile>({
        name: '',
        bio: '',
        image: null,
        location: '',
        skills: [],
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch('/api/auth/session')
                const session = await response.json()

                if (!session?.user) {
                    router.push('/auth/signin')
                    return
                }

                const profileRes = await fetch('/api/user/profile')
                if (profileRes.ok) {
                    const data = await profileRes.json()
                    setProfile({
                        name: data.user.name || '',
                        bio: data.user.bio || '',
                        image: data.user.image || null,
                        location: data.user.location || '',
                        skills: data.user.skills || [],
                    })
                    setImagePreview(data.user.image)
                }
            } catch (error) {
                console.error('Failed to load profile', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchProfile()
    }, [router])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Check size first (before compression) to avoid huge processing
            if (file.size > 10 * 1024 * 1024) { // 10MB limit (relaxed since we compress)
                alert('画像サイズは10MB以下にしてください')
                return
            }

            setImageFile(file)
            // Preview
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage(null)

        try {
            let imageUrl = profile.image // Keep existing image by default

            if (imageFile) {
                const { compressImageToBase64 } = await import('@/lib/image')
                // Compress to Base64
                // Use slightly higher quality for avatars usually, but 0.6 is fine
                imageUrl = await compressImageToBase64(imageFile, 400, 0.7)
            }

            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...profile,
                    image: imageUrl
                }),
            })

            if (!response.ok) throw new Error('更新に失敗しました')

            // Trigger session update to refresh header icon
            await update()

            setMessage({ type: 'success', text: 'プロフィールを更新しました' })
            router.refresh()
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: 'エラーが発生しました' })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
            <h1 className="mb-8 text-3xl font-bold text-gray-900">プロフィール設定</h1>

            <div className="mb-6 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div>
                    <h2 className="text-sm font-bold text-blue-900">本人確認</h2>
                    <p className="text-xs text-blue-700 mt-1">
                        本人確認を完了すると、プロフィールに「本人確認済」バッジが表示され、信頼性が向上します。
                    </p>
                </div>
                <Link
                    href="/settings/identity-verification"
                    className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                >
                    確認書類を提出
                </Link>
            </div>

            {message && (
                <div className={`mb-6 rounded-lg p-4 text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl bg-white p-8 shadow-sm border border-gray-100">

                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                        <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-lg bg-gray-100 relative">
                            {imagePreview ? (
                                <Image
                                    src={imagePreview}
                                    alt="Profile"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-400">
                                    <Camera className="h-12 w-12" />
                                </div>
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-blue-600 p-2 text-white shadow-md hover:bg-blue-700 transition-colors">
                            <Camera className="h-4 w-4" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </label>
                    </div>
                    <div className="flex flex-col items-center">
                        <p className="text-sm text-gray-500 mb-2">クリックしてアイコンを変更</p>
                        <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
                            画像を選択する
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </label>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">表示名</label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={e => setProfile({ ...profile, name: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="あなたの名前"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">自己紹介</label>
                        <textarea
                            value={profile.bio}
                            onChange={e => setProfile({ ...profile, bio: e.target.value })}
                            rows={4}
                            className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="経歴やスキルについて教えてください..."
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">場所 / 地域</label>
                        <input
                            type="text"
                            value={profile.location}
                            onChange={e => setProfile({ ...profile, location: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="例: 東京都"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">スキル (カンマ区切り)</label>
                        <input
                            type="text"
                            value={profile.skills.join(', ')}
                            onChange={e => setProfile({ ...profile, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                            className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="例: React, TypeScript, UI Design"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        変更を保存する
                    </button>
                </div>
            </form>
        </div>
    )
}
