'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { compressImageToBase64 } from '@/lib/image'

interface Category {
    id: string
    name: string
}

const skillOptions = [
    'JavaScript', 'Python', 'React', 'Node.js', 'PHP',
    'Java', 'HTML/CSS', 'Photoshop', 'Illustrator', 'Figma'
]

export default function EditRequestPage() {
    const router = useRouter()
    const { id } = useParams<{ id: string }>()

    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        title: '',
        categoryId: '',
        budget: '',
        description: '',
        skills: [] as string[],
        deadline: '',
        location: '',
        images: [] as string[],
    })
    const [titleCount, setTitleCount] = useState(0)
    const [descCount, setDescCount] = useState(0)

    useEffect(() => {
        const init = async () => {
            const [catRes, reqRes] = await Promise.all([
                fetch('/api/categories'),
                fetch(`/api/requests/${id}`),
            ])

            if (!reqRes.ok) {
                setError('依頼が見つかりません')
                setIsLoading(false)
                return
            }

            const [cats, req] = await Promise.all([catRes.json(), reqRes.json()])
            setCategories(cats)

            const deadlineStr = req.deadline
                ? new Date(req.deadline).toISOString().slice(0, 10)
                : ''

            setFormData({
                title: req.title ?? '',
                categoryId: req.category?.id ?? '',
                budget: req.budget != null ? String(req.budget) : '',
                description: req.description ?? '',
                skills: req.skills ?? [],
                deadline: deadlineStr,
                location: req.location ?? '',
                images: req.images ?? [],
            })
            setTitleCount((req.title ?? '').length)
            setDescCount((req.description ?? '').length)
            setIsLoading(false)
        }

        init().catch(() => {
            setError('データの読み込みに失敗しました')
            setIsLoading(false)
        })
    }, [id])

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        if (value.length <= 20) {
            setFormData(f => ({ ...f, title: value }))
            setTitleCount(value.length)
        }
    }

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        if (value.length <= 800) {
            setFormData(f => ({ ...f, description: value }))
            setDescCount(value.length)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        if (formData.images.length + files.length > 5) {
            alert('画像は最大5枚までです')
            return
        }
        try {
            const newImages = [...formData.images]
            for (let i = 0; i < files.length; i++) {
                newImages.push(await compressImageToBase64(files[i]))
            }
            setFormData(f => ({ ...f, images: newImages }))
        } catch {
            alert('画像のアップロードに失敗しました')
        }
    }

    const removeImage = (index: number) => {
        setFormData(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    budget: formData.budget ? parseInt(formData.budget) : null,
                    deadline: formData.deadline ? new Date(formData.deadline) : null,
                }),
            })
            if (!res.ok) throw new Error()
            router.push('/dashboard/requests')
        } catch {
            alert('更新に失敗しました')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) return (
        <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    )

    if (error) return (
        <div className="flex justify-center py-20 text-red-600">{error}</div>
    )

    return (
        <div className="bg-gray-100 min-h-screen">
            <main className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">依頼の編集</h1>
                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleSubmit}>
                        {/* タイトル */}
                        <div className="bg-white p-6 rounded-lg shadow-md mb-5">
                            <div className="flex items-center mb-4">
                                <label className="font-bold mr-2">依頼タイトル</label>
                                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">必須</span>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={handleTitleChange}
                                    placeholder="依頼タイトルを記入してください"
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <span className={`absolute right-4 top-3 text-sm ${titleCount >= 20 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                                    {titleCount}/20
                                </span>
                            </div>
                        </div>

                        {/* カテゴリ・予算 */}
                        <div className="flex gap-5 mb-5">
                            <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                                <div className="flex items-center mb-4">
                                    <label className="font-bold mr-2">カテゴリ</label>
                                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">必須</span>
                                </div>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData(f => ({ ...f, categoryId: e.target.value }))}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">選択してください</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                                <div className="flex items-center mb-4">
                                    <label className="font-bold mr-2">予算</label>
                                    <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded">任意</span>
                                </div>
                                <input
                                    type="number"
                                    value={formData.budget}
                                    onChange={(e) => setFormData(f => ({ ...f, budget: e.target.value }))}
                                    placeholder="予算を記入してください"
                                    min="1"
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* 依頼概要 */}
                        <div className="bg-white p-6 rounded-lg shadow-md mb-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                    <label className="font-bold mr-2">依頼概要</label>
                                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">必須</span>
                                </div>
                                <span className={`text-sm ${descCount >= 800 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                                    {descCount}/800
                                </span>
                            </div>
                            <textarea
                                value={formData.description}
                                onChange={handleDescriptionChange}
                                placeholder="依頼概要を記入してください"
                                rows={8}
                                className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {/* 要求スキル */}
                        <div className="bg-white p-6 rounded-lg shadow-md mb-5">
                            <div className="flex items-center mb-4">
                                <label className="font-bold mr-2">要求スキル</label>
                                <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded">任意</span>
                            </div>
                            <select
                                onChange={(e) => {
                                    const skill = e.target.value
                                    if (skill && !formData.skills.includes(skill)) {
                                        setFormData(f => ({ ...f, skills: [...f.skills, skill] }))
                                    }
                                }}
                                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">スキルを選択してください</option>
                                {skillOptions.map((skill) => (
                                    <option key={skill} value={skill}>{skill}</option>
                                ))}
                            </select>
                            {formData.skills.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {formData.skills.map((skill, index) => (
                                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center">
                                            {skill}
                                            <button
                                                type="button"
                                                onClick={() => setFormData(f => ({ ...f, skills: f.skills.filter((_, i) => i !== index) }))}
                                                className="ml-2 text-red-500 hover:text-red-700"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 納品希望日・掲載期間 */}
                        <div className="flex gap-5 mb-5">
                            <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                                <div className="flex items-center mb-4">
                                    <label className="font-bold mr-2">納品希望日</label>
                                    <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded">任意</span>
                                </div>
                                <input
                                    type="date"
                                    value={formData.deadline}
                                    onChange={(e) => setFormData(f => ({ ...f, deadline: e.target.value }))}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                                <div className="flex items-center mb-4">
                                    <label className="font-bold mr-2">募集 / 掲載期間</label>
                                    <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded">任意</span>
                                </div>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData(f => ({ ...f, location: e.target.value }))}
                                    placeholder="期間を記入してください"
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* 参考画像 */}
                        <div className="bg-white p-6 rounded-lg shadow-md mb-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                    <label className="font-bold mr-2">参考画像</label>
                                    <span className="text-xs text-gray-500 ml-2">※最大5枚まで</span>
                                </div>
                                <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded">任意</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                                {formData.images.map((image, index) => (
                                    <div key={index} className="relative aspect-square">
                                        <img
                                            src={image}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-full object-cover rounded-lg border border-gray-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                {formData.images.length < 5 && (
                                    <label className="border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 flex flex-col items-center justify-center aspect-square transition-colors">
                                        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                                        <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span className="text-xs text-gray-500">追加</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* ボタン */}
                        <div className="flex gap-4 mb-16">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="flex-1 p-4 border border-gray-300 text-gray-700 text-lg font-bold rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 p-4 bg-black text-white text-lg font-bold rounded-lg shadow-md hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                更新する
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}
