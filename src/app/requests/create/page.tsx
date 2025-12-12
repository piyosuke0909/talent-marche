'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateRequestPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    budget: '',
    description: '',
    skills: [] as string[],
    deadline: '',
    location: ''
  })
  const [titleCount, setTitleCount] = useState(0)

  interface Category {
    id: string
    name: string
  }

  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error('Failed to fetch categories', err))
  }, [])

  const skillOptions = [
    'JavaScript', 'Python', 'React', 'Node.js', 'PHP',
    'Java', 'HTML/CSS', 'Photoshop', 'Illustrator', 'Figma'
  ]

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length <= 80) {
      setFormData({ ...formData, title: value })
      setTitleCount(value.length)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          budget: formData.budget ? parseInt(formData.budget) : null,
          deadline: formData.deadline ? new Date(formData.deadline) : null
        }),
      })

      if (response.ok) {
        router.push('/')
      } else {
        console.error('依頼の作成に失敗しました')
      }
    } catch (error) {
      console.error('エラーが発生しました:', error)
    }
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">依頼の詳細</h1>
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>
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
                <span className="absolute right-4 top-3 text-sm text-gray-500">
                  {titleCount}/80
                </span>
              </div>
            </div>

            <div className="flex gap-5 mb-5">
              <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <label className="font-bold mr-2">カテゴリを選択</label>
                  <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">必須</span>
                </div>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">カテゴリを選択してください</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <label className="font-bold mr-2">予算</label>
                  <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">必須</span>
                </div>
                <input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="予算を記入してください"
                  min="1"
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-5">
              <div className="flex items-center mb-4">
                <label className="font-bold mr-2">依頼概要</label>
                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">必須</span>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="依頼概要を記入してください"
                rows={8}
                className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-5">
              <div className="flex items-center mb-4">
                <label className="font-bold mr-2">要求スキル</label>
                <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded">任意</span>
              </div>
              <select
                onChange={(e) => {
                  const skill = e.target.value
                  if (skill && !formData.skills.includes(skill)) {
                    setFormData({
                      ...formData,
                      skills: [...formData.skills, skill]
                    })
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">スキルを選択してください</option>
                {skillOptions.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
              {formData.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => {
                          const newSkills = formData.skills.filter((_, i) => i !== index)
                          setFormData({ ...formData, skills: newSkills })
                        }}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-5 mb-5">
              <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <label className="font-bold mr-2">納品希望日</label>
                  <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded">任意</span>
                </div>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="期間を記入してください"
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-5">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
                  <span className="text-gray-600">＋ ファイルをアップロード</span>
                </div>
                <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded ml-5">任意</span>
              </div>
            </div>

            <div className="text-center my-16">
              <button
                type="submit"
                className="w-full p-5 bg-black text-white text-xl font-bold rounded-lg shadow-md hover:bg-gray-800 transition-colors"
              >
                確認画面に進む
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="text-right max-w-6xl mx-auto px-4 pb-5">
        <div className="flex items-center justify-end gap-2">
          <input type="checkbox" className="mr-1" />
          <a href="#" className="text-blue-500">規約に同意して依頼してください</a>
          <a href="#" className="text-blue-500 ml-2">ヘルプはこちら≫</a>
        </div>
      </footer>
    </div>
  )
}