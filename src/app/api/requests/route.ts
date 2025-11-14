import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

const SORT_OPTIONS = ['recent', 'budget_high', 'budget_low', 'deadline'] as const
type RequestSort = typeof SORT_OPTIONS[number]

function buildRequestOrder(sortBy: RequestSort) {
  switch (sortBy) {
    case 'budget_high':
      return [{ budget: 'desc' }, { createdAt: 'desc' }] as const
    case 'budget_low':
      return [{ budget: 'asc' }, { createdAt: 'desc' }] as const
    case 'deadline':
      return [{ deadline: 'asc' }, { createdAt: 'desc' }] as const
    default:
      return [{ createdAt: 'desc' }] as const
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, budget, categoryId, skills, deadline, location } = body

    if (!title || !description || !budget || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalizedBudget = Number(budget)
    if (!Number.isFinite(normalizedBudget) || normalizedBudget <= 0) {
      return NextResponse.json({ error: 'Budget must be a positive number' }, { status: 400 })
    }

    const sanitizedSkills = Array.isArray(skills)
      ? (skills as unknown[])
          .filter((skill): skill is string => typeof skill === 'string' && skill.trim().length > 0)
          .map((skill) => skill.trim())
      : []

    const requestData = await prisma.request.create({
      data: {
        title,
        description,
        budget: Math.round(normalizedBudget),
        categoryId,
        skills: sanitizedSkills,
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(Number.parseInt(searchParams.get('limit') || '12', 10) || 12, 50)
    const skip = (page - 1) * limit

    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const minBudget = searchParams.get('minBudget')
    const maxBudget = searchParams.get('maxBudget')
    const skills = searchParams.get('skills')
    const sortParam = (searchParams.get('sortBy') || 'recent').toLowerCase()

    const sortBy: RequestSort = SORT_OPTIONS.includes(sortParam as RequestSort)
      ? (sortParam as RequestSort)
      : 'recent'

    const where: Prisma.RequestWhereInput = {
      isActive: true,
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (category) {
      where.category = {
        slug: category,
      }
    }

    if (minBudget || maxBudget) {
      where.budget = {}
      if (minBudget && !Number.isNaN(Number(minBudget))) {
        where.budget.gte = Number(minBudget)
      }
      if (maxBudget && !Number.isNaN(Number(maxBudget))) {
        where.budget.lte = Number(maxBudget)
      }
    }

    if (skills) {
      const skillArray = skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean)

      if (skillArray.length > 0) {
        where.skills = {
          hasSome: skillArray,
        }
      }
    }

    const orderBy = buildRequestOrder(sortBy)

    const [requests, totalCount] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: { proposals: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.request.count({ where }),
    ])

    const payload = {
      requests: requests.map((req) => ({
        id: req.id,
        title: req.title,
        description: req.description,
        budget: req.budget,
        skills: req.skills,
        deadline: req.deadline?.toISOString() ?? null,
        location: req.location,
        createdAt: req.createdAt.toISOString(),
        proposalCount: req._count.proposals,
        user: req.user,
        category: req.category,
      })),
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      currentPage: page,
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Requests fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
