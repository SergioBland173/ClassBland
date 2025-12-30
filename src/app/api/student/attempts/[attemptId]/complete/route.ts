import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

interface Props {
  params: Promise<{ attemptId: string }>
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { attemptId } = await params
    const session = await getSession()
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify attempt belongs to user
    const attempt = await db.attempt.findFirst({
      where: {
        id: attemptId,
        userId: session.userId,
      },
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.completedAt) {
      return NextResponse.json({ attempt })
    }

    // Mark as completed
    const completed = await db.attempt.update({
      where: { id: attemptId },
      data: {
        completedAt: new Date(),
      },
    })

    return NextResponse.json({ attempt: completed })
  } catch (error) {
    console.error('Complete attempt error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
