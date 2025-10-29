import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerAuthSession } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, description, budget, categoryId, skills, deadline, location } = body

    if (!title || !description || !budget || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const requestData = await prisma.request.create({
      data: {
        title,
        description,
        budget: parseInt(budget),
        categoryId,
        skills: skills || [],
        deadline: deadline ? new Date(deadline) : null,
        location: location || null,
        userId: user.id
      }
    })

    return NextResponse.json(requestData, { status: 201 })
  } catch (error) {
    console.error('Request creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const requests = await prisma.request.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { 
            id: true, 
            name: true, 
            image: true 
          }
        },
        category: true,
        _count: {
          select: { proposals: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Requests fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
