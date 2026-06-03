// 依頼API: 依頼一覧取得（GET）・依頼作成（POST）処理

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ソートオプションの定義
const SORT_OPTIONS = ['recent', 'budget_high', 'budget_low', 'deadline'] as const
type RequestSort = typeof SORT_OPTIONS[number]

// ソートオプションを Prisma の orderBy 形式に変換する処理
function buildRequestOrder(sortBy: RequestSort): Prisma.RequestOrderByWithRelationInput[] {
  switch (sortBy) {
    case 'budget_high': return [{ budget: 'desc' }, { createdAt: 'desc' }]  // 予算の高い順
    case 'budget_low':  return [{ budget: 'asc' },  { createdAt: 'desc' }]  // 予算の低い順
    case 'deadline':    return [{ deadline: 'asc' }, { createdAt: 'desc' }]  // 締め切りの早い順
    default:            return [{ createdAt: 'desc' }]                        // 新着順
  }
}

// 依頼作成処理: 新しい仕事依頼を投稿する
export async function POST(request: NextRequest) {
  try {
    // 認証チェック処理
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, budget, categoryId, skills, deadline, location, images } = body

    // 必須項目バリデーション処理
    if (!title || !description || !budget || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 予算の数値バリデーション処理
    const normalizedBudget = Number(budget)
    if (!Number.isFinite(normalizedBudget) || normalizedBudget <= 0) {
      return NextResponse.json({ error: 'Budget must be a positive number' }, { status: 400 })
    }

    // スキル配列のサニタイズ処理（空文字・非文字列を除去）
    const sanitizedSkills = Array.isArray(skills)
      ? (skills as unknown[])
        .filter((skill): skill is string => typeof skill === 'string' && skill.trim().length > 0)
        .map((skill) => skill.trim())
      : []

    // 依頼レコード作成処理
    const requestData = await prisma.request.create({
      data: {
        title,
        description,
        budget: Math.round(normalizedBudget),
        categoryId,
        skills: sanitizedSkills,
        images: Array.isArray(images) ? images : [],
        deadline: deadline ? new Date(deadline) : null,
        location: location || null,
        userId: session.user.id,
      },
    })

    return NextResponse.json(requestData, { status: 201 })
  } catch (error) {
    console.error('Request creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 依頼一覧取得処理: 検索・カテゴリー・予算・スキルフィルター + ページネーション対応
export async function GET(request: NextRequest) {
  try {
    // ページネーションパラメータ取得処理
    const { searchParams } = new URL(request.url)
    const page  = Math.max(1, Number.parseInt(searchParams.get('page')  || '1',  10))
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '12', 10) || 12, 50)
    const skip  = (page - 1) * limit

    // フィルターパラメータ取得処理
    const search    = searchParams.get('search')
    const category  = searchParams.get('category')
    const minBudget = searchParams.get('minBudget')
    const maxBudget = searchParams.get('maxBudget')
    const skills    = searchParams.get('skills')
    const sortParam = (searchParams.get('sortBy') || 'recent').toLowerCase()

    // ソートオプション正規化処理（未定義値は 'recent' にフォールバック）
    const sortBy: RequestSort = SORT_OPTIONS.includes(sortParam as RequestSort)
      ? (sortParam as RequestSort)
      : 'recent'

    // フィルター条件の組み立て処理（公開中の依頼のみ）
    const where: Prisma.RequestWhereInput = { isActive: true }

    // キーワード検索処理（タイトル・説明文の部分一致）
    if (search) {
      where.OR = [
        { title:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // カテゴリーフィルター処理
    if (category) {
      where.category = { slug: category }
    }

    // 予算範囲フィルター処理
    if (minBudget || maxBudget) {
      where.budget = {}
      if (minBudget && !Number.isNaN(Number(minBudget))) where.budget.gte = Number(minBudget)
      if (maxBudget && !Number.isNaN(Number(maxBudget))) where.budget.lte = Number(maxBudget)
    }

    // スキルフィルター処理（カンマ区切りで複数指定可能）
    if (skills) {
      const skillArray = skills.split(',').map((skill) => skill.trim()).filter(Boolean)
      if (skillArray.length > 0) {
        where.skills = { hasSome: skillArray }
      }
    }

    // 依頼一覧・総件数の並列取得処理
    const orderBy = buildRequestOrder(sortBy)
    const [requests, totalCount] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          user:     { select: { id: true, name: true, image: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count:   { select: { proposals: true } }, // 提案数も取得
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.request.count({ where })
    ])

    // レスポンスデータ整形処理
    const payload = {
      requests: requests.map((req) => ({
        id:            req.id,
        title:         req.title,
        description:   req.description,
        budget:        req.budget,
        skills:        req.skills,
        images:        req.images,
        deadline:      req.deadline?.toISOString() ?? null,
        location:      req.location,
        createdAt:     req.createdAt.toISOString(),
        proposalCount: req._count.proposals,
        user:          req.user,
        category:      req.category,
      })),
      totalCount,
      totalPages:  Math.max(1, Math.ceil(totalCount / limit)),
      currentPage: page,
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Requests fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
